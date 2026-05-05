const express = require('express');
const multer = require('multer');
const path = require('path');
const { AIDocument, AIQuiz, AIQuestion, QuizAttempt, QuizAnswer, QuizResult, Training, User } = require('../models');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');
const aiService = require('../services/aiService');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

const router = express.Router();

  // Absolute path for uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads', 'ai-docs');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      cb(null, unique);
    }
  });

  // STRICT image detection - check magic bytes
  const isImageFile = (buffer) => {
    if (!buffer || buffer.length < 4) return false;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
    // BMP: 42 4D
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
    // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    if (buffer.length >= 12 && buffer.slice(0,4).toString() === 'RIFF' && buffer.slice(8,12).toString() === 'WEBP') return true;
    return false;
  };

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      // Check MIME type first
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const isImageMime = file.mimetype?.startsWith('image/');
      
      if (isImageMime) {
        return cb(new Error('Images are not supported. Please upload PDF, DOCX, or TXT files only.'));
      }
      
      if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  const extractText = async (filePath, mimeType) => {
    // Ensure the file path is absolute
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }

    if (mimeType === 'text/plain' || absPath.endsWith('.txt')) {
      return fs.readFileSync(absPath, 'utf8');
    }
    if (mimeType === 'application/pdf' || absPath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(absPath);
      try {
        const data = await pdf(dataBuffer);
        return data.text || '';
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr.message);
        throw new Error('Failed to parse PDF: ' + pdfErr.message);
      }
    }
    if (mimeType.includes('wordprocessingml') || absPath.endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ path: absPath });
        return result.value || '';
      } catch (docxErr) {
        console.error('DOCX parse error:', docxErr.message);
        throw new Error('Failed to parse DOCX: ' + docxErr.message);
      }
    }
    throw new Error('Unsupported file type: ' + mimeType);
  };

  // POST /api/ai-quiz/trainer/upload-document
  router.post('/trainer/upload-document',
    authenticateToken,
    roleMiddleware('TRAINER'),
    upload.single('file'),
    async (req, res) => {
      try {
        const { trainingId, numQuestions = 10, difficulty = 'MIXED' } = req.body;
        const trainerId = req.user.id;

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.resolve(req.file.path);  // Get absolute path
        const fileType = req.file.mimetype;
        const originalName = req.file.originalname;

        // STRICT validation: Read first bytes to detect image signatures
        try {
          const fileBuffer = fs.readFileSync(filePath);
          
          // Check for image file signatures (magic bytes)
          if (isImageFile(fileBuffer)) {
            // Clean up the uploaded file
            try { fs.unlinkSync(filePath); } catch(e) {}
            return res.status(415).json({ 
              error: 'Images are not supported. Please upload PDF, DOCX, or TXT files only.',
              details: 'The AI model (google/flan-t5-base) does not support image input.'
            });
          }
        } catch (readErr) {
          console.warn('Could not read file for image detection:', readErr.message);
        }

      let content = '';
      try {
        // Ensure we pass absolute path to extractText
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        content = await extractText(absPath, fileType);
      } catch (err) {
        // Clean up file on error
        try { fs.unlinkSync(filePath); } catch(e) {}
        return res.status(400).json({ error: 'Failed to extract text from file: ' + err.message });
      }

      if (!content || content.trim().length < 50) {
        return res.status(400).json({ error: 'Document content too short or empty' });
      }

      const document = await AIDocument.create({
        trainerId,
        trainingId: trainingId || null,
        title: req.file.originalname,
        content: content.substring(0, 50000),
        fileUrl: `/uploads/ai-docs/${req.file.filename}`,
        fileType: fileType,
        status: 'PROCESSING'
      });

      const quiz = await AIQuiz.create({
        documentId: document.id,
        trainerId,
        trainingId: trainingId || null,
        title: `Quiz: ${req.file.originalname}`,
        numQuestions: parseInt(numQuestions),
        difficulty,
        status: 'DRAFT'
      });

      try {
        // Clean content - aggressively remove any image references that might confuse the AI
        let cleanContent = content.substring(0, 15000);
        // Remove image filename patterns (image.png, fig1.jpg, etc.)
        cleanContent = cleanContent.replace(/\b(image|img|fig|figure)\d*\.(png|jpg|jpeg|gif|bmp|webp|svg)\b/gi, '[IMAGE]');
        cleanContent = cleanContent.replace(/\b(image|img|fig|figure)\s*\d+\.(png|jpg|jpeg|gif|bmp|webp|svg)\b/gi, '[IMAGE]');
        // Remove markdown/image tags
        cleanContent = cleanContent.replace(/!\[.*?\]\(.*?\)/g, '[IMAGE]');
        cleanContent = cleanContent.replace(/\[image:?\s*[^\]]*\]/gi, '[IMAGE] ');
        // Remove "Figure X:" or "Fig. X:" patterns
        cleanContent = cleanContent.replace(/\b(figure|fig)\.?\s*\d+[:\-–—]\s*/gi, '[IMAGE] ');
        // Remove any remaining file path references to images
        cleanContent = cleanContent.replace(/[C-Z]:\\.*\.(png|jpg|jpeg|gif|bmp|webp|svg)/gi, '[IMAGE]');
        cleanContent = cleanContent.replace(/(\/|\\)[^\s]+\.(png|jpg|jpeg|gif|bmp|webp|svg)/gi, '[IMAGE]');
        
        console.log('[aiQuizRoutes] Sending', cleanContent.length, 'chars to AI service');
        const result = await aiService.generateQuizFromText(cleanContent, parseInt(numQuestions), difficulty);
        
        const questions = result.questions || [];
        const quizTitle = result.title || `Quiz: ${req.file.originalname}`;
        
        // Update quiz title
        await quiz.update({ title: quizTitle });
        
        console.log(`[aiQuizRoutes] Saving ${questions.length} questions for quiz #${quiz.id}...`);
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const saved = await AIQuestion.create({
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: q.questionType || 'MCQ',
            options: q.options || null,
            correctAnswer: String(q.correctAnswer),
            explanation: q.explanation || '',
            difficulty: q.difficulty || difficulty || 'MEDIUM',
            order: i
          });
          console.log(`  ✅ Saved Q${i + 1} (id=${saved.id}) quiz_id=${saved.quizId}: "${q.questionText?.substring(0, 60)}..."`);
        }
        console.log(`[aiQuizRoutes] ✅ All ${questions.length} questions saved for quiz #${quiz.id}`);
        await document.update({ status: 'READY' });
        await quiz.reload({ include: [{ model: AIQuestion, as: 'questions' }] });
        console.log(`[aiQuizRoutes] Quiz reloaded — questions count: ${quiz.questions?.length ?? 0}`);
        
        res.status(201).json({ 
          message: `Quiz "${quizTitle}" generated successfully`, 
          quiz 
        });
      } catch (err) {
        await document.update({ status: 'ERROR' });
        res.status(500).json({ error: 'AI generation failed: ' + err.message });
      }
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/ai-quiz/trainer/quizzes
router.get('/trainer/quizzes',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const quizzes = await AIQuiz.findAll({
        where: { trainerId: req.user.id },
        include: [
          { model: AIQuestion, as: 'questions' },
          { model: AIDocument, as: 'document' },
          { model: Training, as: 'training', attributes: ['id', 'title'] }
        ],
        order: [['created_at', 'DESC']]
      });
      res.json({ quizzes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/ai-quiz/trainer/quiz/:id
router.put('/trainer/quiz/:id',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const quiz = await AIQuiz.findOne({
        where: { id: req.params.id, trainerId: req.user.id }
      });
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

      const { title, timeLimit, status } = req.body;
      const update = {};
      if (title) update.title = title;
      if (timeLimit) update.timeLimit = parseInt(timeLimit);
      if (status && ['DRAFT', 'PUBLISHED', 'CLOSED'].includes(status)) update.status = status;

      await quiz.update(update);
      res.json({ message: 'Quiz updated', quiz });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/ai-quiz/participant/start/:quizId
router.post('/participant/start/:quizId',
  authenticateToken,
  roleMiddleware('PARTICIPANT'),
  async (req, res) => {
    try {
      const quiz = await AIQuiz.findOne({
        where: { id: req.params.quizId, status: 'PUBLISHED' },
        include: [{ model: AIQuestion, as: 'questions' }]
      });

      if (!quiz) return res.status(404).json({ error: 'Quiz not found or not available' });

      console.log(`[participant/start] Quiz #${quiz.id} "${quiz.title}" has ${quiz.questions?.length ?? 0} questions`);

      if (!quiz.questions || quiz.questions.length === 0) {
        return res.status(422).json({ error: 'This quiz has no questions yet. Please contact your trainer.' });
      }

      const existing = await QuizAttempt.findOne({
        where: { quizId: quiz.id, participantId: req.user.id, status: 'IN_PROGRESS' }
      });
      if (existing) {
        console.log(`[participant/start] Resuming existing attempt #${existing.id}`);
        return res.json({ attemptId: existing.id, quiz });
      }

      const attempt = await QuizAttempt.create({
        quizId: quiz.id,
        participantId: req.user.id,
        status: 'IN_PROGRESS'
      });

      console.log(`[participant/start] Created attempt #${attempt.id} for quiz #${quiz.id}`);
      res.status(201).json({ attemptId: attempt.id, quiz });
    } catch (error) {
      console.error('[participant/start] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/ai-quiz/participant/submit/:attemptId
router.post('/participant/submit/:attemptId',
  authenticateToken,
  roleMiddleware('PARTICIPANT'),
  async (req, res) => {
    try {
      const { answers } = req.body;
      const attempt = await QuizAttempt.findOne({
        where: { id: req.params.attemptId, participantId: req.user.id }
      });
      if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

      const quiz = await AIQuiz.findByPk(attempt.quizId, {
        include: [{ model: AIQuestion, as: 'questions' }]
      });

      let totalScore = 0;
      const questionsMap = {};
      quiz.questions.forEach(q => { questionsMap[q.id] = q; });

      for (const ans of answers) {
        const question = questionsMap[ans.questionId];
        if (!question) continue;

        let score = 0;
        let feedback = '';
        let isCorrect = false;

        if (question.questionType === 'MCQ') {
          isCorrect = String(question.correctAnswer) === String(ans.selectedOption);
          score = isCorrect ? 100 : 0;
          feedback = isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${question.correctAnswer}`;
        } else {
          const evaluation = await aiService.evaluateShortAnswer(
            question.questionText,
            question.correctAnswer,
            ans.answerText || ''
          );
          score = evaluation.score || 0;
          feedback = evaluation.feedback || '';
          isCorrect = evaluation.isCorrect || false;
        }

        await QuizAnswer.create({
          attemptId: attempt.id,
          questionId: ans.questionId,
          answerText: ans.answerText || '',
          selectedOption: ans.selectedOption !== undefined ? ans.selectedOption : null,
          isCorrect,
          score,
          feedback,
          evaluatedByAI: true
        });

        totalScore += score;
      }

      const maxScore = quiz.questions.length * 100;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      await attempt.update({ status: 'EVALUATED', submittedAt: new Date() });

      const result = await QuizResult.create({
        attemptId: attempt.id,
        quizId: quiz.id,
        participantId: req.user.id,
        totalScore,
        maxScore,
        percentage,
        evaluatedAt: new Date()
      });

      res.json({ message: 'Quiz submitted successfully', result });
    } catch (error) {
      console.error('Submit error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/ai-quiz/leaderboard/:quizId
router.get('/leaderboard/:quizId',
  authenticateToken,
  async (req, res) => {
    try {
      const results = await QuizResult.findAll({
        where: { quizId: req.params.quizId },
        include: [
          { model: User, as: 'participant', attributes: ['id', 'name'] }
        ],
        order: [['percentage', 'DESC']]
      });

      const leaderboard = results.map((r, idx) => ({
        rank: idx + 1,
        userId: r.participantId,
        name: r.participant?.name || 'Unknown',
        score: parseFloat(r.percentage),
        totalScore: parseFloat(r.totalScore),
        maxScore: parseFloat(r.maxScore)
      }));

      res.json({ leaderboard: leaderboard.slice(0, 50) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/ai-quiz/participant/quizzes
router.get('/participant/quizzes',
  authenticateToken,
  roleMiddleware('PARTICIPANT'),
  async (req, res) => {
    try {
      const { Op } = require('sequelize');
      const { Enrollment } = require('../models');

      const enrollments = await Enrollment.findAll({
        where: { participantId: req.user.id }
      });
      const trainingIds = enrollments.map(e => e.trainingId);

      console.log(`[participant/quizzes] participantId=${req.user.id}, enrolledTrainings=[${trainingIds.join(',')}]`);

      // Include quizzes linked to enrolled trainings OR quizzes with no training assigned
      const whereClause = {
        status: 'PUBLISHED',
        [Op.or]: [
          ...(trainingIds.length > 0 ? [{ trainingId: trainingIds }] : []),
          { trainingId: null }
        ]
      };

      const quizzes = await AIQuiz.findAll({
        where: whereClause,
        include: [
          // CRITICAL: include questions so participants can see the count and take the quiz
          { model: AIQuestion, as: 'questions', attributes: ['id', 'questionText', 'questionType', 'options', 'correctAnswer', 'explanation', 'difficulty', 'order'] },
          { model: Training, as: 'training', attributes: ['id', 'title'] }
        ],
        order: [['created_at', 'DESC']]
      });

      console.log(`[participant/quizzes] Found ${quizzes.length} PUBLISHED quizzes`);
      quizzes.forEach(q => {
        console.log(`  → Quiz #${q.id} "${q.title}" has ${q.questions?.length ?? 0} questions`);
      });

      res.json({ quizzes });
    } catch (error) {
      console.error('[participant/quizzes] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
