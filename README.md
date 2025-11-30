# Senior Conversation Trainer

A Next.js application for practicing conversations with senior personas using AI-powered sentiment analysis.

## 🚀 Running Locally

### Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory (already created):
   ```
   NEXT_PUBLIC_GROQ_API_KEY=your_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

To create an optimized production build:

```bash
npm run build
npm start
```

## 📦 Deployment Options

### ⚠️ GitHub Pages Limitation

**GitHub Pages cannot host this app** because:
- GitHub Pages only serves static HTML/CSS/JS files
- This app uses **API routes** (server-side code) that require a Node.js server
- Environment variables need server-side access

### ✅ Recommended Deployment Platforms

#### 1. **Vercel** (Recommended - Made by Next.js creators)

**Easiest option with zero configuration:**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click "New Project" and import your repository
5. Add environment variable:
   - Name: `NEXT_PUBLIC_GROQ_API_KEY`
   - Value: Your Groq API key
6. Click "Deploy"

**Vercel automatically:**
- Detects Next.js
- Builds and deploys your app
- Provides HTTPS and custom domains
- Handles API routes perfectly

#### 2. **Netlify**

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Sign in and click "New site from Git"
4. Connect your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variable in Site settings → Environment variables
7. Deploy

#### 3. **Railway**

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Add environment variable in Variables tab
5. Deploy

#### 4. **Render**

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New" → "Web Service"
4. Connect your repository
5. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Add environment variable
7. Deploy

### 🔒 Environment Variables for Deployment

Make sure to add your environment variable in your hosting platform's settings:
- Variable name: `NEXT_PUBLIC_GROQ_API_KEY`
- Variable value: Your Groq API key

## 📁 Project Structure

```
├── app/
│   ├── api/              # API routes (backend)
│   │   ├── chat/         # OpenAI chat endpoint
│   │   └── evaluate/     # Sentiment evaluation endpoint
│   ├── chat/             # Chat training page
│   └── ...
├── components/           # React components
├── public/              # Static assets (avatar images)
└── .env.local           # Environment variables (not in Git)
```

## 🎯 Features

- AI-powered persona conversations (Margaret & Robert)
- Real-time sentiment analysis
- Dynamic avatar expressions based on conversation sentiment
- Rapport tracking and health bar
- AI-generated coaching tips

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Groq (Llama 3.1)** - Fast AI conversations and sentiment analysis
- **Radix UI** - Accessible component library

## 📝 Notes

- Avatar images should be placed in `/public` folder with naming: `{personaId}-{Emotion}.jpg`
  - Example: `margaret-Happy.jpg`, `robert-Sad.jpg`, etc.
- The app uses server-side API routes, so it requires a Node.js hosting environment

