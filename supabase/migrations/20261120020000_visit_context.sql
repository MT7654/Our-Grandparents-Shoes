create table public.visit_cohorts (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120)
);
create table public.visit_memberships (
 id uuid primary key default gen_random_uuid(), cohort_id uuid not null references public.visit_cohorts,
 uid uuid not null references auth.users on delete cascade, joined_at timestamptz not null default now(),
 left_at timestamptz check(left_at>=joined_at)
);
create unique index visit_current_membership on public.visit_memberships(cohort_id,uid) where left_at is null;
create table public.visit_assignments (
 id uuid primary key default gen_random_uuid(), cohort_id uuid not null references public.visit_cohorts,
 scenarios public.scenario_name[] not null check(cardinality(scenarios) between 1 and 3),
 difficulty public.difficulty_level not null, due_date date not null
);
create table public.visit_recipients (
 assignment_id uuid references public.visit_assignments on delete cascade,
 uid uuid references auth.users on delete cascade, primary key(assignment_id,uid)
);
alter table public.visit_cohorts enable row level security;
alter table public.visit_memberships enable row level security;
alter table public.visit_assignments enable row level security;
alter table public.visit_recipients enable row level security;
create policy coordinator on public.visit_cohorts for all to authenticated using(is_admin(auth.uid())) with check(is_admin(auth.uid()));
create policy coordinator on public.visit_memberships for all to authenticated using(is_admin(auth.uid())) with check(is_admin(auth.uid()));
create policy coordinator on public.visit_assignments for all to authenticated using(is_admin(auth.uid())) with check(is_admin(auth.uid()));
create policy coordinator on public.visit_recipients for all to authenticated using(is_admin(auth.uid())) with check(is_admin(auth.uid()));
create policy recipient on public.visit_recipients for select to authenticated using(uid=auth.uid());
create policy recipient on public.visit_assignments for select to authenticated using(exists(select 1 from public.visit_recipients r where r.assignment_id=id and r.uid=auth.uid()));
create function public.snapshot_visit_recipients() returns trigger language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
 insert into visit_recipients(assignment_id,uid) select new.id,m.uid from visit_memberships m
 join profiles p on p.user_id=m.uid and p.role='user' where m.cohort_id=new.cohort_id and m.left_at is null;
 return new;
end $$;
create trigger snapshot_recipients after insert on public.visit_assignments for each row execute function public.snapshot_visit_recipients();
alter table public.conversations add column practice_context text not null default 'standalone';
drop index public.unique_active_conversation;
create unique index unique_active_conversation on public.conversations(uid,scenario_name,practice_context) where completed=false;
create table public.visit_reflections(
 vid uuid primary key references public.conversations on delete cascade, body text not null check(length(body)<=4000)
);
create table public.visit_retries(
 id uuid primary key, vid uuid not null references public.conversations on delete cascade, choice text not null, outcome text not null, created_at timestamptz not null default now()
);
alter table public.visit_reflections enable row level security;
alter table public.visit_retries enable row level security;
create policy owner on public.visit_reflections for all to authenticated using(exists(select 1 from conversations c where c.vid=visit_reflections.vid and c.uid=auth.uid())) with check(exists(select 1 from conversations c where c.vid=visit_reflections.vid and c.uid=auth.uid()));
create policy owner on public.visit_retries for all to authenticated using(exists(select 1 from conversations c where c.vid=visit_retries.vid and c.uid=auth.uid())) with check(exists(select 1 from conversations c where c.vid=visit_retries.vid and c.uid=auth.uid()));
