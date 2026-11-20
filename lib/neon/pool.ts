import { Pool, types, type PoolClient } from "pg"

// Keep SQL calendar dates independent of the Vercel worker timezone.
types.setTypeParser(1082, (value) => value)
let shared: Pool | undefined
export function pool() {
  if (!process.env.DATABASE_URL) throw Error("Neon database is not configured")
  return (shared ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 15000
  }))
}
export async function transaction<T>(
  uid: string | null,
  work: (client: PoolClient) => Promise<T>
) {
  const client = await pool().connect()
  try {
    await client.query("begin")
    if (uid !== null) {
      await client.query("set local role cb_member")
      await client.query("select set_config('cb.user_id',$1,true)", [uid])
    }
    const value = await work(client)
    await client.query("commit")
    return value
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}
