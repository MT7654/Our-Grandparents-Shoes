"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { ArrowLeft, Award, TrendingUp, MessageCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const pastSessions = [
  {
    id: "1",
    personaName: "Margaret Thompson",
    date: "2025-01-28",
    score: 81,
    objective: "Get the senior to talk about how they met their spouse",
    completed: true,
  },
  {
    id: "2",
    personaName: "Robert Chen",
    date: "2025-01-27",
    score: 67,
    objective: "Help the senior feel comfortable sharing health concerns",
    completed: false,
  },
  {
    id: "3",
    personaName: "Margaret Thompson",
    date: "2025-01-26",
    score: 75,
    objective: "Build rapport through active listening",
    completed: true,
  },
]

const badges = [
  { id: "1", name: "First Conversation", icon: "🎯", unlocked: true },
  { id: "2", name: "Empathy Expert", icon: "❤️", unlocked: true },
  { id: "3", name: "5 Sessions", icon: "⭐", unlocked: false },
  { id: "4", name: "Perfect Score", icon: "🏆", unlocked: false },
  { id: "5", name: "Active Listener", icon: "👂", unlocked: true },
  { id: "6", name: "10 Sessions", icon: "🌟", unlocked: false },
]

const stats = {
  totalSessions: 3,
  averageScore: 74,
  completionRate: 67,
  bestCategory: "Empathy",
}

export default function ProgressDashboard() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Your Progress</h1>
                <p className="text-lg text-muted-foreground">Track your conversation training journey</p>
              </div>
              <Link href="/personas">
                <Button size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Continue Training
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Sessions</CardDescription>
                <CardTitle className="text-3xl">{stats.totalSessions}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Keep it up!
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
                <CardTitle className="text-3xl">{stats.averageScore}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={stats.averageScore} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion Rate</CardDescription>
                <CardTitle className="text-3xl">{stats.completionRate}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={stats.completionRate} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Best Category</CardDescription>
                <CardTitle className="text-2xl">{stats.bestCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Top Skill</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Past Sessions */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Past Sessions</CardTitle>
                  <CardDescription>Your conversation training history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pastSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary/50 rounded-lg gap-3"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{session.personaName}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{session.objective}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(session.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <Badge variant={session.completed ? "default" : "secondary"} className="text-xs">
                              {session.completed ? "Completed" : "Incomplete"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{session.score}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badges */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Achievements
                  </CardTitle>
                  <CardDescription>Unlocked badges</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${
                          badge.unlocked
                            ? "bg-primary/10 border-primary/20"
                            : "bg-secondary/50 border-border opacity-50"
                        }`}
                      >
                        <span className="text-3xl mb-1">{badge.icon}</span>
                        <span className="text-xs text-center leading-tight">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {badges.filter((b) => b.unlocked).length} of {badges.length} unlocked
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="mt-4 bg-accent/50 border-accent">
                <CardHeader>
                  <CardTitle className="text-base">💪 Keep Going!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• Complete 2 more sessions to unlock "5 Sessions" badge</p>
                  <p>• Your empathy score is your strongest skill</p>
                  <p>• Practice active listening to improve flow</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
