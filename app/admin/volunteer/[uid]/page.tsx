"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, Award, AlertCircle } from "lucide-react"
import type { Database } from '@/supabase/types'
import type { DisplayBadge } from '@/lib/types/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"
import { useParams } from 'next/navigation'

type PastSession = Database['public']['Views']['conversation_sessions']['Row']

interface VolunteerStatistics {
  total_sessions: number
  average_score: number | null
  completion_rate: number | null
}

export default function VolunteerDetailPage() {
  const params = useParams()
  const uid = params.uid as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volunteerName, setVolunteerName] = useState<string>('')
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [statistics, setStatistics] = useState<VolunteerStatistics | null>(null)
  const [badges, setBadges] = useState<DisplayBadge[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const getData = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/admin/volunteer?uid=${uid}`, { method: "GET" })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to load volunteer data (${response.status})`
          setError(errorMessage)
          toast({
            title: "Error loading volunteer data",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }

        const data = await response.json()
        const { volunteer_name, past_conversations, user_statistics, user_achievements } = data

        setVolunteerName(volunteer_name || 'Unknown Volunteer')
        setPastSessions(past_conversations || [])
        setStatistics(user_statistics || null)
        setBadges(user_achievements || [])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast({
          title: "Error loading volunteer data",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [uid, toast])

  const toLocalDate = (input: string | null) => {
    if (!input) return "Invalid Date"
    const localDate = new Date(input)
    return localDate.toLocaleDateString()
  }

  const getBadgeIcon = (badge: DisplayBadge) => {
    switch (badge.category) {
      case "Progression":
        return "🎯"
      case "Skill":
        return "🌟"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <LoadingOverlay isLoading={loading} />

          {/* Header */}
          <div className="mb-8">
            <Link href="/admin">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Dashboard
              </Button>
            </Link>

            <div>
              <h1 className="text-4xl font-bold mb-2">{volunteerName || 'Volunteer'}</h1>
              <p className="text-lg text-muted-foreground">Volunteer progress and statistics</p>
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
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Left: 3 stat cards stacked vertically */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-2">
                  <CardDescription className="text-sm">Total Sessions</CardDescription>
                  <CardTitle className={statistics ? "text-3xl" : "text-lg text-muted-foreground"}>
                    {statistics ? statistics.total_sessions : "N/A"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-2">
                  <CardDescription className="text-sm">Average Score</CardDescription>
                  <CardTitle className={statistics && statistics.average_score ? "text-3xl" : "text-lg text-muted-foreground"}>
                    {statistics && statistics.average_score ? Math.floor(statistics.average_score) : "N/A"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-2">
                  <CardDescription className="text-sm">Completion Rate</CardDescription>
                  <CardTitle className={statistics && statistics.completion_rate ? "text-3xl" : "text-lg text-muted-foreground"}>
                    {statistics && statistics.completion_rate ? `${Math.floor(statistics.completion_rate)}%` : "N/A"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Right: Achievements (2/3 width) */}
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Achievements ({badges.filter((b) => b.unlocked).length}/{badges.length})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map((badge) => (
                    <div
                      key={badge.bid}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        badge.unlocked
                          ? "bg-primary/10 border-primary/20"
                          : "bg-secondary/50 border-border opacity-50"
                      }`}
                    >
                      <span className="text-2xl">{getBadgeIcon(badge)}</span>
                      <div>
                        <span className="text-sm font-medium leading-tight">{badge.name}</span>
                        {badge.unlocked && badge.awarded && (
                          <p className="text-xs text-muted-foreground">{new Date(badge.awarded).toLocaleDateString()}</p>
                        )}
                        {!badge.unlocked && (
                          <p className="text-xs text-muted-foreground">Not unlocked</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Past Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Past Sessions</CardTitle>
              <CardDescription>Conversation training history</CardDescription>
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
      </div>
    </div>
  )
}
