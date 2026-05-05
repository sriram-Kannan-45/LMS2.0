const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT = 90000; // 90 seconds for quiz generation
const MAX_RETRIES = 2;

/**
 * Check if the AI service is reachable.
 * @returns {Promise<{available: boolean, details: object}>}
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    return { available: true, details: response.data };
  } catch {
    return { available: false, details: null };
  }
}

const aiService = {
  checkHealth,

  async generateQuizFromText(content, numQuestions = 10, difficulty = 'MIXED') {
    // Clean content for better quiz generation
    let cleanContent = content.substring(0, 15000);
    
    // Remove email addresses
    cleanContent = cleanContent.replace(/[\w.-]+?@\w+\.\w{2,}\b/g, '[EMAIL]');
    // Remove URLs
    cleanContent = cleanContent.replace(/https?:\/\/\S+/g, '[URL]');
    // Remove special characters but keep sentence structure
    cleanContent = cleanContent.replace(/[|•■◆▪–—]+/g, ' ');
    // Fix broken sentences
    cleanContent = cleanContent.replace(/([a-z])\n([a-z])/g, '$1 $2');
    cleanContent = cleanContent.replace(/(\w)\n(\w)/g, '$1 $2');
    // Remove excessive newlines
    cleanContent = cleanContent.replace(/\n{2,}/g, '. ');
    // Clean up spaces
    cleanContent = cleanContent.replace(/  +/g, ' ');
    cleanContent = cleanContent.trim();
    
    if (!cleanContent || cleanContent.length < 50) {
      throw new Error('Document text is too short to generate a quiz. Minimum 50 characters required.');
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[aiService] Attempt ${attempt}/${MAX_RETRIES} — sending ${cleanContent.length} chars to AI service`);
        
        const response = await axios.post(`${AI_SERVICE_URL}/generate-quiz`, 
          { text: cleanContent, num_questions: numQuestions, difficulty: difficulty },
          { timeout: AI_TIMEOUT, headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.data || !response.data.questions) {
          throw new Error('Invalid response from AI service — no questions returned');
        }

        // Transform response format to match backend expectations
        const questions = response.data.questions.map((q, i) => {
          // Convert "A"/"B"/"C"/"D" to "0"/"1"/"2"/"3"
          let correctAnswer = q.correct_answer || q.correctAnswer || 'A';
          if (['A', 'B', 'C', 'D'].includes(correctAnswer)) {
            correctAnswer = (correctAnswer.charCodeAt(0) - 65).toString();
          }
          
          return {
            questionText: q.question || q.questionText || `Question ${i+1}`,
            questionType: 'MCQ',
            options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: correctAnswer,
            explanation: q.explanation || '',
            difficulty: difficulty,
            order: i
          };
        });

        console.log(`[aiService] ✅ Generated ${questions.length} questions successfully`);

        return { 
          questions,
          title: response.data.quiz_title || 'AI Generated Quiz'
        };
        
      } catch (error) {
        lastError = error;
        console.error(`[aiService] Attempt ${attempt} failed:`, error.message);

        // Don't retry on validation errors
        if (error.response && [400, 415, 422].includes(error.response.status)) {
          break;
        }

        // Wait before retrying
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    // Build a user-friendly error from the last failure
    if (lastError.response) {
      const detail = lastError.response.data?.detail || '';
      if (detail.includes('image') || detail.includes('not support')) {
        throw new Error('Images are not supported. Please upload PDF, DOCX, or TXT files only.');
      }
      if (lastError.response.status === 415) {
        throw new Error(`File type not supported: ${detail}`);
      }
      if (lastError.response.status === 422) {
        throw new Error(`Validation error: ${detail}`);
      }
      throw new Error(`AI service error (${lastError.response.status}): ${detail || lastError.response.statusText}`);
    } else if (lastError.code === 'ECONNREFUSED') {
      throw new Error('AI service is not running. Please start the Python AI service first.');
    } else if (lastError.code === 'ECONNABORTED' || lastError.message?.includes('timeout')) {
      throw new Error('AI service timed out. The document may be too complex — try a shorter document or fewer questions.');
    }
    throw new Error('Failed to generate quiz: ' + lastError.message);
  },

  async evaluateShortAnswer(question, modelAnswer, userAnswer) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/evaluate`, {
        questionText: question,
        modelAnswer: modelAnswer,
        userAnswer: userAnswer
      }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      return {
        score: response.data.score || 0,
        feedback: response.data.feedback || 'Answer evaluated',
        isCorrect: response.data.isCorrect || false
      };
    } catch (error) {
      console.error('[aiService] AI Evaluation Error:', error.message);
      // Fallback: simple keyword matching
      const userWords = new Set(userAnswer.toLowerCase().split(/\s+/));
      const modelWords = new Set(modelAnswer.toLowerCase().split(/\s+/));
      let matchCount = 0;
      userWords.forEach(w => { if (modelWords.has(w)) matchCount++; });
      const score = Math.min(100, (matchCount / Math.max(modelWords.size, 1)) * 100);
      
      return {
        score: score,
        feedback: score > 50 ? 'Good answer with relevant keywords' : 'Answer needs improvement — missing key concepts',
        isCorrect: score >= 60
      };
    }
  }
};

module.exports = aiService;
