"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const [role, setRole] = useState<string | null>()
  const [error, setError] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(async response => setRole(response.ok ? (await response.json()).user.role : null))
      .catch(() => { if (!controller.signal.aborted) setRole(null) })
    return () => controller.abort()
  }, [])

  async function signOut() {
    try {
      const result = await fetch("/api/auth/logout", { method: "POST" })
      if (!result.ok) throw Error()
      setRole(null)
      setError("")
    } catch { setError("Sign-out failed. Please try again.") }
  }

  return (
    <main className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:min-h-[75dvh] md:grid-cols-2 md:px-10">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Practice conversations with Margaret Chan.</h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">Practise with Margaret in a live AI conversation, or explore a guided demo with suggested responses.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild><Link href={role === "admin" ? "/admin" : role === "user" ? "/scenarios" : "/auth"}>{role === "admin" ? "Coordinator dashboard" : role === undefined ? "Open live AI practice" : role ? "Continue live AI practice" : "Sign in for live AI practice"}</Link></Button>
          <Button asChild variant="outline"><Link href={role === "user" ? "/dashboard" : "/guest"}>{role === "user" ? "My progress" : "Try guided demo"}</Link></Button>
          {role && <Button variant="ghost" onClick={signOut}>Sign out</Button>}
        </div>
        <p role="status">{error}</p>
      </div>
      <figure className="overflow-hidden rounded-3xl border">
        <img src="/journal/chapter-0.webp" alt="Margaret’s sunlit HDB corridor and portable radio" className="h-64 w-full object-cover sm:h-96" />
      </figure>
    </main>
  )
}
