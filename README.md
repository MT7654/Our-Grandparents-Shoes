# ConverseBetter

ConverseBetter is a Next.js application for practising conversations with senior personas using AI-powered sentiment analysis, rapport tracking, and end-of-conversation evaluation.

## Table of contents

- [Running locally](#-running-locally)
- [Database setup (Supabase)](#️-database-setup-supabase)
- [Production deployment (Google Cloud Run)](#-production-deployment-google-cloud-run)
- [Project structure](#-project-structure)
- [API overview](#-api-overview)
- [Features](#-features)
- [Tech stack](#️-tech-stack)
- [Notes](#-notes)

## 🚀 Running locally

### Prerequisites
- Node.js 20.9+ installed (required by Next.js 16)
- npm package manager

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env.local` file in the root with:

   ```
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-20b
   GROQ_FALLBACK_MODEL=openai/gpt-oss-120b
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Set up Supabase database** (see [Database Setup](#-database-setup) section below)

   The two model variables are optional and default to the values above. Set
   them on Vercel (or Cloud Run) to change models without editing code, then
   redeploy. Overrides must support Groq JSON mode, `reasoning_effort: low`, and
   `include_reasoning: false`. All three LLM paths share this configuration.
   The previous Llama and Mixtral models have been retired; see
   [Groq's deprecation history](https://console.groq.com/docs/deprecations).
   Use only the server-side `GROQ_API_KEY`; no public Groq key is required.

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser** at [http://localhost:3000](http://localhost:3000).

### Build for Production

To create an optimized production build:

```bash
npm run build
npm start
```

To check real persona replies and both evaluation paths without writing to the
database, run `node --env-file=.env scripts/smoke-llm.cjs`. This uses your Groq
key and makes four API calls with synthetic conversation data. To verify the
fallback independently, set `GROQ_MODEL=openai/gpt-oss-120b` for the test run.

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

## ☁️ Production Deployment (Google Cloud Run)

Google Cloud Run is the primary production hosting environment for this
application.

### Current production service

| Setting | Value |
|---|---|
| Service | `conversebetter` |
| Region | `us-central1` |
| URL | [https://conversebetter-918155710461.us-central1.run.app](https://conversebetter-918155710461.us-central1.run.app) |
| Source | [MT7654/Our-Grandparents-Shoes](https://github.com/MT7654/Our-Grandparents-Shoes) |
| Build | Google Cloud Build |
| Image storage | Google Artifact Registry |
| Container port | `8080` |
| Scaling | Automatic, minimum 0 and maximum 1 instance |
| Resources | 1 CPU and 512 MiB memory |
| Concurrency | 80 requests per instance |
| Request timeout | 300 seconds |
| Access | Public Cloud Run endpoint; application routes enforce Supabase authentication and roles |

Cloud Run provides the HTTPS endpoint and executes the Next.js application and
server API routes. Cloud Build builds the application from the connected GitHub
repository and stores the resulting container image in Artifact Registry.

### Runtime environment variables

Configure these variables on the Cloud Run service:

- `GROQ_API_KEY` - server-side Groq API key for conversations and evaluations.
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key.
- `SUPABASE_SERVICE_ROLE_KEY` - server-only Supabase service-role key.

Do not commit real secret values to this repository. Cloud Run supplies the
configuration at runtime; the browser obtains the public Supabase URL and
anonymous key through `/api/config/supabase`.

### Deploy a new revision

The production service is connected to this GitHub repository. A maintainer can
deploy from the Cloud Run console by opening `conversebetter`, selecting
**Edit & deploy new revision**, and choosing the intended repository revision.

For a source deployment through Google Cloud CLI:

```bash
gcloud run deploy conversebetter \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Confirm that the existing runtime environment variables and service settings
are retained before directing production traffic to the new revision.

### Post-deployment checks

1. Confirm that the latest revision is ready and receives 100% of traffic.
2. Open the production URL and confirm the ConverseBetter home page loads.
3. Test user login, scenario selection, conversation, completion and dashboard.
4. Test administrator login and the administrator dashboard.
5. Review Cloud Run and Cloud Build logs for deployment or runtime errors.
6. Apply required Supabase migrations before deploying code that depends on
   schema changes.

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
- **Google Cloud Run** - Primary production hosting and HTTPS endpoint
- **Google Cloud Build** - Source build pipeline
- **Google Artifact Registry** - Production container image storage
- **Radix UI** - Accessible component library

## 📝 Notes

- Avatar images go in `/public` with naming: `{personaId}-{Emotion}.jpg` (e.g. `margaret-Happy.jpg`, `robert-Sad.jpg`).
- The app uses server-side API routes and server-side env vars; it needs a Node.js hosting environment (not static-only hosting like GitHub Pages).
- `DEPLOY.md` is a legacy Vercel deployment guide. The Google Cloud Run section
  in this README describes the current production environment.

