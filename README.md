
# 🚀 LessonLens | Study Companion Deployment Guide

This project is a high-performance, AI-powered study tool built with React and the Google Gemini API. To get this running as a live website on GitHub, follow these steps.

## 🛠 Prerequisites
1. A **GitHub Account**.
2. An **API Key** from [Google AI Studio](https://aistudio.google.com/).
3. A local development environment (Node.js installed).

## 🌍 Quick Start: Hosting on GitHub Pages

### 1. Create a New Repository
- Go to [GitHub](https://github.com) and create a new repository named `lessonlens`.
- Keep it **Public** (required for free GitHub Pages).

### 2. Push Your Code
If you are using the command line:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lessonlens.git
git branch -M main
git push -u origin main
```

### 3. Build Step (Crucial)
Standard browsers cannot read `.tsx` files directly. You have two options for GitHub Pages:

#### Option A: Simple Static (Best for quick previews)
For the code to work directly in a browser without a build step, you would need to transpile the `.tsx` to `.js`. However, for the most professional result, we recommend **Vite**.

#### Option B: Using Vite (Recommended)
1. Initialize a Vite project: `npm create vite@latest . -- --template react-ts`
2. Move your files into the `src/` folder.
3. Update `index.html` to point to the correct paths.
4. Run `npm run build`.
5. Deploy the `dist/` folder to GitHub Pages.

### 4. Enable GitHub Pages
1. Go to your repository **Settings** on GitHub.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment**, set the source to **Deploy from a branch**.
4. Select the `main` branch (or `gh-pages` if you used a build tool) and the folder (`/root` or `/docs`).
5. Click **Save**.

## 🔑 Handling your API Key
**Warning:** Do not commit your `.env` file with your real API key to GitHub. It is public.
Instead:
1. Use a tool like **Vercel** or **Netlify** if you want to keep the key hidden via environment variables.
2. Or, update the code to allow users to input their own key if they are using your public link.

## 📱 PWA Support
This app includes a `manifest.json` and `sw.js`. Once hosted on HTTPS (GitHub Pages provides this automatically), users will see an "Install" prompt on Android and can "Add to Home Screen" on iOS.

---
*Created with ❤️ for students everywhere.*
