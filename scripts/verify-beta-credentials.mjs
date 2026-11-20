import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { authenticateBeta, betaSession, normalizeLogin, revokeBetaSession, validPassword } from "../lib/beta/credentials.ts"

const db = new PGlite()
await db.exec(`
  CREATE ROLE cb_member NOLOGIN;
  CREATE SCHEMA cb_identity;
  CREATE TABLE cb_identity.accounts(id UUID PRIMARY KEY, email TEXT, was_confirmed BOOLEAN NOT NULL DEFAULT FALSE, neon_id TEXT UNIQUE, banned_until TIMESTAMPTZ);
  CREATE UNIQUE INDEX account_email ON cb_identity.accounts(lower(email)) WHERE email IS NOT NULL;
  CREATE TABLE public.profiles(user_id UUID PRIMARY KEY REFERENCES cb_identity.accounts(id) ON DELETE CASCADE, email TEXT, full_name TEXT, role TEXT);
  CREATE SCHEMA neon_auth;
  CREATE TABLE neon_auth."user" (id TEXT PRIMARY KEY, email TEXT, "emailVerified" BOOLEAN);
  INSERT INTO cb_identity.accounts(id,email,was_confirmed) VALUES ('00000000-0000-4000-8000-000000000001','Existing@example.com',true),('00000000-0000-4000-8000-000000000002','Coordinator@example.com',true);
  INSERT INTO public.profiles VALUES ('00000000-0000-4000-8000-000000000002','Coordinator@example.com','Coordinator','admin');
  INSERT INTO neon_auth."user" VALUES ('provider-id','unlinked@example.com',false);
`)
await db.exec(readFileSync("db/migrations/20261120093000_beta_volunteer_credentials.sql","utf8"))
const tx = work => db.transaction(work)
const password = "long-only-test-password"
function auth(email, mode = "signup", override = password) {
  return authenticateBeta(tx, {login:normalizeLogin(email),password:override,name:"Fixture volunteer",mode})
}
assert.equal(normalizeLogin("  Burner@Example.com  "), "burner@example.com")
assert.equal(normalizeLogin("alias@beta.conversebetter.invalid"), null)
assert.equal(validPassword("tooshort"),false)
assert.equal(validPassword("長".repeat(60)),false)
assert.equal(validPassword(password),true)
for (const existing of ["Existing@example.com", "Coordinator@example.com", "unlinked@example.com"]) {
  assert.equal(await auth(existing),null,"existing managed or historical email can't become a beta credential")
}
const concurrent = await Promise.all([auth("Burner@Example.com"),auth("burner@example.com")])
assert.equal(concurrent.filter(Boolean).length,1)
const born = concurrent.find(Boolean)
const firstIdentity = await betaSession(tx,born.token)
assert.equal(firstIdentity.role,"user")
assert.equal(firstIdentity.name,"Fixture volunteer")
const {rows:[account]}=await db.query("SELECT * FROM cb_identity.accounts WHERE id=$1",[firstIdentity.id])
assert.equal(account.email,firstIdentity.id+"@beta.conversebetter.invalid")
assert.equal(account.was_confirmed,false)
assert.equal(account.neon_id,null)
assert.equal(await auth("burner@example.com","login","wrong-password-long"),null)
assert.equal(await auth("nothing@example.com","login"),null)
const signed = await auth("burner@example.com","login")
assert.ok(signed)
assert.notEqual(signed.token,born.token)
assert.deepEqual(await betaSession(tx,signed.token),firstIdentity)
assert.equal(await betaSession(tx,"malformed"),null)
await revokeBetaSession(tx,signed.token)
assert.equal(await betaSession(tx,signed.token),null)
const tokenHash=createHash("sha256").update(born.token).digest()
await db.query("UPDATE cb_beta.sessions SET expires_at=now()-interval '1 minute' WHERE token_digest=$1",[tokenHash])
assert.equal(await betaSession(tx,born.token),null)
const newer=await auth("burner@example.com","login")
await db.query("UPDATE cb_identity.accounts SET banned_until=now()+interval '1 day' WHERE id=$1",[firstIdentity.id])
assert.equal(await betaSession(tx,newer.token),null)
assert.equal(await auth("burner@example.com","login"),null)
await db.query("UPDATE cb_identity.accounts SET banned_until=NULL WHERE id=$1",[firstIdentity.id])
await db.query("UPDATE public.profiles SET role='admin' WHERE user_id=$1",[firstIdentity.id])
assert.equal(await betaSession(tx,newer.token),null)
assert.equal(await auth("burner@example.com","login"),null)
await db.query("UPDATE public.profiles SET role='user' WHERE user_id=$1",[firstIdentity.id])
await db.exec(`INSERT INTO neon_auth."user" VALUES ('rightful','burner@example.com',true)`)
assert.deepEqual(await betaSession(tx,newer.token),firstIdentity,"later verified Neon identity does not inherit or invalidate separate beta history")
await db.query("DELETE FROM cb_identity.accounts WHERE id=$1",[firstIdentity.id])
assert.equal(await betaSession(tx,newer.token),null)
assert.equal((await db.query("SELECT * FROM cb_beta.credentials")).rows.length,0)
assert.equal((await db.query("SELECT * FROM cb_beta.sessions")).rows.length,0)
assert.equal(await auth("burner@example.com"),null,"deleted address already belongs to verified Neon identity")
for(let n=0;n<9;n++) await auth("rate@example.com","login")
const {rows:[limit]} = await db.query("SELECT attempts FROM cb_beta.rate_buckets WHERE bucket LIKE 'login:login:%' AND attempts=9")
assert.equal(limit.attempts,9,"block after 8 targeted attempts")
await db.exec("SET ROLE cb_member")
await assert.rejects(db.query("SELECT * FROM cb_beta.credentials"), /permission denied/)
await db.close()
console.log("Beta auth fixtures passed: collisions, concurrent signup, session lifecycle, ordinary role, separation and protected tables.")
