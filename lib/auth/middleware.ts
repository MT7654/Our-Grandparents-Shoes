import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const userPaths = ['/scenarios', '/dashboard', '/complete', '/chat']
const adminPaths = ['/admin']

export async function validatePath(request: NextRequest) {
    const path = request.nextUrl.pathname
    const redirectUrl = new URL('/', request.url)
    const isUserProtected = userPaths.some((p) => path.startsWith(p))
    const isAdminProtected = adminPaths.some((p) => path.startsWith(p))
    const isProtected = isUserProtected || isAdminProtected

    if (isProtected) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll() {}, // No-op for validation check
                },
            },
        )

        const { data: { session }, error } = await supabase.auth.getSession() 

        if (error || !session) {
            return NextResponse.redirect(redirectUrl)
        }

        // Check Role - try JWT token first
        let role: string | null = null
        try {
            if (session.access_token) {
                const payload = JSON.parse(atob(session.access_token.split('.')[1]))
                role = payload['user_role'] || null
            }
        } catch (e) {
            console.error('Error parsing JWT token in middleware:', e)
        }

        // If role not in token, fetch from database
        if (!role && session.user) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single()
                
                if (profile) {
                    role = profile.role
                }
            } catch (e) {
                console.error('Error fetching role from database in middleware:', e)
            }
        }

        // Default to 'user' if role is still null (new users default to user role)
        if (!role) {
            role = 'user'
        }

        if (isAdminProtected && role !== 'admin') {
            return NextResponse.redirect(redirectUrl)
        }
        if (isUserProtected && role !== 'user') {
            return NextResponse.redirect(redirectUrl)
        }
    }

    return NextResponse.next({
        request,
    })
}
