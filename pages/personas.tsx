"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const personas = [
  {
    id: "margaret",
    name: "Margaret Thompson",
    age: 78,
    personality:
      "Warm and talkative grandmother who loves sharing stories about her youth. She can be forgetful but appreciates patience and kind reminders.",
    interests: ["Gardening", "Baking", "Family history"],
    avatar: "/elderly-woman-cartoon-avatar-smiling-grandmother.jpg",
  },
  {
    id: "robert",
    name: "Robert Chen",
    age: 82,
    personality:
      "Retired engineer who values precision and can be skeptical of new things. He warms up once he feels heard and respected.",
    interests: ["Chess", "World War II history", "Classical music"],
    avatar: "/elderly-man-cartoon-avatar-wise-grandfather.jpg",
  },
]

export default function PersonaSelection() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/")
        return
      }
      
      setUser(user)
      setIsLoading(false)
    }
    
    checkAuth()
  }, [router])

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
    } catch (error) {
      alert("Logout error: " + error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 relative">
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

          {/* Persona Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {personas.map((persona) => (
              <Card key={persona.id} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-24 h-24">
                      <img src={persona.avatar || "/placeholder.svg"} alt={persona.name} className="object-cover" />
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

                  <Link href={`/chat/${persona.id}`} className="block">
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
        </div>
      </div>
    </div>
  )
}

