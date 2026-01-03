import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const userPaths = ['/personas', '/dashboard', '/complete', '/chat']
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

        // Check Role
        const role = session.access_token ? JSON.parse(atob(session.access_token.split('.')[1]))['user_role'] : null
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
