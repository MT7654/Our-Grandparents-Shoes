# Senior Conversation Trainer

A Next.js application for practising conversations with senior personas using AI-powered sentiment analysis, rapport tracking, and end-of-conversation evaluation.

## Table of contents

- [Running locally](#-running-locally)
- [Database setup (Supabase)](#️-database-setup-supabase)
- [Deployment](#-deployment-options)
- [Project structure](#-project-structure)
- [API overview](#-api-overview)
- [Features](#-features)
- [Tech stack](#️-tech-stack)
- [Notes](#-notes)

## 🚀 Running locally

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

2. **Set up environment variables**

   Create a `.env.local` file in the root with:

   ```
   GROQ_API_KEY=your_groq_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Set up Supabase database** (see [Database Setup](#-database-setup) section below)

4. **Run the development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser** at [http://localhost:3000](http://localhost:3000).

### Build for Production

To create an optimized production build:

```bash
npm run build
npm start
```

## 🗄️ Database Setup (Supabase)

This application uses Supabase as the database backend. Follow these steps to set up your database:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for it to be set up (~2 minutes)

### 2. Get Your Supabase Credentials

Once your project is created:

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### 3. Run Database Migrations

The database schema is defined in SQL migration files. You can run them in two ways:

#### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order (from `supabase/migrations/`):
   - `20251206103847_create_profiles.sql`
   - `20251206103850_create_profile_creation_trigger.sql`
   - `20251206103852_create_personas.sql`
   - `20251206103857_create_chats.sql`
   - `20251206111752_create_conversations.sql`
   - `20251206111759_create_messages.sql`
   - `20251206111925_create_evaluations.sql`
   - `20251207095258_create_interests.sql`
   - `20251207121729_create_scores.sql`
   - `20251209055547_create_unique_recent_message_trigger.sql`
   - `20251209081512_create_dashboard_views.sql`
   - `20251211113206_create_badges.sql`
   - `20251211114854_create_achievements.sql`
   - `20251211120546_create_award_triggers.sql`
   - `20260102130913_create_custom_claims.sql`

4. Copy and paste each file's contents into the SQL Editor and click "Run"

#### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

### 4. Seed Initial Data (Optional)

To populate the database with sample personas and chats:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the seed files in order:
   - `supabase/seeds/001.personas.sql` (creates personas and interests)
   - `supabase/seeds/002.chats.sql` (creates sample chat sessions)
   - `supabase/seeds/003.badges.sql` (creates badges)

   **Note:** The seed files create two personas (Margaret Thompson and Robert Chen) with their interests and sample chat sessions.

### 5. Configure Auth Hooks for Custom Access Token Claims

The application uses custom JWT claims to include user roles in access tokens. This is set up through the `20260102130913_create_custom_claims.sql` migration, which creates a function that adds the user's role to their access token.

**After running the migrations**, verify the Auth Hook is configured in the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Auth Hooks**
3. Under **Custom Access Token** section, you should see:
   - **Hook Function**: `public.custom_access_token_hook`
   - This hook automatically adds the `user_role` claim to JWT tokens based on the user's role in the `profiles` table

### 6. Configure Row Level Security (RLS)

The migrations automatically enable Row Level Security on the `profiles` table. The RLS policies are defined in the migration files and will be applied automatically when you run the migrations.

### 7. Verify Setup

After running migrations, verify your setup:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see the following tables:
   - `profiles`
   - `personas`
   - `chats`
   - `conversations`
   - `messages`
   - `evaluations`
   - `interests`
   - `scores`
   - `badges`
   - `achievements`

3. Check **Database** → **Views** for:
   - `conversation_sessions`
   - `statistics`
   - `average_score_conversations`

### Troubleshooting

- **Migration errors**: Make sure you run migrations in the correct order (by timestamp)
- **RLS errors**: Check that RLS policies are properly set up in the migration files
- **Connection errors**: Verify your environment variables are correctly set in `.env.local`

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
5. Add environment variables (including `GROQ_API_KEY`, Supabase URL and keys)
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

Make sure to add all required environment variables in your hosting platform's settings:

**Required variables**

- `GROQ_API_KEY` – Groq API key (server-side only; do not use `NEXT_PUBLIC_` for this)
- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (keep secret)

**Note:** For production deployments, you'll also need to run the database migrations on your Supabase project (see [Database Setup](#-database-setup) section above).

## 📁 Project structure

```
├── app/
│   ├── api/
│   │   ├── auth/         # login, logout, session, signup
│   │   ├── chat/         # start, resume, next, end (conversation flow)
│   │   ├── dashboard/    # past conversations, statistics, achievements
│   │   └── scenarios/    # list scenarios or single scenario + persona
│   ├── chat/[scenarioId] # Chat training page
│   ├── complete/[converseId] # Results page after ending a conversation
│   ├── dashboard/        # User dashboard
│   └── scenarios/        # Scenario selection
├── lib/
│   ├── chat/             # conversation, message, evaluation, score, service
│   ├── llm/              # chat (persona reply), evaluate (sentiment), completion (end evaluation)
│   ├── auth/             # guard, middleware
│   ├── dashboard/        # dashboard data helpers
│   └── supabase/         # server/client/middleware clients
├── components/           # React UI components
├── public/               # Static assets (e.g. avatar images)
└── .env.local            # Environment variables (not in Git)
```

## 📡 API overview

All API routes that require auth use the `guard('user')` pattern; invalid or missing session returns 401.

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/api/chat/start` | Start or resume a conversation. Body: `{ scenario_name, difficulty_level }`. |
| POST | `/api/chat/resume` | Resume in-progress conversation. Body: `{ scenario_name }`. |
| POST | `/api/chat/next` | Send a message and get persona reply + evaluation. Body: `{ converseId, latestMessage }`. |
| POST | `/api/chat/end` | End conversation and run completion evaluation. Body: `{ converseId }`. |
| GET | `/api/chat/end?id=<converseId>` | Get completed conversation with scores (for results page). |
| GET | `/api/scenarios` | List all scenarios. Optional query: `?name=<scenarioKey>` for one scenario + persona. |
| GET | `/api/dashboard` | Past conversations, statistics, achievements. |
| POST | `/api/auth/login` | Sign in. Body: `{ email, password }`. |

## 🎯 Features

- AI-powered persona conversations (e.g. Margaret & Robert)
- Real-time sentiment analysis and rapport updates
- Dynamic avatar expressions based on conversation sentiment
- Rapport tracking and health bar
- AI-generated coaching tips and end-of-conversation feedback with scores

## 🛠️ Tech stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - PostgreSQL database with authentication
- **Groq (Llama 3.1)** - Fast AI conversations and sentiment analysis
- **Radix UI** - Accessible component library

## 📝 Notes

- Avatar images go in `/public` with naming: `{personaId}-{Emotion}.jpg` (e.g. `margaret-Happy.jpg`, `robert-Sad.jpg`).
- The app uses server-side API routes and server-side env vars; it needs a Node.js hosting environment (not static-only hosting like GitHub Pages).

