"use client"

import {SkillDebrief} from "@/components/challenge-journal"
import { Journal } from '@/components/visit-journal'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  AlertTriangle,
  Home,
  Heart,
  CheckSquare,
  MessageSquare,
  MessageCircle,
} from "lucide-react"
import { useParams } from "next/navigation"
import type { Review } from '@/lib/types/types'
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"

const panel = "rounded-xl border border-border bg-card text-card-foreground"
const scenarioLabels = {
  "Emotional Listening Ear": "Listening Ear",
} as const

function getScenarioIcon(scenario: string) {
  switch (scenario) {
    case "House Visit":
      return Home
    case "Emotional Listening Ear":
    case "Listening Ear":
      return Heart
    case "Resolve a Task":
      return CheckSquare
    default:
      return MessageCircle
  }
}

export default function SessionReviewPage() {
  const params = useParams()
  const converseId = params.converseId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!converseId) {
      setLoading(false)
      return
    }

    const getData = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/dashboard/review?converseId=${encodeURIComponent(converseId)}`, { method: 'GET' })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to load review (${response.status})`
          setError(errorMessage)
          toast({
            title: 'Error loading review',
            description: errorMessage,
            variant: 'destructive',
          })
          return
        }

        const data = await response.json()
        setReview(data.review ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast({
          title: 'Error loading review',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [converseId, toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingOverlay isLoading />
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{error ?? 'Session not found.'}</p>
          <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    )
  }

  const ScenarioIcon = getScenarioIcon(review.scenario)
  const scenarioLabel = review.scenario === "Emotional Listening Ear" ? scenarioLabels[review.scenario] : review.scenario

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
        <header className="space-y-2">
          <Button asChild variant="ghost" className="mb-1 min-h-11 px-2 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard"><ArrowLeft aria-hidden="true" className="size-4" /> Back to sessions</Link>
          </Button>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Session review</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Feedback on your conversation with Margaret Chan.
          </p>
        </header>

        <section aria-labelledby="review-scenario" className={panel + " p-4"}>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <ScenarioIcon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="review-scenario" className="text-lg font-semibold leading-snug">{scenarioLabel}</h2>
                <Badge variant="secondary" className="text-sm capitalize">{review.difficulty}</Badge>
              </div>
              <time dateTime={review.date} className="block text-sm text-muted-foreground">
                {new Date(review.date).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </time>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Practice objective</p>
            {review.objective_met ? (
              <Badge className="gap-1.5 border-0 bg-green-100 text-sm font-semibold text-green-900">
                <CheckCircle2 aria-hidden="true" className="size-4" /> Completed
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 text-sm font-semibold">
                <XCircle aria-hidden="true" className="size-4" /> Not completed
              </Badge>
            )}
          </div>
        </section>

        {/* Overall Feedback */}
        {review.feedback && (
          <div className={panel + " overflow-hidden"}>
            <div className="flex items-center gap-2 px-4 py-3 bg-secondary border-b border-border">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-primary">Overall feedback</h2>
            </div>
            <div className="p-4">
              <p className="text-base text-foreground leading-relaxed [overflow-wrap:anywhere]">{review.feedback}</p>
            </div>
          </div>
        )}

        <SkillDebrief vid={converseId}/>
        <Journal vid={converseId} scenario={review.scenario}/>
        {/* View Conversation History */}
        <Link
          href={`/dashboard/review/${converseId}/chat`}
          className={panel + " flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"}
        >
          <span className="flex min-w-0 items-center gap-3">
            <MessageSquare aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <span>
              <span className="block font-semibold">View conversation history</span>
              <span className="block text-sm text-muted-foreground">Read the full conversation</span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        </Link>

        {/* Good Conversational Prompts */}
        {review.goodPrompts.length > 0 && (
          <div className={panel + " overflow-hidden"}>
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
              <ThumbsUp className="w-4 h-4 text-green-700" />
              <h2 className="text-base font-semibold text-green-900">What worked</h2>
            </div>
            <div className="divide-y divide-border">
              {review.goodPrompts.map((item, index) => (
                <div key={index} className="p-4 space-y-2">
                  <div className="bg-secondary border border-border rounded-lg px-3 py-2">
                    <p className="text-base font-medium leading-relaxed text-primary [overflow-wrap:anywhere]">
                      {'"'}
                      {item.userMessage}
                      {'"'}
                    </p>
                  </div>
                  <p className="text-base text-foreground leading-relaxed [overflow-wrap:anywhere] pl-1">{item.explanation}</p>{item.mid && <Link className='underline text-sm' href={`/dashboard/review/${converseId}/chat#${item.mid}`}>Read this exchange</Link>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs Improvement */}
        {review.needsImprovement.length > 0 && (
          <div className={panel + " overflow-hidden"}>
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-base font-semibold text-amber-900">What to try next</h2>
            </div>
            <div className="divide-y divide-border">
              {review.needsImprovement.map((item, index) => (
                <div key={index} className="p-4 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-base font-medium leading-relaxed text-amber-900 [overflow-wrap:anywhere]">
                      {'"'}
                      {item.userMessage}
                      {'"'}
                    </p>
                  </div>
                  <p className="text-base text-foreground leading-relaxed [overflow-wrap:anywhere] pl-1">{item.explanation}</p>{item.mid && <Link className='underline text-sm' href={`/dashboard/review/${converseId}/chat#${item.mid}`}>Read this exchange</Link>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild variant="outline" className="min-h-11 flex-1">
            <Link href="/scenarios">Try another scenario</Link>
          </Button>
          <Button asChild className="min-h-11 flex-1">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
