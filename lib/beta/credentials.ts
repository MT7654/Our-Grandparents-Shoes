import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto"

export const betaNamespace = "@beta.conversebetter.invalid"
export const betaCookie = "__Host-cb_beta_session"
export const lifetimeSeconds = 24 * 60 * 60
const limitWindowSeconds = 5 * 60
const loginPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z0-9]{2,63}$/
const dummySalt = Buffer.alloc(16, 174)
const dummyDigest = Buffer.alloc(32)

export function normalizeLogin(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null
  const login = value.trim().toLowerCase()
  return loginPattern.test(login) && !login.endsWith(betaNamespace) ? login : null
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 128
}

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (err, key) => err ? reject(err) : resolve(key)))
}

export type Row = Record<string, unknown>
export type BetaDb = { query(text: string, values?: unknown[]): Promise<{ rows: Row[] }> }
export type BetaTransaction = <T>(work: (db: BetaDb) => Promise<T>) => Promise<T>
type Input = { login: string; password: string; name: string; mode: "signup" | "login"; trustedNetwork?: string }
type CookieSession = { token: string; expiresAt: Date }
const eligible = `
  c.account_id=a.id AND a.neon_id IS NULL
  AND a.email=(a.id::text || '@beta.conversebetter.invalid')
  AND NOT a.was_confirmed AND (a.banned_until IS NULL OR a.banned_until <= now())
  AND p.user_id=a.id AND p.role='user'`

async function allowAttempt(tx: BetaTransaction, { login, mode, trustedNetwork }: Input, now: Date) {
  const window = Math.floor(now.getTime() / 1000 / limitWindowSeconds)
  return tx(async (db) => {
    // Narrow limits run before the shared KDF budget; don't create global load
    // from attempts already limited by identifier or trusted ingress.
    const buckets: [string,number][] = []
    if (trustedNetwork) buckets.push([`network:${mode}:${digest(trustedNetwork).toString("hex")}`, mode === "signup" ? 12 : 30])
    buckets.push(
      [`login:${mode}:${digest(login).toString("hex")}`, mode === "signup" ? 4 : 8],
      [`global:${mode}`, mode === "signup" ? 45 : 100]
    )
    let allowed = true
    for (const [bucket, limit] of buckets) {
      const { rows } = await db.query(
        `INSERT INTO cb_beta.rate_buckets(bucket,window_start,attempts) VALUES($1,$2,1)
         ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=cb_beta.rate_buckets.attempts+1
         WHERE cb_beta.rate_buckets.attempts <= $3 RETURNING attempts`,
        [bucket, window, limit])
      if (!rows.length || Number(rows[0].attempts) > limit) {
        allowed = false
        break
      }
    }
    // Bounded per-attempt cleanup; old buckets and expired sessions confer no access in any case.
    await db.query("DELETE FROM cb_beta.rate_buckets WHERE (bucket,window_start) IN (SELECT bucket,window_start FROM cb_beta.rate_buckets WHERE window_start < $1 LIMIT 100 FOR UPDATE SKIP LOCKED)", [window - 2])
    return allowed
  })
}

async function issue(db: BetaDb, account: string, now: Date): Promise<CookieSession> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(now.getTime() + lifetimeSeconds * 1000)
  await db.query(
    "DELETE FROM cb_beta.sessions WHERE account_id=$1 AND expires_at <= now()",
    [account])
  await db.query(
    "INSERT INTO cb_beta.sessions(token_digest,account_id,expires_at) VALUES($1,$2,$3)",
    [digest(token), account, expiresAt])
  return { token, expiresAt }
}

export async function authenticateBeta(tx: BetaTransaction, input: Input, now = new Date()): Promise<CookieSession | null> {
  if (!await allowAttempt(tx, input, now)) return null
  const { login, password, name, mode } = input
  if (mode === "signup") {
    const salt = randomBytes(16)
    const key = await derive(password, salt)
    return tx(async (db) => {
      // Same email key as the existing historical identity linker; beta never takes its UUID.
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [login])
      const { rows } = await db.query(
        `SELECT 1 FROM cb_identity.accounts WHERE lower(email)=$1
         UNION ALL SELECT 1 FROM neon_auth."user" WHERE lower(email)=$1
         UNION ALL SELECT 1 FROM cb_beta.credentials WHERE login_identifier=$1 LIMIT 1`, [login])
      if (rows.length) return null
      const account = randomUUID()
      const internal = account + betaNamespace
      await db.query("INSERT INTO cb_identity.accounts(id,email,was_confirmed) VALUES($1,$2,false)", [account,internal])
      await db.query("INSERT INTO public.profiles(user_id,email,full_name,role) VALUES($1,$2,$3,'user')", [account,internal,name])
      await db.query(
        "INSERT INTO cb_beta.credentials(account_id,login_identifier,password_digest,password_salt) VALUES($1,$2,$3,$4)",
        [account,login,key,salt])
      return issue(db, account, now)
    })
  }
  const record = await tx(async (db) => (await db.query(
    "SELECT password_digest,password_salt FROM cb_beta.credentials WHERE login_identifier=$1", [login])).rows[0])
  const salt = record?.password_salt ? Buffer.from(record.password_salt as Uint8Array) : dummySalt
  const expected = record?.password_digest ? Buffer.from(record.password_digest as Uint8Array) : dummyDigest
  const candidate = await derive(password,salt)
  if (!timingSafeEqual(candidate,expected) || !record) return null
  return tx(async (db) => {
    // Account write lock serializes issuance with coordinator deletion and ban updates.
    const { rows: [account] } = await db.query(
      `SELECT a.id FROM cb_beta.credentials c, cb_identity.accounts a, public.profiles p
       WHERE c.login_identifier=$1 AND c.password_digest=$2 AND ${eligible} FOR UPDATE OF a,p`, [login,candidate])
    return account ? issue(db, account.id as string, now) : null
  })
}

export function validBetaToken(token: string) {
  return /^[a-zA-Z0-9_-]{43}$/.test(token)
}

export async function betaSession(tx: BetaTransaction, token: string) {
  if (!validBetaToken(token)) return null
  const { rows: [row] } = await tx((db) => db.query(
    `SELECT a.id,p.full_name FROM cb_beta.sessions s, cb_beta.credentials c, cb_identity.accounts a, public.profiles p
     WHERE s.token_digest=$1 AND s.expires_at > now() AND s.account_id=c.account_id AND ${eligible}`, [digest(token)]))
  return row ? { id: row.id as string, name: row.full_name as string, role: "user" as const } : null
}

export async function revokeBetaSession(tx: BetaTransaction, token: string) {
  if (validBetaToken(token)) await tx((db) => db.query("DELETE FROM cb_beta.sessions WHERE token_digest=$1", [digest(token)]))
}
