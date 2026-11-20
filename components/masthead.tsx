"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Masthead() {
  const path = usePathname()
  if (path.startsWith("/chat/")) return null
  const admin = path.startsWith("/admin")
  const volunteer = ["/dashboard", "/scenarios", "/complete"].some(root => path.startsWith(root))
  return (
    <header className="bg-[var(--foreground)] text-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 py-2">
        <Link href="/" className="text-lg font-semibold tracking-tight">ConverseBetter</Link>
        {admin && <Link href="/admin" className="py-2 text-sm underline-offset-4 hover:underline">Coordinator dashboard</Link>}
        {volunteer && <nav aria-label="Volunteer navigation" className="flex gap-4 text-sm">
          <Link className="py-2" aria-current={path === "/scenarios" ? "page" : undefined} href="/scenarios">Practice</Link>
          <Link className="py-2" aria-current={path.startsWith("/dashboard") ? "page" : undefined} href="/dashboard">My progress</Link>
        </nav>}
      </div>
    </header>
  )
}
