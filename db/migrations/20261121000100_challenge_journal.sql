alter table public.conversations
  add column if not exists challenge_id text,
  add column if not exists skill_report jsonb,
  add column if not exists skill_flag boolean not null default false;
alter table public.visit_assignments add column if not exists challenge_id text;
