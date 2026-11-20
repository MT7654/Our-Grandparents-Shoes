# ConverseBetter

ConverseBetter is a Next.js application for youth volunteers practising visits with Margaret Chan. Volunteers can start House Visit, Listening Ear, or Resolve a Task in any order. Coordinators assign scenarios to cohorts and review practice activity by Singapore calendar dates.

## Run locally

Use Node.js 24 and install the locked dependencies with `npm ci --legacy-peer-deps`. Set the server variables described in [the deployment guide](DEPLOY.md) in an ignored `.env.local`, then run `npm run dev`.

Neon provides PostgreSQL and managed authentication. Existing users select **Restore an existing account** and verify the email they used in ConverseBetter. The app links their new login to their original application ID.

## Application

| Path | Purpose |
| --- | --- |
| `app/scenarios`, `app/chat` | Practice selection, assignments, contextual actions and conversation |
| `app/dashboard` | History, skill trends, journals, reflections and retries |
| `app/admin` | Participation, CSV export, cohorts, assignments and volunteer review |
| `lib/visits`, `lib/scenarios.json` | Visit choices, outcomes and validated objectives |
| `lib/neon` | Verified identity mapping and scoped PostgreSQL access |
| `lib/llm` | Groq dialogue and assessment |
| `assets/margaret`, `public/visit` | Visual references, editable Blender source, export scripts and web assets |
| `supabase/migrations`, `scripts/neon` | Historical schema, release migrations and reconciliation |
| `scripts/verify-visit-*` | Synthetic database and Chromium fixtures |

The two Vercel projects use the same Neon database. Deployment variables, historical import checks, and rollback considerations are in [DEPLOY.md](DEPLOY.md).
