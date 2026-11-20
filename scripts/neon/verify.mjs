import pg from "pg"
import assert from "node:assert/strict"
const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
try {
  await db.query("begin")
  const {
    rows: [session]
  } = await db.query(
    "select uid,vid from conversations where exists(select 1 from messages m where m.vid=conversations.vid) limit 1"
  )
  const expected = (
    await db.query("select count(*)::int n from messages where vid=$1", [
      session.vid
    ])
  ).rows[0].n
  const {
    rows: [other]
  } = await db.query(
    "select user_id from profiles where role='user' and user_id<>$1 limit 1",
    [session.uid]
  )
  const {
    rows: [admin]
  } = await db.query("select user_id from profiles where role='admin' limit 1")
  await db.query("set local role cb_member")
  await db.query("select set_config('cb.user_id',$1,true)", [session.uid])
  assert.equal(
    (
      await db.query("select count(*)::int n from messages where vid=$1", [
        session.vid
      ])
    ).rows[0].n,
    expected
  )
  await db.query("select set_config('cb.user_id',$1,true)", [other.user_id])
  assert.equal(
    (
      await db.query("select count(*)::int n from messages where vid=$1", [
        session.vid
      ])
    ).rows[0].n,
    0
  )
  assert.equal(
    (
      await db.query(
        "select has_schema_privilege(current_user,'cb_history','USAGE') ok"
      )
    ).rows[0].ok,
    false
  )
  await db.query("select set_config('cb.user_id',$1,true)", [admin.user_id])
  assert.equal(
    (
      await db.query("select count(*)::int n from messages where vid=$1", [
        session.vid
      ])
    ).rows[0].n,
    expected
  )
  const result = await db.query(
    "select * from practice_usage('2026-01-01','2026-11-20')"
  )
  assert.equal(result.rows.filter((r) => r.kind === "period").length, 1)
  await db.query("rollback")
  console.log(
    "Neon pooled connection, owner and coordinator transcript access, cross-user isolation and reporting passed."
  )
} finally {
  await db.end()
}
