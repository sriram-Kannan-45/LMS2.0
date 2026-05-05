# AI Quiz Feature - Complete Setup Guide

## 🎯 Feature Overview
The AI Quiz Generator allows trainers to upload documents (PDF/DOCX/TXT) and automatically generate quizzes using AI (LangChain + Hugging Face). Participants can take quizzes and get scored automatically.

## 📁 Project Structure

### Backend (Node.js + Express + Sequelize)
- `backend/src/models/` - AIDocument, AIQuiz, AIQuestion, QuizAttempt, QuizAnswer, QuizResult
- `backend/src/routes/aiQuizRoutes.js` - API endpoints
- `backend/src/services/aiService.js` - Calls Python FastAPI service

### AI Service (Python + FastAPI + LangChain)
- `ai-service/main.py` - FastAPI service using LangChain + Hugging Face (google/flan-t5-base)

### Frontend (React + Vite)
- `frontend/src/components/TrainerAIQuiz.jsx` - Trainer UI
- `frontend/src/components/QuizTaking.jsx` - Quiz taking UI
- `frontend/src/components/Leaderboard.jsx` - Podium + chart leaderboard
- `frontend/src/pages/ParticipantQuizzes.jsx` - Participant quizzes page

## 🚀 Quick Start

### 1. Start the Python AI Service
```bash
cd D:\feedWeb
.\start-ai-service.bat
```
Or manually:
```bash
cd D:\feedWeb\ai-service
pip install -r requirements.txt
python main.py
```
Service runs on http://localhost:8000

### 2. Configure API Keys

**Hugging Face Token** (for AI service):
1. Sign up at https://huggingface.co/join (free)
2. Get token from https://huggingface.co/settings/tokens
3. Edit `ai-service/.env` and add your token:
   ```
   HUGGINGFACEHUB_API_TOKEN=hf_your_token_here
   ```

### 3. Start the Node.js Backend
```bash
cd D:\feedWeb\backend
npm run dev
```
Backend runs on http://localhost:3001

### 4. Start the Frontend
```bash
cd D:\feedWeb\frontend
npm run dev
```
Frontend runs on http://localhost:5173

## 🔌 API Endpoints

### Trainer Endpoints
- `POST /api/ai-quiz/trainer/upload-document` - Upload document & generate quiz
- `GET /api/ai-quiz/trainer/quizzes` - List trainer's quizzes
- `PUT /api/ai-quiz/trainer/quiz/:id` - Update quiz settings
- `GET /api/ai-quiz/health` - Check AI service health

### Participant Endpoints
- `GET /api/ai-quiz/participant/quizzes` - List available quizzes
- `POST /api/ai-quiz/participant/start/:quizId` - Start quiz attempt
- `POST /api/ai-quiz/participant/submit/:attemptId` - Submit answers

### Leaderboard
- `GET /api/ai-quiz/leaderboard/:quizId` - Get top performers

## 🎨 UI Features
- Split layout: Document input ← → Quiz preview
- Podium-style leaderboard (🥇🥈🥉) with Recharts BarChart
- Gradient buttons with smooth hover animations
- Clean error/success messages with icons
- File upload with validation (rejects images)
- Progress bar during quiz taking
- Timer with warning states

## ⚠️ Common Issues

### "Endpoint not found"
- Ensure backend is running on port 3001
- Check that `aiQuizRoutes.js` is properly loaded in `app.js`

### "AI service is not running"
- Start the Python service: `cd ai-service && python main.py`
- Check http://localhost:8000/health

### "Hugging Face token invalid"
- Get a valid token from https://huggingface.co/settings/tokens
- Update `ai-service/.env`

## 📝 Notes
- Only text-based files (PDF, DOCX, TXT) are supported
- Images (PNG, JPG, etc.) are explicitly rejected
- The AI uses google/flan-t5-base (free tier, no billing required)
- Quiz generation may take 10-30 seconds
- All API calls include proper error handling with user-friendly messages
