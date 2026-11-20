# ConverseBetter deployment

Both Vercel projects, `our-grandparents-shoes` and `v0-senior-conversation-trainer`, use the same Neon application data and Neon Auth service. Configure these server-only environment variables on both projects before deploying:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | TLS connection to the pooled Neon endpoint. The server switches to the restricted member role for volunteer queries. |
| `NEON_AUTH_BASE_URL` | Managed Neon Auth endpoint for the application branch. |
| `NEON_AUTH_COOKIE_SECRET` | Secure random cookie signing key, at least 32 characters. |
| `GROQ_API_KEY` | Dialogue and assessments. |
| `NEXT_PUBLIC_DISABLE_VISIT_3D` | Set to `1` and rebuild to switch practice to portraits. |

Allow each actual production origin in Neon Auth. Enable email/password, required email verification and email codes. Existing volunteers select **Restore an existing account**, enter their original email, then use the reset code to choose a password. The verified Neon subject is linked to the existing UUID. Role and ownership come from the migrated profile.

### Challenge journal

Apply `db/migrations/20261121000100_challenge_journal.sql` to the shared Neon database before deploying the journal. Existing visits retain their historical results. Live practice requires the earlier end-reason migration in the same directory. Challenge evidence is saved per visit, and replay reads the original transcript without creating another visit.

The existing Groq key serves dialogue, scoring and replay. If a configured GPT-OSS model reaches its quota, the application tries the other configured model and the Qwen fallback. The journal can retry an unavailable assessment from the saved conversation.

## Historical import and verification

The source import uses the Supabase service-role key only on the migration workstation. Source credentials and the direct Neon connection string belong in ignored local environment files. Keep record payloads out of logs.

1. Run `node --env-file=.env --env-file=.env.neon.local scripts/neon/import-history.mjs`. This makes two ordered source reads and compares a canonical digest with a private Neon snapshot.
2. For an empty destination only, run `node --env-file=.env.neon.local scripts/neon/initialize.mjs`. The historical Supabase migration scripts run inside an ephemeral PostgreSQL database. Only the resulting schema is materialized in Neon. Foreign keys, constraints, row policies, indexes and existing IDs are retained.
3. Before cutover, repeat the source import and run `node --env-file=.env.neon.local scripts/neon/reconcile.mjs`. If reconciliation reports differences, synchronize those records before routing traffic. Repeat after the old deployments stop receiving writes.
4. Run `node --env-file=.env.local scripts/neon/verify.mjs`, `node scripts/verify-visit-report.mjs`, the TypeScript check and the production build. Run `node scripts/verify-visit-browser.mjs` with the installed Playwright Chromium binary (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`).
5. Deploy to each Vercel project, verify sign-in, restored history, admin usage and asset delivery, and retain the preceding revisions. A rollback to a Supabase-backed revision requires reconciling writes made in Neon first.

### Optional: separate beta volunteer password accounts

This feature does not change Neon Auth verification, recovery or coordinator access.
Leave `CONVERSEBETTER_BETA_ACCOUNTS` unset (the default) until anonymous, existing
volunteer and coordinator flows have been verified on a preview database/host.
Apply the single additive SQL file
`db/migrations/20261120093000_beta_volunteer_credentials.sql` using a database
owner on an isolated copy first; do not re-run the historical import/initializer.
Run `node scripts/verify-beta-credentials.mjs` for the in-memory credential and
session checks. A preview must also exercise browser signup/login, existing
account recovery, disablement and host-specific cookies without sending actual
personal data. Only then apply the same migration to the shared database and set
`CONVERSEBETTER_BETA_ACCOUNTS=1` in each agreed deployment.

Beta addresses are unverified login identifiers in a separate table, not
canonical identity or email recovery addresses. The canonical profiles retain a
generated `@beta.conversebetter.invalid` internal identifier and role `user`;
ordinary coordinator visibility/reporting includes these beta profiles, so do not
treat the totals as PA adoption. The cookie is host-only, Secure, HttpOnly and
expires after 24 hours. Do not add a shared domain or enable cross-site signup.
Leave credential tables in place on rollback, unset the flag, and redeploy both
hosts; review outstanding beta sessions before ever re-enabling the flag.
