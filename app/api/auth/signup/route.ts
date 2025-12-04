import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, metadata } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user is already logged in
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser) {
      return NextResponse.json(
        { error: 'You are already logged in. Please log out first.' },
        { status: 400 }
      )
    }

    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Check if email already exists (Supabase returns user but no session)
    if (data.user && !data.session) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      {
        message: 'User created successfully',
        user: data.user,
        session: data.session,
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}