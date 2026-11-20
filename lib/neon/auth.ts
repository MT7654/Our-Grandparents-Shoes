import { createNeonAuth } from "@neondatabase/auth/next/server"
import { cache } from "react"
import { cookies } from "next/headers"
import { betaCookie, betaNamespace, betaSession } from "@/lib/beta/credentials"
import { betaEnabled, betaTx } from "@/lib/beta/runtime"
import { transaction } from "./pool"
export const auth = () =>
  createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! }
  })

// Only server-verified Neon sessions can acquire an application identity.
// Keep the immutable historical UUID separate from the new provider subject.
export const identity = cache(async () => {
  const token = (await cookies()).get(betaCookie)?.value
  if (token) return betaEnabled() ? betaSession(betaTx, token) : null
  const { data } = await auth().getSession()
  if (!data?.user?.emailVerified) return null
  const { id: subject, email, name } = data.user
  if (email.toLowerCase().endsWith(betaNamespace)) return null
  return transaction(null, async (db) => {
    await db.query(
      "select pg_advisory_xact_lock(hashtextextended(lower($1),0))",
      [email]
    )
    // A cached session must not recreate an account removed by its coordinator.
    const active = await db.query('select 1 from neon_auth."user" where id=$1 and "emailVerified" and lower(email)=lower($2)',[subject,email])
    if (!active.rowCount) return null
    const {
      rows: [account]
    } = await db.query(
      "select id,email,neon_id,banned_until from cb_identity.accounts where neon_id=$1 or lower(email)=lower($2) order by (neon_id=$1) desc nulls last limit 1 for update",
      [subject, email]
    )
    if (account?.banned_until && new Date(account.banned_until) > new Date())
      return null
    if (account?.neon_id && account.neon_id !== subject) return null
    let uid = account?.id
    if (!account) {
      const {
        rows: [created]
      } = await db.query(
        "insert into cb_identity.accounts(id,email,neon_id,was_confirmed) values(gen_random_uuid(),$1,$2,true) returning id",
        [email, subject]
      )
      uid = created.id
      await db.query(
        "insert into profiles(user_id,email,full_name,role) values($1,$2,$3,'user')",
        [uid, email, name]
      )
    } else if (!account.neon_id) {
      await db.query("update cb_identity.accounts set neon_id=$1 where id=$2", [
        subject,
        uid
      ])
    }
    const {
      rows: [profile]
    } = await db.query(
      "select user_id,role,full_name from profiles where user_id=$1",
      [uid]
    )
    return profile
      ? {
          id: uid as string,
          role: profile.role as "admin" | "user",
          name: profile.full_name as string
        }
      : null
  })
})
