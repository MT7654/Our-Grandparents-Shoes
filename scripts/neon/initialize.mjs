import { PGlite } from "@electric-sql/pglite"
import pg from "pg"
import { readFileSync, readdirSync } from "node:fs"
import assert from "node:assert/strict"

// Replay the Supabase migration history only in an empty, in-memory database.
// Materialize its final schema in Neon, so historical DROP/DELETE never reach Neon.
const schema = new PGlite()
await schema.exec(
  "create role anon;create role authenticated;create role supabase_auth_admin;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$"
)
for (const f of readdirSync("supabase/migrations").sort())
  await schema.exec(readFileSync("supabase/migrations/" + f, "utf8"))
const urls = new URL(process.env.DATABASE_URL_UNPOOLED)
if (!urls.hostname.endsWith(".neon.tech")) throw Error("Expected Neon")
const db = new pg.Client({ connectionString: urls.href })
await db.connect()
const query = async (sql, args) => (await schema.query(sql, args)).rows
const ddl = (sql) =>
  db.query(
    sql
      .replaceAll(/\bauth\.users\b/g, "cb_identity.accounts")
      .replaceAll(/\bauth\.uid\(\)/g, "cb_identity.uid()")
  )
const tables = (
  await query(
    "select tablename from pg_tables where schemaname='public' order by tablename"
  )
).map((r) => r.tablename)
try {
  await db.query("begin")
  if ((await db.query("select to_regclass('public.profiles') as t")).rows[0].t)
    throw Error("Destination already initialized")
  const hash = (
    await db.query(
      "select hash from cb_history.snapshots order by captured_at desc limit 1"
    )
  ).rows[0].hash
  await db.query(
    "create schema cb_identity;create role cb_member nologin;grant cb_member to current_user; create table cb_identity.accounts(id uuid primary key, email text,was_confirmed boolean not null default false,neon_id text unique, banned_until timestamptz);create unique index account_email on cb_identity.accounts(lower(email)) where email is not null;create function cb_identity.uid() returns uuid stable language sql as $$select nullif(current_setting('cb.user_id',true),'')::uuid$$;grant usage on schema cb_identity to cb_member;grant execute on function cb_identity.uid() to cb_member"
  )
  await db.query(
    "insert into cb_identity.accounts(id,email,was_confirmed,banned_until) select (row->>'id')::uuid,nullif(row->>'email',''),row->>'email_confirmed_at' is not null,(row->>'banned_until')::timestamptz from cb_history.records where snapshot=$1 and name='auth_users'",
    [hash]
  )
  for (const e of await query(
    "select t.typname,array_agg(quote_literal(enumlabel) order by enumsortorder) as labels from pg_type t join pg_enum e on e.enumtypid=t.oid group by t.typname"
  ))
    await ddl(
      "create type " + e.typname + " as enum(" + e.labels.join(",") + ")"
    )
  for (const t of tables) {
    const cols = await query(
      "select attname,format_type(atttypid,atttypmod) typ,attnotnull,pg_get_expr(adbin,adrelid) def from pg_attribute left join pg_attrdef on adrelid=attrelid and adnum=attnum where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum",
      [t]
    )
    const fields = cols.map(
      (c) =>
        c.attname +
        " " +
        (c.def?.startsWith("nextval(")
          ? "bigserial"
          : c.typ + (c.def ? " default " + c.def : "")) +
        (c.attnotnull ? " not null" : "")
    )
    await ddl("create table " + t + "(" + fields.join(",") + ")")
    const records = (
      await db.query(
        "select row from cb_history.records where name=$1 and snapshot=$2",
        [t, hash]
      )
    ).rows
    if (records.length) {
      const names = Object.keys(records[0].row)
      if (!names.every((n) => cols.some((c) => c.attname === n)))
        throw Error("Unknown source column in " + t)
      await db.query(
        "insert into " +
          t +
          "(" +
          names.join(",") +
          ") select " +
          names.join(",") +
          " from jsonb_populate_recordset(null::" +
          t +
          ",$1)",
        [JSON.stringify(records.map((r) => r.row))]
      )
      // Compare every source field using its original PostgreSQL column type.
      const diff = await db.query(
        "select " +
          names.join(",") +
          " from jsonb_populate_recordset(null::" +
          t +
          ",$1) except all select " +
          names.join(",") +
          " from " +
          t,
        [JSON.stringify(records.map((r) => r.row))]
      )
      assert.equal(diff.rowCount, 0, t + " reconciliation")
      assert.equal(
        Number((await db.query("select count(*) from " + t)).rows[0].count),
        records.length
      )
    }
  }
  await db.query(
    "select setval(pg_get_serial_sequence('profiles','id'),coalesce(max(id),1),count(*)>0) from profiles"
  )
  for (const c of await query(
    "select conrelid::regclass::text t,conname,pg_get_constraintdef(oid) def from pg_constraint where connamespace='public'::regnamespace and contype in ('p','u','f','c') order by (contype='f')"
  ))
    await ddl(
      "alter table " + c.t + " add constraint " + c.conname + " " + c.def
    )
  for (const i of await query(
    "select indexdef from pg_indexes i where schemaname='public' and not exists(select 1 from pg_constraint c where c.conindid=to_regclass(i.indexname))"
  ))
    await ddl(i.indexdef)
  for (const v of await query(
    "select viewname,definition from pg_views where schemaname='public'"
  ))
    await ddl(
      "create view " +
        v.viewname +
        " with(security_invoker=true) as " +
        v.definition
    )
  for (const f of await query(
    "select proname,pg_get_functiondef(oid) def from pg_proc where pronamespace='public'::regnamespace and proname not in ('custom_access_token_hook','handle_new_user')"
  ))
    await ddl(f.def)
  for (const trg of await query(
    "select pg_get_triggerdef(t.oid) def from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and not tgisinternal"
  ))
    await ddl(trg.def)
  for (const t of tables)
    await ddl("alter table " + t + " enable row level security")
  for (const p of await query(
    "select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and not ('supabase_auth_admin'=any(roles))"
  ))
    await ddl(
      'create policy "' +
        p.policyname +
        '" on ' +
        p.tablename +
        " for " +
        p.cmd +
        " to cb_member" +
        (p.qual ? " using (" + p.qual + ")" : "") +
        (p.with_check ? " with check (" + p.with_check + ")" : "")
    )
  await db.query(
    "revoke all on all functions in schema public from public;grant usage on schema public to cb_member;grant select on all tables in schema public to cb_member;grant insert,update on conversations,messages,visit_cohorts,visit_memberships,visit_assignments,visit_recipients,visit_retries,visit_reflections to cb_member;grant update(full_name,last_active) on profiles to cb_member;grant execute on function public.is_admin(uuid),public.practice_usage(date,date,scenario_name,uuid),public.snapshot_visit_recipients() to cb_member"
  )
  await db.query("commit")
  console.log(
    "Neon relational schema initialized and all seven historical tables reconciled."
  )
} catch (e) {
  await db.query("rollback")
  console.error(e.code ?? "", e.message)
  process.exitCode = 1
} finally {
  await db.end()
  await schema.close()
}
