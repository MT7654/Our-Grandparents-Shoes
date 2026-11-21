"use client"
import {ChapterCover} from "@/components/challenge-journal"

import { Assignments } from "@/components/visit-assignments"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Home, Heart, CheckSquare, ArrowDown, LucideIcon } from "lucide-react"
import { Scenario, Persona } from '@/lib/types/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"
import personas from '@/lib/personas.json'

const icons: Record<string, LucideIcon> = {
  Home: Home,
  Heart: Heart,
  CheckSquare: CheckSquare
}

const default_persona: Persona = personas.Margaret

export default function ScenarioSelection() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [persona, setPersona] = useState<Persona>(default_persona)

  // Fetch scenarios 
  useEffect(() => {
    const getScenarios = async () => {  
      try {
        setError(null)
        const response = await fetch("/api/scenarios", { method: "GET" })

        if (response.status === 401) {
          window.location.replace("/auth")
          return
        }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to load scenarios (${response.status})`
          setError(errorMessage)
          toast({
            title: "Error loading scenarios",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }

        const data = await response.json()

        if (data.error) {
          setError(data.error)
          toast({
            title: "Error loading scenarios",
            description: data.error,
            variant: "destructive",
          })
          return
        }

        const { scenario, persona } = data

        setScenarios(scenario || [])
        setPersona(persona || default_persona)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load scenarios'
        setError(errorMessage)
        console.error("Load error: " + error)
        toast({
          title: "Error loading scenarios",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getScenarios()
  }, [toast])

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to logout')
      }
      window.location.replace("/")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout'
      toast({
        title: "Error logging out",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <LoadingOverlay isLoading={loading} />
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-2">
          <Button asChild variant="ghost" className="min-h-11 px-2 text-muted-foreground hover:text-foreground">
            <Link href="/"><ArrowLeft aria-hidden="true" className="size-4" /> Home</Link>
          </Button>
          <Button variant="outline" className="min-h-11" onClick={logout}>Sign out</Button>
        </div>
        <header className="mb-5 space-y-2">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Choose your next visit</h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            Choose a visit with Margaret Chan and type your own replies. On Easy, you can open optional reply hints.
          </p>
        </header>
        <nav aria-label="Practice sections" className="mb-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="min-h-11">
            <a href="#practice">Choose a visit <ArrowDown aria-hidden="true" className="size-4" /></a>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href="#assignments">Assignments</a>
          </Button>
        </nav>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Persona Cards */}
          {!error && (
            <section id="practice" aria-labelledby="practice-heading" className="scroll-mt-4 space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 sm:gap-4 sm:p-4">
                <div className="size-14 shrink-0 overflow-hidden rounded-full bg-accent sm:size-16">
                  <img
                    src="/journal/margaret-neutral.webp"
                    alt=""
                    className="size-full object-cover object-top"
                    width={64}
                    height={64}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-snug text-foreground">{persona.name}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{persona.personality}</p>
                </div>
              </div>
              <h2 id="practice-heading" className="text-xl font-semibold leading-snug">Choose a visit</h2>
              <div className="grid gap-3 md:grid-cols-3">
              {scenarios.map((scenario) => {
                const Icon = icons[scenario.design.icon]
                return (
                  <Card
                    key={scenario.id}
                    className="gap-4 border-border bg-card py-4 sm:py-5"
                  >
                    <ChapterCover name={scenario.id.replaceAll("-", " ")}/><CardHeader className="px-4 sm:px-5">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-accent p-2.5">
                          <Icon aria-hidden="true" className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 text-lg font-semibold leading-snug">{scenario.name}</h3>
                          <CardDescription className="text-base leading-relaxed">{scenario.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 px-4 sm:px-5">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">
                          What you’ll practise
                        </h4>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-primary">
                          {scenario.instructions.map((instruction, index) => (
                            <li key={index}>{instruction}</li>
                          ))}
                        </ul>
                      </div>

                      <Button asChild className="mt-auto min-h-11 w-full" size="lg">
                        <Link href={`/chat/${scenario.id}${typeof window === "undefined" ? "" : location.search}`}>
                          {scenario.design.buttonCta}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            </section>
          )}

          <Assignments />
          {/* Empty State */}
          {!loading && !error && scenarios.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No scenarios available</AlertTitle>
              <AlertDescription>
                There are no conversation scenarios available at this time. Please try again later.
              </AlertDescription>
            </Alert>
          )}
      </div>
    </main>
  )
}
