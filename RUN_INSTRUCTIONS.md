# LMS Portal - Complete Run Instructions

> **Tech Stack:** Node.js (Backend) + React (Frontend) + Python (AI Service) + MySQL (Database)

---

## Prerequisites

- **Node.js** 18+ (for backend and frontend)
- **Python** 3.10+ (for AI service)
- **MySQL** 8.0+ (database)
- **npm** 9+ (Node package manager)
- **pip** 3.8+ (Python package manager)

---

## ⚡ QUICK START (Automated - Recommended)

### Windows Batch File

Simply **double-click:**
```
D:\feedWeb\start-all-fixed.bat
```

Or run from PowerShell:
```powershell
cd D:\feedWeb
.\start-all-fixed.bat
```

This script will:
1. ✅ Install/verify backend dependencies
2. ✅ Install/verify frontend dependencies
3. ✅ Start Python AI Service (port 8000)
4. ✅ Start Node.js Backend (port 3001)
5. ✅ Start React Frontend (port 5173)

**Wait 10-15 seconds** for all services to start, then open your browser.

---

## 🔧 MANUAL START (Step by Step)

### Step 1: Ensure MySQL is Running

```powershell
# Check if MySQL is running
netstat -ano | findstr "3306"

# If not running, start it from:
# - XAMPP Control Panel (Windows)
# - WAMP System Tray
# - Or command line: net start MySQL80
```

MySQL should be accessible at: `localhost:3306`

---

### Step 2: Start Python AI Service

**Terminal 1 - Open PowerShell/CMD and run:**

```powershell
cd D:\feedWeb\ai-service
python main.py
```

Expected output:
```
LMS AI Quiz Generator v3.0.0
Uvicorn running on http://0.0.0.0:8000
Application startup complete
```

✅ **AI Service ready on:** `http://localhost:8000`

---

### Step 3: Start Node.js Backend

**Terminal 2 - Open new PowerShell/CMD and run:**

```powershell
cd D:\feedWeb\backend
npm run dev
```

Expected output:
```
✅ Database connected successfully
✅ Database schema verified
🚀 WAVE INIT LMS Server running on http://localhost:3001
✅ Socket.IO initialized
```

✅ **Backend ready on:** `http://localhost:3001`

---

### Step 4: Start React Frontend

**Terminal 3 - Open new PowerShell/CMD and run:**

```powershell
cd D:\feedWeb\frontend
npm run dev
```

Expected output:
```
VITE v5.0.8 ready in XXX ms

➜ Local: http://localhost:5173
```

✅ **Frontend ready on:** `http://localhost:5173`

---

### Step 5: Access the Application

1. **Open browser** and go to: `http://localhost:5173`
2. **Select role:** ADMIN, TRAINER, or PARTICIPANT
3. **Login with default admin credentials:**
   - Email: `admin@test.com`
   - Password: `admin123`
   - Role: `ADMIN`
4. **Click Login** - You should see the Admin Dashboard

---

## 🎯 Available Credentials

### Pre-created Admin Account
```
Email:    admin@test.com
Password: admin123
Role:     ADMIN
```

### Create New Accounts
- **Trainers:** Created by Admin
- **Participants:** Self-registration (see below)

---

## 📱 User Flows

### ADMIN Dashboard
1. ✅ Login with admin@test.com / admin123
2. ✅ Create trainer accounts
3. ✅ Manage trainers and participants
4. ✅ Approve participant registrations
5. ✅ View analytics and reports
6. ✅ Manage trainings and courses

### TRAINER Dashboard
1. ✅ Login with trainer credentials (created by admin)
2. ✅ Create trainings/courses
3. ✅ Generate AI quizzes from documents (PDF/DOCX)
4. ✅ Manage participants
5. ✅ View quiz results and leaderboards
6. ✅ Conduct live classes

### PARTICIPANT Features
1. ✅ Register as participant (click "Register as Participant")
2. ✅ Wait for admin approval
3. ✅ Login with email and password
4. ✅ View available trainings
5. ✅ Enroll in trainings
6. ✅ Take quizzes
7. ✅ View leaderboards
8. ✅ Submit feedback

---

## 🐛 Troubleshooting

### Issue: "Port 3001 already in use"

**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr "3001"

# Kill the process (replace XXXX with PID)
taskkill /PID XXXX /F

# Retry backend start
cd backend && npm run dev
```

---

### Issue: "Cannot connect to MySQL"

**Solution:**
```powershell
# 1. Check if MySQL is running
netstat -ano | findstr "3306"

# 2. Start MySQL if not running
net start MySQL80

# 3. Verify credentials in backend/.env
# Default: DB_USER=root, DB_PASS=1234

# 4. Test MySQL connection
mysql -u root -p1234 -h localhost
```

---

### Issue: "AI Service unavailable"

**Solution:**
```powershell
# 1. Check if Python service is running
netstat -ano | findstr "8000"

# 2. Verify Python is installed
python --version

# 3. Install Python dependencies
cd ai-service
pip install -r requirements.txt

# 4. Start AI service
python main.py
```

---

### Issue: "npm dependencies not found"

**Solution:**
```powershell
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev
```

---

### Issue: "Frontend not loading / Blank page"

**Solution:**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
3. Check browser console: `F12` → Console tab for errors
4. Verify backend is running: `http://localhost:3001/health`

---

### Issue: "Login fails / Invalid credentials"

**Solution:**
```powershell
# Verify admin account exists
mysql -u root -p1234 training_db
SELECT * FROM User WHERE email='admin@test.com';

# Should show admin user
# If not, backend will create it on first run

# Verify password
# Default: admin123
```

---

## 📊 System Endpoints

### Health Checks
```
Frontend:   http://localhost:5173
Backend:    http://localhost:3001/health
AI Service: http://localhost:8000/health
Database:   localhost:3306 (MySQL)
```

### API Base URL
```
http://localhost:3001/api
```

---

## 🔌 Services Overview

| Service | Port | Technology | Status |
|---------|------|-----------|--------|
| Frontend | 5173 | React + Vite + Tailwind | Running |
| Backend | 3001 | Node.js + Express + Sequelize | Running |
| AI Service | 8000 | Python + FastAPI + Groq | Running |
| Database | 3306 | MySQL 8.0+ | Running |

---

## 📝 Configuration Files

### Backend Configuration (`.env`)
Located at: `D:\feedWeb\backend\.env`
```env
PORT=3001
DB_NAME=training_db
DB_USER=root
DB_PASS=1234
DB_HOST=localhost
JWT_SECRET=your-super-secret-jwt-key-change-in-production
AI_SERVICE_URL=http://localhost:8000
```

### AI Service Configuration (`.env`)
Located at: `D:\feedWeb\ai-service\.env`
```env
GROQ_API_KEY=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
AI_SERVICE_PORT=8000
```

---

## 🚀 Development Tips

### Watch Mode
All services run in watch mode (auto-restart on file changes):
- Backend: `npm run dev` (uses nodemon)
- Frontend: `npm run dev` (Vite auto-refresh)
- AI Service: Auto-reload with `python main.py`

### Building for Production
```powershell
# Frontend production build
cd frontend
npm run build
# Output: dist/ folder ready for deployment

# Backend doesn't need building
# Serve dist/ files through backend or CDN
```

---

## 🔒 Security Notes

**For Production, change:**
1. ✅ JWT_SECRET in backend/.env
2. ✅ Database password (DB_PASS)
3. ✅ Remove or change default admin password
4. ✅ Set NODE_ENV=production
5. ✅ Use HTTPS for FRONTEND_URL
6. ✅ Configure proper CORS origins

---

## 📞 Need Help?

1. **Check DEBUG_REPORT.md** - Comprehensive diagnosis document
2. **Check browser console** - F12 for frontend errors
3. **Check terminal output** - Each service logs errors
4. **Check MySQL** - Verify database connectivity
5. **Check ports** - Ensure all ports are available

---

## ✅ Verification Checklist

After starting all services, verify:

- [ ] Frontend loads at http://localhost:5173
- [ ] Login page is visible
- [ ] Can login with admin@test.com / admin123
- [ ] Admin dashboard loads
- [ ] Backend API responds to http://localhost:3001/health
- [ ] All 3 services running without errors
- [ ] MySQL database connected
- [ ] No red errors in browser console (F12)

---

**Status:** ✅ Ready to use!

For detailed technical information, see: `DEBUG_REPORT.md`