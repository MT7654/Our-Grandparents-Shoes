import { NextRequest, NextResponse } from "next/server"
import { identity } from "@/lib/neon/auth"
import { betaCookie } from "@/lib/beta/credentials"

function redirectForSession(path: string, req: NextRequest) {
  const response = NextResponse.redirect(new URL(path, req.url))
  response.headers.set("Cache-Control", "private, no-store")
  return response
}

export async function proxy(req: NextRequest) {
  const signIn = req.nextUrl.pathname === "/auth"
  const hasBeta = req.cookies.has(betaCookie)
  const hasManaged = req.cookies.getAll().some(cookie => cookie.name.startsWith("__Secure-neon-auth."))
  if (!hasBeta && !hasManaged) {
    return signIn ? NextResponse.next() : redirectForSession("/auth", req)
  }

  const user = await identity()
  if (signIn) {
    if (user) return redirectForSession(user.role === "admin" ? "/admin" : "/scenarios", req)
    const response = NextResponse.next()
    // Keep the explicit account-switch flow if both identity providers have cookies.
    if (hasBeta && !hasManaged) response.cookies.set(betaCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }
  if (!user) return redirectForSession("/auth", req)
  if (req.nextUrl.pathname.startsWith("/admin") !== (user.role === "admin")) {
    return redirectForSession(user.role === "admin" ? "/admin" : "/scenarios", req)
  }
  return NextResponse.next()
}

export const config = { matcher: ["/auth", "/admin/:path*", "/chat/:path*", "/complete/:path*", "/dashboard/:path*", "/scenarios/:path*"] }
