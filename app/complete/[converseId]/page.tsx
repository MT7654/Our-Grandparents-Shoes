"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { CheckCircle2, XCircle, Trophy, RotateCcw, Home } from "lucide-react"
import { CompleteParams } from '@/lib/types/types'
import { useParams } from "next/navigation"
import LoadingOverlay from '@/components/loading-overlay'

export default function ConversationComplete() {
    const params = useParams()
    const converseId = params.converseId as string

    const [loading, setLoading] = useState(true)
    const [sessionData, setSessionData] = useState<CompleteParams | null>(null)

    useEffect(() => {
        const retrieveFromDB = async () => {
            try {
                const response = await fetch(`/api/chat/end?id=${converseId}`, { method: "GET" })

                if (!response.ok) {
                    throw new Error(`Error fetching conversation: ${response.status}, ${response.statusText}`)
                }

                const data = await response.json()

                setSessionData(data)
            } catch (error) {
                console.error('Error fetching data')
            } finally {
                setLoading(false)
            }
        } 

        retrieveFromDB()
    }, [])

    if (loading || !sessionData) return <LoadingOverlay isLoading={loading || !sessionData}/> 

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
            {sessionData.completed ? (
                <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <div>
                    <CardTitle className="text-3xl mb-2">Conversation Complete!</CardTitle>
                    <CardDescription className="text-base">
                    Great job building rapport and achieving your objective
                    </CardDescription>
                </div>
                </div>
            ) : (
                <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                    <XCircle className="w-12 h-12 text-yellow-600" />
                </div>
                <div>
                    <CardTitle className="text-3xl mb-2">Session Ended</CardTitle>
                    <CardDescription className="text-base">Keep practicing to improve your skills</CardDescription>
                </div>
                </div>
            )}
            </CardHeader>

            <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-primary/10 rounded-lg">
                <div className="text-5xl font-bold text-primary mb-2">
                {sessionData?.average}
                <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>

            {/* Score Breakdown */}
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Score Breakdown
                </h3>
                <div className="space-y-4">
                {Object.entries(sessionData.scores).map(([category, score]) => (
                    <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium capitalize">{category.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="text-muted-foreground">{score}/100</span>
                    </div>
                    <Progress value={score} className="h-2" />
                    </div>
                ))}
                </div>
            </div>

            {/* Objective Status */}
            <div className="p-4 bg-secondary rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎯</span>
                <h3 className="font-semibold">Objective Status</h3>
                </div>
                <Badge variant={sessionData.objective_met ? "default" : "secondary"} className="mb-2">
                {sessionData.objective_met ? "Completed" : "Not Completed"}
                </Badge>
                <p className="text-sm text-muted-foreground">Get the senior to talk about how they met their spouse</p>
            </div>

            {/* Feedback */}
            <div className="p-4 bg-accent/50 border border-accent rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">💡 Coach Feedback</h3>
                <p className="text-sm leading-relaxed">{sessionData.feedback}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href="/personas" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Another Persona
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