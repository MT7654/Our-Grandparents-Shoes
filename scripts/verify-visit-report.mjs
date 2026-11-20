import { PGlite } from "@electric-sql/pglite"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
const db = new PGlite()
const admin = "00000000-0000-4000-8000-000000000000"
await db.exec(`create schema auth;create role anon;create role authenticated;create role supabase_auth_admin;create role service_role;
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('test.uid',true),''),'${admin}')::uuid $$;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);`)
for (const file of readdirSync("supabase/migrations").sort()) {
  try {
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"))
  } catch (e) {
    throw Error(file + ": " + e.message)
  }
}
await db.exec(`insert into auth.users(id) values('${admin}');update profiles set role='admin';
insert into auth.users(id) select gen_random_uuid() from generate_series(1,10);
update profiles set created_at='2026-01-01';
insert into conversations(uid,scenario_name,turns) select user_id,(array['House Visit','Emotional Listening Ear','Resolve a Task','House Visit']::scenario_name[])[row_number() over(order by user_id)],10 from profiles where role='user' order by user_id limit 4;
insert into messages(vid,sender,content,sent_at) select vid,'user',scenario_name::text,'2026-10-04' from conversations order by uid limit 3;
insert into messages(vid,sender,content,sent_at) select vid,'user','Resume','2026-09-30T15:59Z' from conversations order by uid limit 1;
insert into messages(vid,sender,content,sent_at) select vid,'persona','Idle opening','2026-10-05' from conversations;
insert into visit_retries(id,vid,choice,outcome) select gen_random_uuid(),vid,'retry','comparison' from conversations;
`)
const { rows } = await db.query(
  "select * from practice_usage('2026-08-01','2026-10-31')"
)
const total = rows.find((r) => r.kind === "period")
assert.equal(total.participants, 3)
assert.equal(total.eligible, 10)
assert.equal(total.sessions, 3)
assert.deepEqual(
  rows.filter((r) => r.kind === "month").map((r) => r.sessions),
  [0, 1, 3]
)
console.log(
  "All migrations applied. Participation: 3 of 10 (30%). Monthly sessions: 0, 1, 3."
)
const {
  rows: [attempt]
} = await db.query("select vid,uid from conversations order by uid limit 1")
const {
  rows: [previous]
} = await db.query(
  "select mid from messages where vid=$1 order by sent_at desc limit 1",
  [attempt.vid]
)
const turn = crypto.randomUUID()
const args = [
  attempt.uid,
  attempt.vid,
  turn,
  previous.mid,
  "Sit quietly",
  "Stay for the song.",
  "Sit quietly",
  "resolution",
  true
]
const commit = "select commit_visit_turn($1,$2,$3,$4,$5,$6,$7,$8,$9) as receipt"
const first = (await db.query(commit, args)).rows[0].receipt
const second = (await db.query(commit, args)).rows[0].receipt
assert.deepEqual(first, second)
const verdict = {
  expression: "worried",
  sentiment: "neutral",
  status: "good",
  feedback: "You gave her room.",
  suggestion: "Follow her lead.",
  rapportChange: 5
}
const assess = "select assess_visit_turn($1,$2,$3,$4,$5) as assessment"
const input = [
  attempt.vid,
  turn,
  first.persona_message.mid,
  JSON.stringify(verdict),
  0
]
assert.deepEqual(
  (await db.query(assess, input)).rows,
  (await db.query(assess, input)).rows
)
const cohort = (
  await db.query(
    "insert into visit_cohorts(name) values('Test cohort') returning id"
  )
).rows[0].id
await db.query("insert into visit_memberships(cohort_id,uid) values($1,$2)", [
  cohort,
  attempt.uid
])
const assignment = (
  await db.query(
    "insert into visit_assignments(cohort_id,scenarios,difficulty,due_date) values($1,array['House Visit','Resolve a Task']::scenario_name[],'Easy',current_date) returning id",
    [cohort]
  )
).rows[0].id
await db.query(
  "update visit_memberships set left_at=now() where cohort_id=$1",
  [cohort]
)
assert.equal(
  (
    await db.query("select uid from visit_recipients where assignment_id=$1", [
      assignment
    ])
  ).rows[0].uid,
  attempt.uid
)
console.log(
  "Turn and assessment replay are idempotent. Assignment snapshot survives departure."
)
await db.query(
  "insert into visit_reflections(vid,body) values($1,'Private note')",
  [attempt.vid]
)
await db.exec(
  "grant usage on schema auth to authenticated;grant select on all tables in schema public to authenticated;set role authenticated"
)
assert.equal((await db.query("select * from visit_reflections")).rows.length, 0)
await db.query("select set_config('test.uid',$1,false)", [attempt.uid])
assert.equal((await db.query("select * from visit_reflections")).rows.length, 1)
assert.equal((await db.query("select * from visit_assignments")).rows.length, 1)
await db.query("select set_config('test.uid',$1,false)", [crypto.randomUUID()])
assert.equal((await db.query("select * from visit_reflections")).rows.length, 0)
assert.equal((await db.query("select * from visit_assignments")).rows.length, 0)
assert.equal(
  (await db.query("select * from conversations where vid=$1", [attempt.vid]))
    .rows.length,
  0
)
console.log("Owner, coordinator and other-volunteer visibility checks passed.")
await db.close()
