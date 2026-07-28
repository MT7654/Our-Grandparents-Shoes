import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.error('Missing Supabase runtime configuration', {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anonKey),
    })

    return NextResponse.json(
      { error: 'Supabase is not configured for this service' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { url, anonKey },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
