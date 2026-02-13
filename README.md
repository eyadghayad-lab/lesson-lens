
# 🚀 LessonLens | Study Companion Deployment Guide

This project is a high-performance, AI-powered study tool built with React and the Google Gemini API. To host this live on GitHub Pages, follow these steps.

## 🛠 Prerequisites
1. A **GitHub Account**.
2. An **API Key** from [Google AI Studio](https://aistudio.google.com/).
3. Use modern browsers (Chrome, Edge, Safari).

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
