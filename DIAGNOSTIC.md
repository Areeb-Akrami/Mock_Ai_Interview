# Quick Diagnostic Checklist

Run through this checklist to fix the 404 error:

## 1. Check .env File Exists
- [ ] Do you have a `.env` file in your project root?
- [ ] Is it named exactly `.env` (not `.env.txt`)?

## 2. Check .env File Contents
Open `.env` and verify:
```
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PORT=3000
```

**Important Checks:**
- [ ] No spaces around the `=` sign
- [ ] No quotes around the API key
- [ ] API key starts with `AIzaSy`
- [ ] API key is about 39 characters long

## 3. Verify API Key is Valid
- [ ] Did you create a NEW API key (not the old exposed one)?
- [ ] Go to: https://aistudio.google.com/app/apikey
- [ ] Check if your key is active and has quota

## 4. Restart Server
After changing `.env`:
- [ ] Stop the server (Ctrl+C in PowerShell)
- [ ] Run `npm start` again
- [ ] Check the server logs for "🔑 API Key loaded"

## Common Issues:

### Issue: "API key not configured"
**Fix:** Your `.env` file is missing or not being read
- Make sure `.env` is in the same folder as `server.js`
- Restart the server after creating .env

### Issue: "404 Error from Gemini API"
**Fix:** Invalid or old API key
- Generate a NEW key at https://aistudio.google.com/app/apikey
- DO NOT use the old key `AIzaSyAqQpdtS-xednVSoWvJKctIqOfygikZGco`
- Copy the new key into your `.env` file

### Issue: Server logs show "API Key: undefined"
**Fix:** Environment variables not loading
- Check file name is exactly `.env` (not `.env.example`)
- No spaces in file name
- Restart server after making changes

## Quick Test:
Open your `.env` file and run this PowerShell command in your project folder:
```powershell
cat .env
```

You should see:
```
GEMINI_API_KEY=AIzaSy...your key here...
PORT=3000
```

If you see nothing or an error, the file doesn't exist or is named wrong.
