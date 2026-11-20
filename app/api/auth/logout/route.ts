import { auth } from "@/lib/neon/auth"
import { betaCookie, revokeBetaSession } from "@/lib/beta/credentials"
import { betaTx, sameOrigin } from "@/lib/beta/runtime"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const token = (await cookies()).get(betaCookie)?.value
  if (token && !sameOrigin(request)) return NextResponse.json({ error: "Unable to sign out" }, { status: 403 })
  if (token) {
    try {
      await revokeBetaSession(betaTx, token)
    } catch {
      return NextResponse.json({ error: "Unable to sign out" }, { status: 503 })
    }
  }
  // Always clear both realms; do not silently switch to whatever identity is left.
  try {
    const managed = (await cookies()).getAll().some(cookie => cookie.name.startsWith("__Secure-neon-auth."))
    if (!token || managed) {
      const result = await auth().signOut()
      if (result.error) throw Error("Unable to end prior session")
    }
  } catch {
    return NextResponse.json({ error: "Unable to sign out" }, { status: 503 })
  }
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  if (token) response.cookies.set(betaCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
  return response
}
