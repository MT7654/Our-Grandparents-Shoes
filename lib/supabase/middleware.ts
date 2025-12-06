import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/personas', '/dashboard', '/chat', '/complete']
// TODO: Add '/admin' back to protectedRoutes when done testing

// Routes that should redirect to /personas if already authenticated
const authRoutes = ['/']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get the current user
  const { data: { user }, error } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if the current route is an auth route (login/landing page)
  const isAuthRoute = authRoutes.includes(pathname)

  // Redirect to landing page if user is not authenticated and trying to access protected route
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Optionally: Redirect to personas if user is already authenticated and on landing page
  // Uncomment if you want this behavior:
  // if (isAuthRoute && user) {
  //   const redirectUrl = new URL('/personas', request.url)
  //   return NextResponse.redirect(redirectUrl)
  // }

  return supabaseResponse
}
