# AI Quiz Generator Feature

## Overview
This feature allows trainers to upload training documents (PDF, DOCX, TXT) and automatically generate quizzes using AI. Participants can take these quizzes and get scored automatically, with a leaderboard showing top performers.

## Features
1. **Document Upload**: Trainers can upload PDF, DOCX, or TXT files
2. **AI Quiz Generation**: Automatically generates MCQs and short answer questions
3. **Quiz Management**: Trainers can edit, publish, and manage quizzes
4. **Quiz Taking**: Participants can take quizzes with timer and progress tracking
5. **AI Evaluation**: Automatic scoring for both MCQ and subjective answers
6. **Leaderboard**: Visual podium-style leaderboard with charts showing top 3 performers

## Setup Instructions

### Backend Setup
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure OpenAI API Key:
   - Get your API key from https://platform.openai.com/api-keys
   - Edit `backend/.env` and replace `OPENAI_API_KEY=your-openai-api-key-here` with your actual key
   - Make sure you have billing set up on your OpenAI account

3. Start the backend:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

## Usage

### For Trainers
1. Login and go to "AI Quiz Generator" tab
2. Upload a document (PDF, DOCX, or TXT)
3. Select number of questions and difficulty level
4. Click "Generate Quiz with AI"
5. Wait for AI to process and generate questions
6. Edit questions if needed
7. Publish the quiz when ready
8. View leaderboard to see top performers

### For Participants
1. Login and go to "AI Quizzes" tab
2. Browse available quizzes
3. Click "Start Quiz" to begin
4. Answer questions within the time limit
5. Submit the quiz to get your score
6. View leaderboard to see rankings

## API Endpoints

### Trainer Endpoints
- `POST /api/ai-quiz/trainer/upload-document` - Upload document and generate quiz
- `GET /api/ai-quiz/trainer/quizzes` - Get trainer's quizzes
- `PUT /api/ai-quiz/trainer/quiz/:id` - Update quiz settings

### Participant Endpoints
- `GET /api/ai-quiz/participant/quizzes` - Get available quizzes
- `POST /api/ai-quiz/participant/start/:quizId` - Start a quiz attempt
- `POST /api/ai-quiz/participant/submit/:attemptId` - Submit quiz answers

### Leaderboard
- `GET /api/ai-quiz/leaderboard/:quizId` - Get leaderboard data

## File Structure

### Backend
- `src/models/aiDocument.js` - Document storage model
- `src/models/aiQuiz.js` - Quiz model
- `src/models/aiQuestion.js` - Question model
- `src/models/quizAttempt.js` - Attempt tracking model
- `src/models/quizAnswer.js` - Answer storage model
- `src/models/quizResult.js` - Results model
- `src/services/aiService.js` - AI integration service
- `src/routes/aiQuizRoutes.js` - API routes

### Frontend
- `src/components/TrainerAIQuiz.jsx` - Trainer quiz generator UI
- `src/components/QuizTaking.jsx` - Quiz taking UI
- `src/components/Leaderboard.jsx` - Leaderboard with charts
- `src/pages/ParticipantQuizzes.jsx` - Participant quizzes page

## Technologies Used
- **Backend**: Node.js, Express, Sequelize, MySQL
- **Frontend**: React, Vite, Framer Motion, Recharts
- **AI**: OpenAI GPT-3.5 Turbo
- **File Processing**: pdf-parse, mammoth (for DOCX)

## Notes
- Only text-based files (PDF, DOCX, TXT) are supported - images are NOT supported
- The AI uses gpt-3.5-turbo model for cost efficiency
- Quiz generation may take 10-30 seconds depending on document size
- Make sure to set up OpenAI billing before using the feature
