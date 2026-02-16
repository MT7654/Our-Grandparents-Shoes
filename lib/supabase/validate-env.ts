/**
 * Validates that required Supabase environment variables are set
 * Call this at the start of your application or in a setup function
 */
export function validateSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  Missing Supabase Environment Variables                     ║
╠══════════════════════════════════════════════════════════════╣
║  Missing: ${missing.join(', ').padEnd(48)} ║
╠══════════════════════════════════════════════════════════════╣
║  Please create a .env.local file in your project root with: ║
║                                                              ║
║  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url         ║
║  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key       ║
║                                                              ║
║  Get these from: Supabase Dashboard → Settings → API       ║
╚══════════════════════════════════════════════════════════════╝
    `)
    return false
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
    return false
  }

  return true
}

