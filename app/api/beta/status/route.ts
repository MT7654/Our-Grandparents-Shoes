import { cookies } from "next/headers"
import { betaCookie } from "@/lib/beta/credentials"
import { betaEnabled } from "@/lib/beta/runtime"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ enabled: betaEnabled(), betaSessionPresent: (await cookies()).has(betaCookie) }, { headers: { "Cache-Control": "no-store" } })
}
