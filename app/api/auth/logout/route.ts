import { auth } from "@/lib/neon/auth"
import { betaCookie, revokeBetaSession } from "@/lib/beta/credentials"
import { betaTx, sameOrigin } from "@/lib/beta/runtime"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const jar = await cookies()
  const token = jar.get(betaCookie)?.value
  const managedCookies = jar.getAll().filter(cookie => cookie.name.startsWith("__Secure-neon-auth."))
  if (!sameOrigin(request)) return NextResponse.json({ error: "Unable to sign out" }, { status: 403 })
  if (token) {
    try {
      await revokeBetaSession(betaTx, token)
    } catch {
      return NextResponse.json({ error: "Unable to sign out" }, { status: 503 })
    }
  }
  // Always clear both realms; do not silently switch to whatever identity is left.
  try {
    if (managedCookies.some(cookie => cookie.name === "__Secure-neon-auth.session_token")) {
      const result = await auth().signOut()
      if (result.error) throw Error("Unable to end prior session")
    }
  } catch {
    return NextResponse.json({ error: "Unable to sign out" }, { status: 503 })
  }
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  for (const name of [betaCookie, ...managedCookies.map(cookie => cookie.name)]) {
    response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
  }
  return response
}
