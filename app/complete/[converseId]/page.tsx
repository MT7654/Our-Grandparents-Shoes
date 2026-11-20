"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { CheckCircle2, CircleStop, Trophy, RotateCcw, Home, AlertCircle, Target, Lightbulb } from "lucide-react"
import type { CompleteParams } from '@/lib/types/types'
import { useParams } from "next/navigation"
import LoadingOverlay from '@/components/loading-overlay'
import { useToast } from "@/hooks/use-toast"

export default function ConversationComplete() {
    const params = useParams()
    const converseId = params.converseId as string
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [objective, setObjective] = useState<string>('')
    const [sessionData, setSessionData] = useState<(CompleteParams & { end_reason?: string | null }) | null>(null)

    useEffect(() => {
        const retrieveFromDB = async () => {
            try {
                setError(null)
                const response = await fetch(`/api/chat/end?id=${converseId}`, { method: "GET" })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    const errorMessage = errorData.error || `Failed to load conversation results (${response.status})`
                    setError(errorMessage)
                    toast({
                        title: "Error loading results",
                        description: errorMessage,
                        variant: "destructive",
                    })
                    return
                }

                const data = await response.json()

                if (data.error) {
                    setError(data.error)
                    toast({
                        title: "Error loading results",
                        description: data.error,
                        variant: "destructive",
                    })
                    return
                }

                const { objective, ...rest } = data

                setObjective(objective || '')
                setSessionData(rest)    
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation results'
                setError(errorMessage)
                console.error('Error fetching data: ', error)
                toast({
                    title: "Error loading results",
                    description: errorMessage,
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        retrieveFromDB()
    }, [converseId, toast])

    if (loading) return <LoadingOverlay isLoading={true}/> 

    if (error || !sessionData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Error Loading Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {error || 'Failed to load conversation results. The conversation may not have been completed properly.'}
                            </AlertDescription>
                        </Alert>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/scenarios" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Try Another Scenario
                                </Button>
                            </Link>
                            <Link href="/dashboard" className="flex-1">
                                <Button className="w-full">
                                    <Home className="w-4 h-4 mr-2" />
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const achieved = sessionData.objective_met
    const reason =
        sessionData.end_reason === "objective_met" ? "You met the practice objective." :
        sessionData.end_reason === "boundary" ? "Margaret chose to end the conversation." :
        sessionData.end_reason === "turn_limit" ? "You reached the turn limit." :
        sessionData.end_reason === "ended_early" ? "You ended this visit early." :
        "Review what went well and what to try next."
    const scores = Object.entries(sessionData.scores ?? {}).filter(([, score]) => Number.isFinite(score))
    const feedback = sessionData.feedback?.trim()

    return (
        <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-8">
            <Card className="mx-auto w-full max-w-2xl gap-4 border-border py-5">
                <CardHeader className="px-4 sm:px-6">
                    <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                            {achieved ? <CheckCircle2 aria-hidden="true" className="size-6" /> : <CircleStop aria-hidden="true" className="size-6" />}
                        </span>
                        <div className="min-w-0 space-y-1">
                            <h1 className="text-2xl font-bold leading-tight">Visit complete</h1>
                            <CardDescription className="text-base leading-relaxed">{reason}</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 px-4 sm:px-6">
                    <section aria-labelledby="result-objective" className="space-y-2 rounded-xl border border-border bg-secondary p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Target aria-hidden="true" className="size-5 text-primary" />
                            <h2 id="result-objective" className="font-semibold">Practice objective</h2>
                            <Badge variant={achieved ? "default" : "outline"} className="text-sm">
                                {achieved ? "Met" : "Not met"}
                            </Badge>
                        </div>
                        {objective && <p className="text-base leading-relaxed">{objective}</p>}
                    </section>

                    <section aria-labelledby="result-feedback" className="space-y-2 rounded-xl border border-border p-4">
                        <h2 id="result-feedback" className="flex items-center gap-2 font-semibold">
                            <Lightbulb aria-hidden="true" className="size-5 text-primary" /> Coach feedback
                        </h2>
                        <p className="text-base leading-relaxed [overflow-wrap:anywhere]">{feedback || "Feedback isn’t available for this visit."}</p>
                    </section>

                    {scores.length > 0 && (
                        <section aria-labelledby="result-scores" className="space-y-4 rounded-xl border border-border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h2 id="result-scores" className="flex items-center gap-2 font-semibold">
                                    <Trophy aria-hidden="true" className="size-5 text-primary" /> Score breakdown
                                </h2>
                                {Number.isFinite(sessionData.average) && <span className="text-sm font-semibold tabular-nums text-primary">Overall: {sessionData.average}/100</span>}
                            </div>
                            {scores.map(([category, score]) => {
                                const label = category.replace(/([A-Z])/g, " $1").trim()
                                return (
                                    <div key={category} className="space-y-1">
                                        <div className="flex flex-wrap justify-between gap-x-2 text-sm">
                                            <span className="font-medium capitalize">{label}</span>
                                            <span className="tabular-nums text-muted-foreground">{score}/100</span>
                                        </div>
                                        <Progress aria-label={label} value={score} className="h-2" />
                                    </div>
                                )
                            })}
                        </section>
                    )}

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <Button asChild variant="outline" className="min-h-11 flex-1">
                            <Link href="/scenarios"><RotateCcw aria-hidden="true" className="size-4" /> Try another scenario</Link>
                        </Button>
                        <Button asChild className="min-h-11 flex-1">
                            <Link href="/dashboard"><Home aria-hidden="true" className="size-4" /> My progress</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
