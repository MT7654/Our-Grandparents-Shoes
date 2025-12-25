"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { type FullPersona } from '@/lib/types/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

// const personas = [
//   {
//     id: "margaret",
//     name: "Margaret Thompson",
//     age: 78,
//     personality:
//       "Warm and talkative grandmother who loves sharing stories about her youth. She can be forgetful but appreciates patience and kind reminders.",
//     interests: ["Gardening", "Baking", "Family history"],
//     avatar: "/elderly-woman-cartoon-avatar-smiling-grandmother.jpg",
//   },
//   {
//     id: "robert",
//     name: "Robert Chen",
//     age: 82,
//     personality:
//       "Retired engineer who values precision and can be skeptical of new things. He warms up once he feels heard and respected.",
//     interests: ["Chess", "World War II history", "Classical music"],
//     avatar: "/elderly-man-cartoon-avatar-wise-grandfather.jpg",
//   },
// ]

export default function PersonaSelection() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personas, setPersonas] = useState<FullPersona[]>([])

  // Fetch personas 
  useEffect(() => {
    const getPersonas = async () => {  
      try {
        setError(null)
        const response = await fetch("/api/personas", { method: "GET" })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to load personas (${response.status})`
          setError(errorMessage)
          toast({
            title: "Error loading personas",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }

        const data = await response.json()

        if (data.error) {
          setError(data.error)
          toast({
            title: "Error loading personas",
            description: data.error,
            variant: "destructive",
          })
          return
        }

        setPersonas(data || [])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load personas'
        setError(errorMessage)
        console.error("Load error: " + error)
        toast({
          title: "Error loading personas",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getPersonas()
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 relative">

      {/* Loading Screen */}
      <LoadingOverlay isLoading={loading} />

      {/* Logout Button Top Right */}
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={logout}>Logout</Button>
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

            <h1 className="text-4xl font-bold mb-2">Choose Your Conversation Partner</h1>
            <p className="text-lg text-muted-foreground">
              Select a senior persona to practice meaningful conversations
            </p>
          </div>

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
          <div className="grid md:grid-cols-2 gap-6">
            {personas.map((persona) => (
              <Card key={persona.pid} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-24 h-24">
                      <img src={persona.avatar_url || "/placeholder.svg"} alt={persona.name} className="object-cover" />
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-1">{persona.name}</CardTitle>
                      <CardDescription className="text-base">Age {persona.age}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                      Personality
                    </h3>
                    <p className="text-foreground leading-relaxed">{persona.personality}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                      Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {persona.interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link href={`/chat/${persona.pid}`} className="block">
                    <Button className="w-full" size="lg">
                      Start Conversation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Tips */}
          <Card className="mt-8 bg-accent/50 border-accent">
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips for Success</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Listen actively and show genuine interest in their stories</li>
                <li>• Speak clearly and at a comfortable pace</li>
                <li>• Be patient with repetition or memory gaps</li>
                <li>• Ask open-ended questions to encourage sharing</li>
              </ul>
            </CardContent>
          </Card>
            </>
          )}

          {/* Empty State */}
          {!loading && !error && personas.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No personas available</AlertTitle>
              <AlertDescription>
                There are no conversation partners available at this time. Please try again later.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
