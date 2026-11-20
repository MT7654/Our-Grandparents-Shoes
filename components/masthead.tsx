"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Masthead() {
  const path = usePathname()
  if (path.startsWith("/chat/")) return null
  const admin = path.startsWith("/admin")
  const volunteer = ["/dashboard", "/scenarios", "/complete"].some(root => path.startsWith(root))
  return (
    <header className="journal-mast bg-[var(--foreground)] text-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 py-2">
        <Link href="/" className="inline-flex shrink-0 items-center gap-2">
          <span className="journal-brand">ConverseBetter</span>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Beta</span>
          
        </Link>
        {admin && <Link href="/admin" className="py-2 text-sm underline-offset-4 hover:underline">Coordinator dashboard</Link>}
        {volunteer && <nav aria-label="Volunteer navigation" className="flex gap-4 text-sm">
          <Link className="py-2" aria-current={path === "/scenarios" ? "page" : undefined} href="/scenarios">Live AI practice</Link>
          <Link className="py-2" aria-current={path.startsWith("/dashboard") ? "page" : undefined} href="/dashboard">My progress</Link>
        </nav>}
      </div>
    </header>
  )
}
