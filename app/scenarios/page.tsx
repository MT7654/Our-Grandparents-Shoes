"use client"

import { Assignments } from "@/components/visit-assignments"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Home, Heart, CheckSquare, LucideIcon } from "lucide-react"
import { Scenario, Persona } from '@/lib/types/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import personas from '@/lib/personas.json'

const icons: Record<string, LucideIcon> = {
  Home: Home,
  Heart: Heart,
  CheckSquare: CheckSquare
}

const default_persona: Persona = personas.Margaret

export default function ScenarioSelection() {
  const router = useRouter()
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
      router.push("/")
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
    <div className="min-h-screen bg-background relative">

      {/* Loading Screen */}
      <LoadingOverlay isLoading={loading} />

      {/* Logout Button Top Right */}
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={logout}>Sign out</Button>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <h1 className="text-4xl font-bold mb-2">Practice</h1>
            <p className="text-lg text-muted-foreground">
              Choose a visit with Margaret Chan.
            </p>
          </div>

          <nav aria-label="Practice sections" className="section-links"><a href="#practice">Choose a visit</a><a href="#assignments">Assignments</a></nav><Assignments/><div id="practice" />
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
            <>
            {/* Persona Context - Static */}
            <Card className="mb-8 border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <img
                    src= {persona.avatar}
                    alt= {persona.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                  <div>
                    <CardTitle className="text-2xl">{persona.name}</CardTitle>
                    <CardDescription className="text-base mt-1 leding-relaxed">
                      {`${persona.personality} You'll practice different scenarios with Margaret.`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Scenario Selection Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {scenarios.map((scenario) => {
                const Icon = icons[scenario.design.icon]
                return (
                  <Card
                    key={scenario.id}
                    className="border bg-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-accent p-3">
                          <Icon className="size-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-2xl mb-1">{scenario.name}</CardTitle>
                          <CardDescription className="text-base leading-relaxed">{scenario.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                          Easy or Hard · Practice focus
                        </h3>
                        <ul className="space-y-1.5">
                          {scenario.instructions.map((instruction, index) => (
                            <li key={index} className="text-sm leading-relaxed flex items-start gap-2">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button asChild className="w-full" size="lg">
                        <Link href={`/chat/${scenario.id}${typeof window === "undefined" ? "" : location.search}`}>
                          {scenario.design.buttonCta}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            </>
          )}

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
      </div>
    </div>
  )
}
