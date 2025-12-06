import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Set to false to enable authentication (MUST be false for admin protection to work!)
const BYPASS_AUTH_FOR_TESTING = false

// Mock data for testing
const MOCK_USERS = [
  {
    id: 'user-001-mock',
    email: 'john.doe@example.com',
    full_name: 'John Doe',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    last_sign_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    sessions_completed: 5,
    average_score: 78,
  },
  {
    id: 'user-002-mock',
    email: 'jane.smith@example.com',
    full_name: 'Jane Smith',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    last_sign_in_at: new Date().toISOString(), // Today
    sessions_completed: 12,
    average_score: 85,
  },
  {
    id: 'user-003-mock',
    email: 'bob.wilson@example.com',
    full_name: 'Bob Wilson',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    last_sign_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    sessions_completed: 2,
    average_score: 65,
  },
  {
    id: 'user-004-mock',
    email: 'alice.johnson@example.com',
    full_name: 'Alice Johnson',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    last_sign_in_at: null,
    sessions_completed: 0,
    average_score: 0,
  },
]

export async function GET() {
  try {
    // Return mock data when bypass is enabled for testing
    if (BYPASS_AUTH_FOR_TESTING) {
      return NextResponse.json({
        users: MOCK_USERS,
        message: 'Testing mode: Showing mock data. Set BYPASS_AUTH_FOR_TESTING to false for production.'
      })
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user is admin via profiles table role
    // Use service role to bypass RLS for admin check
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let isAdmin = false
    
    if (serviceRoleKey) {
      // Use service role to check admin status (bypasses RLS)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=role`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          }
        }
      )
      if (response.ok) {
        const profiles = await response.json()
        isAdmin = profiles?.[0]?.role === 'admin'
      }
    } else {
      // Fallback: try with user's session (may be blocked by RLS)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      isAdmin = profile?.role === 'admin'
    }
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }
    
    // Try to get users from auth.admin (requires service role)
    if (serviceRoleKey) {
      // Use service role to get all users
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          users: data.users.map((u: any) => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'N/A',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
          }))
        })
      }
    }
    
    // Fallback: Try to get users from a custom 'profiles' table if it exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!profilesError && profiles) {
      return NextResponse.json({
        users: profiles.map((p: any) => ({
          id: p.user_id || p.id,
          email: p.email,
          full_name: p.full_name || 'N/A',
          created_at: p.created_at,
          last_sign_in_at: p.last_sign_in || null,
          sessions_completed: p.no_of_sessions || p.sessions_completed || 0,
          average_score: p.average_score || 0,
        }))
      })
    }
    
    // If no profiles table, return current user info as example
    return NextResponse.json({
      users: [{
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'N/A',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      }],
      message: 'Note: For full user list, configure SUPABASE_SERVICE_ROLE_KEY or create a profiles table'
    })
    
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

