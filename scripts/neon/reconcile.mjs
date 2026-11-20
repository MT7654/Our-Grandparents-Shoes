import pg from "pg"
import assert from "node:assert/strict"

// Run import-history immediately before this check and after production cutover.
// Abort if source updates have not been applied; never overwrite a live attempt.
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED
})
await db.connect()
try {
  await db.query("begin transaction isolation level repeatable read read only")
  const {
    rows: [snapshot]
  } = await db.query(
    "select hash from cb_history.snapshots order by captured_at desc limit 1"
  )
  for (const table of [
    "profiles",
    "badges",
    "conversations",
    "messages",
    "evaluations",
    "scores",
    "achievements"
  ]) {
    const {
      rows: [fields]
    } = await db.query(
      "select row from cb_history.records where snapshot=$1 and name=$2 limit 1",
      [snapshot.hash, table]
    )
    if (!fields) continue
    const columns = Object.keys(fields.row)
    if (!columns.every((c) => /^[a-z_]+$/.test(c)))
      throw Error("Unexpected column")
    const list = columns.join(",")
    const { rows } = await db.query(
      "select count(*)::int as missing from (select " +
        list +
        " from jsonb_populate_recordset(null::" +
        table +
        ",(select jsonb_agg(row) from cb_history.records where snapshot=$1 and name=$2)) except all select " +
        list +
        " from " +
        table +
        ") diff",
      [snapshot.hash, table]
    )
    assert.equal(rows[0].missing, 0, table + " changed since initial load")
  }
  const {
    rows: [accounts]
  } = await db.query(
    "select count(*)::int as missing from cb_history.records r where snapshot=$1 and name='auth_users' and not exists(select 1 from cb_identity.accounts a where a.id=(r.row->>'id')::uuid and lower(a.email)=lower(r.row->>'email'))",
    [snapshot.hash]
  )
  assert.equal(accounts.missing, 0)
  await db.query("commit")
  console.log(
    "Verified all source records and account UUIDs in the Neon application tables."
  )
} finally {
  await db.end()
}
