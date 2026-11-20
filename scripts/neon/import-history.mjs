import { createClient } from "@supabase/supabase-js"
import pg from "pg"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

// This importer never writes to the source. Store immutable, reconciled snapshots
// inside a private schema of the designated ConverseBetter Neon project.
const source = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const url = new URL(process.env.DATABASE_URL_UNPOOLED)
if (!url.hostname.endsWith(".neon.tech"))
  throw Error("Expected a direct Neon connection")
const db = new pg.Client({ connectionString: url.href })
const keys = {
  profiles: ["id"],
  badges: ["bid"],
  conversations: ["vid"],
  messages: ["vid", "mid"],
  evaluations: ["eid"],
  scores: ["vid", "metric_name"],
  achievements: ["bid", "uid"]
}
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical)
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical(v[k])])
    )
  return v
}
const digest = (v) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex")
async function inventory() {
  const records = []
  for (const [name, pk] of Object.entries(keys)) {
    for (let offset = 0; ; offset += 500) {
      let q = source.from(name).select("*")
      for (const k of pk) q = q.order(k)
      const { data, error } = await q.range(offset, offset + 499)
      if (error) throw Error("Could not read " + name)
      for (const row of data)
        records.push({ name, id: JSON.stringify(pk.map((k) => row[k])), row })
      if (data.length < 500) break
    }
  }
  for (let page = 1; ; page++) {
    const { data, error } = await source.auth.admin.listUsers({
      page,
      perPage: 100
    })
    if (error) throw Error("Could not inventory identities")
    for (const u of data.users) {
      // Preserve stable identity, confirmation state and dates, excluding sessions and tokens.
      const row = Object.fromEntries(
        [
          "id",
          "email",
          "phone",
          "email_confirmed_at",
          "phone_confirmed_at",
          "created_at",
          "last_sign_in_at",
          "app_metadata",
          "user_metadata",
          "banned_until",
          "is_anonymous"
        ]
          .filter((k) => u[k] !== undefined)
          .map((k) => [k, u[k]])
      )
      records.push({ name: "auth_users", id: JSON.stringify([u.id]), row })
    }
    if (data.users.length < 100) break
  }
  return records.sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  )
}
await db.connect()
try {
  const records = await inventory()
  const hash = digest(records)
  await db.query("begin")
  await db.query(
    "create schema if not exists cb_history; revoke all on schema cb_history from public; create table if not exists cb_history.snapshots(hash text primary key, captured_at timestamptz not null default now());create table if not exists cb_history.records(snapshot text references cb_history.snapshots, name text, id text, row jsonb not null,primary key(snapshot,name,id));revoke all on all tables in schema cb_history from public"
  )
  await db.query(
    "insert into cb_history.snapshots(hash) values($1) on conflict do nothing",
    [hash]
  )
  await db.query(
    "insert into cb_history.records select $1,r.* from jsonb_to_recordset($2) r(name text,id text,row jsonb) on conflict do nothing",
    [hash, JSON.stringify(records)]
  )
  const { rows } = await db.query(
    "select name,id,row from cb_history.records where snapshot=$1",
    [hash]
  )
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  assert.equal(digest(rows), hash, "Destination record mismatch")
  assert.equal(
    digest(await inventory()),
    hash,
    "Source changed during migration. Retry."
  )
  await db.query("commit")
  for (const [name, group] of Object.entries(
    Object.groupBy(rows, (r) => r.name)
  ))
    console.log(name, group.length)
  console.log("Verified private Neon snapshot", hash)
} catch (e) {
  await db.query("rollback")
  throw e
} finally {
  await db.end()
}
