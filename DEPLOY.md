# Deploying to Vercel - Step by Step Guide

## Step 1: Initialize Git Repository

If you haven't already, initialize git and commit your code:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Senior Conversation Trainer"
```

## Step 2: Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to [github.com](https://github.com) and sign in
   - Click the "+" icon in the top right → "New repository"
   - Name it (e.g., `senior-conversation-trainer`)
   - Choose Public or Private
   - **Don't** initialize with README, .gitignore, or license (you already have these)
   - Click "Create repository"

2. **Push your code to GitHub:**
   ```bash
   # Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
   
   # Rename branch to main (if needed)
   git branch -M main
   
   # Push to GitHub
   git push -u origin main
   ```

## Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Click "Sign Up" or "Log In"
   - **Sign in with GitHub** (this connects your GitHub account)

2. **Import your project:**
   - Click "Add New..." → "Project"
   - You'll see your GitHub repositories listed
   - Find and click "Import" next to your `senior-conversation-trainer` repository

3. **Configure the project:**
   - **Framework Preset:** Vercel should auto-detect "Next.js" ✅
   - **Root Directory:** Leave as `./` (default)
   - **Build Command:** Leave as default (`npm run build`)
   - **Output Directory:** Leave as default (`.next`)
   - **Install Command:** Leave as default (`npm install`)

4. **Add Environment Variable:**
   - Scroll down to "Environment Variables"
   - Click "Add" or "Add Environment Variable"
   - **Name:** `NEXT_PUBLIC_GROQ_API_KEY`
   - **Value:** Your Groq API key (get it from https://console.groq.com/)
   - Make sure it's added for all environments (Production, Preview, Development)
   - Click "Add"

5. **Deploy:**
   - Click "Deploy" button
   - Wait 1-2 minutes for the build to complete
   - Your app will be live at a URL like: `https://senior-conversation-trainer.vercel.app`

## Step 4: Automatic Deployments (Future Updates)

Once connected, Vercel will automatically deploy:
- **Every push to `main` branch** → Production deployment
- **Every pull request** → Preview deployment
- **Every push to other branches** → Preview deployment

To update your app:
```bash
# Make your changes, then:
git add .
git commit -m "Your commit message"
git push
```

Vercel will automatically detect the push and redeploy! 🚀

## Troubleshooting

### Build Fails?
- Check the build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify environment variables are set correctly

### API Not Working?
- Double-check the environment variable name: `NEXT_PUBLIC_GROQ_API_KEY`
- Make sure it's set for all environments (Production, Preview, Development)
- Restart the deployment after adding environment variables

### Need Custom Domain?
- Go to your project in Vercel dashboard
- Click "Settings" → "Domains"
- Add your custom domain

## Quick Commands Reference

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Connect to GitHub (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main

# Future updates
git add .
git commit -m "Update message"
git push
```

