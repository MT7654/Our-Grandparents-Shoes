import { NextRequest, NextResponse } from "next/server"
import { identity } from "@/lib/neon/auth"
import { betaCookie } from "@/lib/beta/credentials"

export async function proxy(req: NextRequest) {
  const signIn = req.nextUrl.pathname === "/auth"
  const hasBeta = req.cookies.has(betaCookie)
  const hasManaged = req.cookies.getAll().some(cookie => cookie.name.startsWith("__Secure-neon-auth."))
  if (signIn && !hasBeta && !hasManaged) return NextResponse.next()

  const user = await identity()
  if (signIn) {
    if (user) return NextResponse.redirect(new URL(user.role === "admin" ? "/admin" : "/scenarios", req.url))
    const response = NextResponse.next()
    // Keep the explicit account-switch flow if both identity providers have cookies.
    if (hasBeta && !hasManaged) response.cookies.set(betaCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }
  if (!user) return NextResponse.redirect(new URL("/auth", req.url))
  if (req.nextUrl.pathname.startsWith("/admin") !== (user.role === "admin")) {
    return NextResponse.redirect(new URL(user.role === "admin" ? "/admin" : "/scenarios", req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ["/auth", "/admin/:path*", "/chat/:path*", "/complete/:path*", "/dashboard/:path*", "/scenarios/:path*"] }
