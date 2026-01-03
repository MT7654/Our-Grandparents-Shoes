import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { guard } from '@/lib/auth/guard'

export async function POST(request: Request) {
  try {
    const guardResult = await guard('user')

    if (guardResult instanceof NextResponse) {
      return guardResult
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}