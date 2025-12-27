# Mock AI Interview - Setup Guide

## Quick Start (AI Features Enabled)

Follow these steps to run the application with AI features:

### Step 1: Install Node.js
If you don't have Node.js installed, download it from: https://nodejs.org/
- Download the LTS (Long Term Support) version
- Run the installer
- Verify installation by opening PowerShell and typing: `node --version`

### Step 2: Install Dependencies
Open PowerShell in your project folder and run:
```bash
npm install
```

This will install:
- Express (web server)
- CORS (cross-origin requests)
- dotenv (environment variables)
- node-fetch (HTTP requests)

### Step 3: Configure API Key
1. **Get a NEW Gemini API Key:**
   - Visit: npm
   - Create a new API key (DO NOT reuse the old exposed one!)

2. **Create `.env` file:**
   - Copy `.env.example` to `.env`
   - Add your API key:
   ```
   GEMINI_API_KEY=your_new_api_key_here
   PORT=3000
   ```

3. **IMPORTANT:** Never commit the `.env` file to Git!

### Step 4: Start the Backend Server
In PowerShell, run:
```bash
npm start
```

You should see:
```
✅ Server running on http://localhost:3000
📝 API endpoints:
   - POST /api/generate-question
   - POST /api/generate-feedback
   - GET  /api/health
```

### Step 5: Open the Application
1. Keep the server running in PowerShell
2. Open `index.html` in your web browser
3. The app will now use AI features! 🎉

---

## How It Works (Security)

```
Browser (Frontend)          Backend Server          Gemini API
     |                           |                       |
     | 1. Request question       |                       |
     |-------------------------->|                       |
     |                           | 2. Forward request    |
     |                           |---------------------->|
     |                           |                       |
     |                           | 3. Response           |
     |                    <------|                       |
     | 4. Return question        |                       |
     |<--------------------------|                       |
```

**Key Security Features:**
- ✅ API key stored on server (in `.env`)
- ✅ API key never exposed to browser
- ✅ `.gitignore` prevents committing `.env`
- ✅ Backend validates all requests

---

## Troubleshooting

### "Cannot connect to backend server"
**Problem:** The backend server isn't running.
**Solution:** Start it with `npm start` in PowerShell.

### "npm not found"
**Problem:** Node.js isn't installed or not in PATH.
**Solution:** Install Node.js from https://nodejs.org/

### Port 3000 Already in Use
**Problem:** Another application is using port 3000.
**Solution:** Change the port in `.env`:
```
PORT=3001
```
Then update `script.js` line 2:
```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

### API Rate Limit Exceeded
**Problem:** Too many requests to Gemini API.
**Solution:** 
- Wait for quota reset (24 hours for free tier)
- Or temporarily set `USE_FALLBACK_ONLY = true` in `script.js`

---

## Fallback Mode (No Backend Needed)

If you don't want to use AI features:

1. Open `script.js`
2. Change line 4:
   ```javascript
   const USE_FALLBACK_ONLY = true;
   ```
3. Open `index.html` in browser
4. App works with practice questions only (no server needed)

---

## Project Structure

```
Mock_Ai_Interview-main/
├── index.html              # Frontend UI
├── script.js               # Frontend logic
├── style.css               # Styling
├── server.js               # Backend API server
├── package.json            # Dependencies
├── config.js               # Configuration
├── .env.example            # Environment template
├── .env                    # Your API key (create this, never commit!)
├── .gitignore              # Git ignore rules
└── SECURITY_FIXES.md       # Security documentation
```

---

## Development Tip

For auto-restart during development, install nodemon:
```bash
npm install -g nodemon
```

Then run:
```bash
npm run dev
```

This restarts the server automatically when you make changes.
