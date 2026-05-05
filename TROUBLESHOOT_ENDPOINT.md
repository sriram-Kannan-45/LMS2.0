# AI Quiz Feature - Troubleshooting "Endpoint Not Found"

## ⚠️ Root Cause
The "Endpoint not found" error occurs when:
1. **Backend server isn't running** on port 3001
2. **Frontend calls wrong URL** (missing `/api` prefix)
3. **Route not properly registered** due to syntax errors

## ✅ Solution Checklist

### 1. Verify Backend is Running
```powershell
# Check if port 3001 is listening
netstat -ano | Select-String "3001"

# Should show: TCP ... 0.0.0.0:3001 ... LISTENING
```

### 2. Start All Services (Automated)
**Double-click**: `D:\feedWeb\start-all-fixed.bat`

Or manually:
```powershell
# Terminal 1: Python AI Service
cd D:\feedWeb\ai-service
python main.py

# Terminal 2: Node.js Backend  
cd D:\feedWeb\backend
npm run dev

# Terminal 3: React Frontend
cd D:\feedWeb\frontend
npm run dev
```

### 3. Test Endpoint Directly
```powershell
# Test health endpoint (no auth required)
Invoke-RestMethod -Uri "http://localhost:3001/api/ai-quiz/health" -Method GET

# Should return: {"status":"error","message":"AI service unavailable",...}
# (This is normal if Python service isn't started yet)
```

### 4. Verify Route Registration
```powershell
cd D:\feedWeb\backend
node -e "const app = require('./src/app.js').app; console.log('Routes:'); app._router.stack.forEach(s => { if(s.route) console.log(Object.keys(s.route.methods)[0].toUpperCase(), s.route.path); else if(s.handle && s.handle.stack) { s.handle.stack.forEach(r => { if(r.route) console.log(Object.keys(r.route.methods)[0].toUpperCase(), '/api/ai-quiz' + r.route.path); }); });"
```

Should show:
```
POST /api/ai-quiz/trainer/upload-document
GET /api/ai-quiz/trainer/quizzes
PUT /api/ai-quiz/trainer/quiz/:id
POST /api/ai-quiz/participant/start/:quizId
POST /api/ai-quiz/participant/submit/:attemptId
GET /api/ai-quiz/leaderboard/:quizId
GET /api/ai-quiz/participant/quizzes
GET /api/ai-quiz/health
```

## 🔧 Common Fixes

### Fix 1: Backend not starting
```powershell
cd D:\feedWeb\backend
# Check for syntax errors
node -e "require('./src/app.js')" 2>&1

# If no errors, start the server
npm run dev
```

### Fix 2: Route registered twice (causes conflicts)
Check `app.js`:
```javascript
// GOOD: Only one registration
app.use('/api/ai-quiz', aiQuizRoutes);

// BAD: Duplicate registration (REMOVE one)
app.use('/api/ai-quiz', aiQuizRoutes);
app.use('/api/ai-quiz', aiQuizRoutes);  // DELETE THIS LINE
```

### Fix 3: Frontend calling wrong URL
In `TrainerAIQuiz.jsx`, ensure:
```javascript
const API_BASE = 'http://localhost:3001/api';

// Correct call:
fetch(`${API_BASE}/ai-quiz/trainer/upload-document`, ...)
```

## 🚨 If Still Getting "Endpoint Not Found"

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Check browser console** (F12) for actual URL being called
3. **Verify user is logged in** (token exists in localStorage)
4. **Check browser Network tab** to see the actual request/response

## 📞 Support
If the issue persists:
1. Check `D:\feedWeb\backend\src\app.js` - ensure line 61 exists: `app.use('/api/ai-quiz', aiQuizRoutes);`
2. Restart backend: `cd backend && npm run dev`
3. Check Python service: `cd ai-service && python main.py`
