
# 🚀 LessonLens | Study Companion Deployment Guide

This project is a high-performance, AI-powered study tool built with React, Hugging Face models, and Firebase.

## 🛠 Prerequisites
1. A **GitHub Account**.
2. An **API Key** from [Hugging Face](https://huggingface.co/settings/tokens).
3. A **Firebase Project** for the account and leaderboard system.
4. Use modern browsers (Chrome, Edge, Safari).

## 🔥 Firebase Setup
To enable the account and leaderboard system, you must set up a Firebase project:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named "LessonLens".
3. Enable **Authentication** and activate the **Google Sign-In** provider.
4. Enable **Cloud Firestore** and create a database in "Production mode" (or test mode for development).
5. Add a **Web App** to your project and copy the configuration.
6. Set the following environment variables in your hosting provider (e.g., Vercel, Netlify) or a `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_HUGGINGFACE_TOKEN`

## 🌍 Hosting on GitHub Pages

### 1. The Structure
This application is a **Single Page Application (SPA)**. 
- **Main Entry**: `index.html`
- **Core Logic**: `index.tsx`
- **Component Entry**: `App.tsx`

**Important**: You should only ever open `index.html`. All other pages (like the Landing Page) are internal views managed by React.

### 2. Relative Paths (Fixed)
To ensure the app works on GitHub Pages (which hosts in a subfolder like `/lessonlens/`), the script tags in `index.html` must use relative paths:
- ✅ Correct: `<script src="index.tsx"></script>`
- ❌ Incorrect: `<script src="/index.tsx"></script>` (This fails on GitHub)

### 3. Deployment Steps
1. Create a new repository on GitHub.
2. Upload all files from this directory to the repository.
3. Go to **Settings > Pages**.
4. Set the branch to `main` and folder to `/(root)`.
5. Save and wait 2 minutes for your site to go live.

## 📱 Installation (PWA)
Once hosted on HTTPS (which GitHub provides), you can install LessonLens:
- **Mobile**: Tap 'Install' in the header or 'Add to Home Screen'.
- **Desktop**: Click the install icon in your browser's address bar.

---
*Created with ❤️ for students everywhere.*
