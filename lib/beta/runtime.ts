import { isIP } from "node:net"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { transaction } from "@/lib/neon/pool"
import { authenticateBeta, betaCookie, normalizeLogin, revokeBetaSession, validPassword, type BetaTransaction } from "./credentials"

export const betaEnabled = () => process.env.CONVERSEBETTER_BETA_ACCOUNTS === "1"
export const betaTx: BetaTransaction = (work) => transaction(null, work)

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  // Next may construct Request.url from the worker's internal authority.
  // Host is the HTTP authority, not an arbitrary client-supplied forwarded URL.
  const host = request.headers.get("host")
  if (!origin || !host || !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/i.test(host)) return false
  try {
    const protocol = process.env.VERCEL === "1" ? "https:" : new URL(request.url).protocol
    return (protocol === "http:" || protocol === "https:") && origin === new URL(protocol + "//" + host).origin
  } catch {
    return false
  }
}
const headers = { "Cache-Control": "no-store" }
const generic = "Unable to finish beta sign-in. Check your details or use existing account sign-in or recovery."
const reject = (status: number) => NextResponse.json({ error: generic }, { status, headers })

async function boundedJson(request: Request): Promise<Record<string,unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json" || !request.body) return null
  const reader = request.body.getReader()
  const chunks: Buffer[] = []
  let length = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 4096) {
      await reader.cancel()
      return null
    }
    chunks.push(Buffer.from(value))
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"))
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
}

export async function betaRequest(request: Request, mode: "signup" | "login", endManagedSession: () => Promise<void>) {
  if (!betaEnabled()) return reject(404)
  if (!sameOrigin(request)) return reject(403)
  try {
    const cookieStore = await cookies()
    if (cookieStore.has(betaCookie)) return reject(400)
    const body = await boundedJson(request)
    const login = normalizeLogin(body?.email)
    const password = body?.password
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    if (!login || !validPassword(password) ||
      (mode === "signup" && (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name) || body?.consent !== true))) return reject(400)
    // Only Vercel's trusted ingress header is used. Never take plain XFF from callers.
    const ingress = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined
    const trustedNetwork = ingress && isIP(ingress) ? ingress : undefined
    const session = await authenticateBeta(betaTx, { login,password,name,mode,trustedNetwork })
    if (!session) return reject(400)
    // Do not allow the browser to resume a previous managed identity when beta expires.
    if (cookieStore.getAll().some(cookie => cookie.name.startsWith("__Secure-neon-auth."))) {
      try {
        await endManagedSession()
      } catch {
        await revokeBetaSession(betaTx, session.token)
        return reject(400)
      }
    }
    const response = NextResponse.json({ ok: true }, { headers })
    response.cookies.set(betaCookie, session.token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: session.expiresAt
    })
    return response
  } catch {
    return reject(400)
  }
}
