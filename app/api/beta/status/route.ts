import { cookies } from "next/headers"
import { betaCookie, betaSession } from "@/lib/beta/credentials"
import { betaEnabled, betaTx } from "@/lib/beta/runtime"
import { NextResponse } from "next/server"

export async function GET() {
  const jar = await cookies()
  const token = jar.get(betaCookie)?.value
  const enabled = betaEnabled()
  const active = Boolean(enabled && token && await betaSession(betaTx, token))
  const needsAccountSwitch = Boolean(token && !active && jar.getAll().some(cookie => cookie.name.startsWith("__Secure-neon-auth.")))
  const response = NextResponse.json({ enabled, active, needsAccountSwitch }, { headers: { "Cache-Control": "no-store" } })
  if (token && !active && !needsAccountSwitch) response.cookies.set(betaCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
  return response
}
