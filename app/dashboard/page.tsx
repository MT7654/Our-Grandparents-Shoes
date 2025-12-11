"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, Award, TrendingUp, MessageCircle, AlertCircle } from "lucide-react"
import type { Database } from '@/supabase/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"

type PastSession = Database['public']['Views']['conversation_sessions']['Row']
type Statistic = Database['public']['Views']['statistics']['Row']

const badges = [
  { id: "1", name: "First Conversation", icon: "🎯", unlocked: true },
  { id: "2", name: "Empathy Expert", icon: "❤️", unlocked: true },
  { id: "3", name: "5 Sessions", icon: "⭐", unlocked: false },
  { id: "4", name: "Perfect Score", icon: "🏆", unlocked: false },
  { id: "5", name: "Active Listener", icon: "👂", unlocked: true },
  { id: "6", name: "10 Sessions", icon: "🌟", unlocked: false },
]

export default function ProgressDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [statistics, setStatistics] = useState<Statistic | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const getData = async () => {
      try {
        setError(null)
        const response = await fetch('/api/dashboard', { method: "GET" })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to load dashboard data (${response.status})`
          setError(errorMessage)
          toast({
            title: "Error loading dashboard",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }

        const data = await response.json()
        const { past_conversations, user_statistics } = data

        setPastSessions(past_conversations || [])
        setStatistics(user_statistics || null)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast({
          title: "Error loading dashboard",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [toast])

  const toLocalDate = (input: string | null) => {
        if (!input) return "Invalid Date"
        const localDate = new Date(input)
        return localDate.toLocaleDateString()
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <LoadingOverlay isLoading={loading} />

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

          {/* Stats Overview */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Sessions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Sessions</CardDescription>
                <CardTitle
                  className={`${
                    statistics ? "text-3xl" : "text-lg text-muted-foreground"
                  }`}
                >
                  {statistics ? statistics.total_sessions : "No sessions yet"}
                </CardTitle>
              </CardHeader>
              {statistics && (
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Keep it up!
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Average Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
                <CardTitle
                  className={`${
                    statistics && statistics.average_score ? "text-3xl" : "text-lg text-muted-foreground"
                  }`}
                >
                  {statistics && statistics.average_score ? Math.floor(statistics.average_score) : "No average score yet"}
                </CardTitle>
              </CardHeader>
              {statistics && statistics.average_score ? (
                <CardContent>
                  <Progress value={statistics.average_score} className="h-2" />
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-xs text-muted-foreground">No data available</div>
                </CardContent>
              )}
            </Card>

            {/* Completion Rate Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion Rate</CardDescription>
                <CardTitle
                  className={`${
                    statistics && statistics.completion_rate ? "text-3xl" : "text-lg text-muted-foreground"
                  }`}
                >
                  {statistics && statistics.completion_rate ? `${Math.floor(statistics.completion_rate)}%` : "No completion yet"}
                </CardTitle>
              </CardHeader>
              {statistics && statistics.completion_rate ? (
                <CardContent>
                  <Progress value={statistics.completion_rate} className="h-2" />
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-xs text-muted-foreground">No data available</div>
                </CardContent>
              )}
            </Card>

            {/* Best Category Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Best Category</CardDescription>
                <CardTitle
                  className={`${
                    statistics ? "text-2xl" : "text-lg text-muted-foreground"
                  }`}
                >
                  {statistics ? statistics.best_category : "No best category yet"}
                </CardTitle>
              </CardHeader>
              {statistics ? (
                <CardContent>
                  <Badge variant="secondary">Top Skill</Badge>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-xs text-muted-foreground">No data available</div>
                </CardContent>
              )}
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
                  {pastSessions && pastSessions.length > 0 ? (
                    <div className="space-y-4">
                      {pastSessions.map((session: PastSession) => (
                        <div
                          key={session.vid}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary/50 rounded-lg gap-3"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{session.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{session.objective}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{toLocalDate(session.created_at)}</span>
                              <span>•</span>
                              <Badge variant={session.completed ? "default" : "secondary"} className="text-xs">
                                {session.completed ? "Completed" : "Incomplete"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{session.score ? Math.floor(session.score) : 0}</div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                        No past conversations yet.
                    </div>
                  )}
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
