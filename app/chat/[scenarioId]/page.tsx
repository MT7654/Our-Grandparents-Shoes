"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Send, Lightbulb, AlertCircle, Activity } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import type { Database } from '@/supabase/types'
import { type ScenarioKeys, Guidance, Difficulty, Scenario, Persona } from '@/lib/types/types'
import LoadingOverlay from "@/components/loading-overlay"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"


type Message = Database['public']['Tables']['messages']['Row']
type Expression = Database['public']['Enums']['eval_expression']
type Sentiment = Database['public']['Enums']['eval_sentiment']

const default_persona: Persona = {
    name: "Margaret Chan",
    age: 78,
    personality: "A warm and friendly senior who enjoys conversation.",
    interests: ["Gardening", "Baking", "Family History"],
    avatar: "/elderly-woman-cartoon-avatar-smiling-grandmother.jpg"
  }

export default function ChatTraining() {
    const params = useParams()
    const scenario_name = (params.scenarioId as string).replaceAll("-", " ")
    const router = useRouter()
    const { toast } = useToast()

    const scrollRef = useRef<HTMLDivElement>(null)

    // UI
    const [loading, setLoading] = useState(false)
    const [botLoading, setBotLoading] = useState(false)
    // -----------------------------------------------------------
    //  Guidance mode: "inline" = tips under each user bubble,
    //                 "bottom-bar" = persistent bar above input.
    //  Change this single value to switch between the two modes.
    // -----------------------------------------------------------
    const [guidance, setGuidance] = useState<Guidance>('bottom-bar')
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null)

    // Scenario & Persona
    const [scenario, setScenario] = useState<Scenario | null>(null)
    const [persona, setPersona] = useState<Persona>(default_persona)
    
    // Conversation State
    const [verseId, setVerseId] = useState<String>("")
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [rapport, setRapport] = useState<number>(50)
    const [sentiment, setSentiment] = useState<Sentiment>('neutral')
    const [expression, setExpression] = useState<Expression>("neutral")
    const [suggestion, setSuggestion] = useState<String>("")
    const [lastEvaluation, setLastEvaluation] = useState(false)
    const [turnsRemain, setTurnsRemain] = useState<number>(0)
    const [conversationEnded, setConversationEnded] = useState(false) 
    const [messageError, setMessageError] = useState<string | null>(null)

    // Start Conversation (Load Data)
    useEffect(() => {
        const begin = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/chat/start', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        scenario_name,
                        difficulty_level: difficulty
                    }), 
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to start conversation (${response.status})`)
                }

                const data = await response.json()

                if (data.error) {
                    throw new Error(data.error)
                }

                if (!data) {
                    throw new Error('Failed to initialize conversation')
                }

                const { scenario, persona, conversation, messages, evaluation } = data

                if (scenario) {
                    setRapport(scenario.constraints.starting_score)
                    setScenario(scenario)
                }

                if (persona) {
                    setPersona(persona)
                }

                if (conversation) {
                    setVerseId(conversation.vid)
                    setTurnsRemain(conversation.turns)
                    setDifficulty(conversation.difficulty)
                }

                if (messages) {
                    setMessages(messages)
                }
                
                if (evaluation) {
                    setSentiment(evaluation.sentiment)
                    setRapport(evaluation.rapport)
                    setExpression(evaluation.expression)
                    setSuggestion(evaluation.suggestion)
                    setLastEvaluation(true)
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation'
                console.error("Load error: ", error)
                toast({
                    title: "Error loading conversation",
                    description: errorMessage,
                    variant: "destructive",
                })
                // Redirect back to personas page after a short delay
                setTimeout(() => {
                    router.push('/scenarios')
                }, 2000)
            } finally {
                setLoading(false)
            }
        }

        if (difficulty) { begin() }
    }, [scenario_name, difficulty, router, toast])

    // Converse 
    const converse = async () => {
        if (!inputValue.trim() || conversationEnded) {
            return
        }

        setBotLoading(true)

        try {
            const response = await fetch('/api/chat/next', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId,
                    latestMessage: inputValue
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Failed to send message (${response.status})`)
            }

            const data = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            const { user_message, persona_message, evaluation, turns, completed } = data

            // Set Variables
            if (user_message) {
                setMessages(prev => [...prev, user_message, persona_message])
            } else {
                setMessages(prev => [...prev, persona_message])
            }
            
            if (evaluation) {
                // Update Avatar Expression
                setExpression(evaluation.expression)

                // Update System Suggestion
                setSuggestion(evaluation.suggestion)

                // Update Rapport
                setRapport(evaluation.rapport)

                // Update Sentiment
                setSentiment(evaluation.sentiment)
                setLastEvaluation(true)
            }

            if (turns != null) {
                setTurnsRemain(turns)
                setConversationEnded(turns <= 0 ? true : false)
            }

            if (completed) {
                setConversationEnded((prev) => (prev || completed))
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
            console.error('Converse Error: ', error)
            setMessageError(errorMessage)
            toast({
                title: "Error sending message",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setInputValue("")
            setBotLoading(false)
        }
    }

    // End Conversation (Save Data)
    const end = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/chat/end', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Failed to end conversation (${response.status})`)
            }

            // Successfully ended, navigate to completion page
            router.push(`/complete/${verseId}`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to end conversation'
            console.error('Save Error: ', error)
            toast({
                title: "Error ending conversation",
                description: errorMessage,
                variant: "destructive",
            })
            // Still navigate to completion page even if save failed
            // The completion page will handle the error state
            router.push(`/complete/${verseId}`)
        } finally {
            setLoading(false)
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Auto-scroll on new messages                                     */
    /* ---------------------------------------------------------------- */

    useEffect(() => {
        if (scrollRef.current) {
        // Use setTimeout to ensure DOM has updated before scrolling
        setTimeout(() => {
            if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }, 100)
        }
    }, [messages, botLoading])

    /* ---------------------------------------------------------------- */
    /*  Convert Date String to Local Date                               */
    /* ---------------------------------------------------------------- */

    const toLocalDate = (input: string) => {
        const localDate = new Date(input)
        return localDate.toLocaleTimeString([], { hour: "2-digit", minute: '2-digit' })
    }

    /* ---------------------------------------------------------------- */
    /*  UI update helpers                                                */
    /* ---------------------------------------------------------------- */

    const handleEndEarly = () => {
        end()
    }

    const handleDifficultyChange = (value: "Easy" | "Hard") => {
        setDifficulty(value)
    }

    /* ---------------------------------------------------------------- */
    /*  Derived values                                                   */
    /* ---------------------------------------------------------------- */

    const getHealthBarColor = () => {
        if (rapport >= 70) return "bg-emerald-500"
        if (rapport >= 40) return "bg-amber-500"
        return "bg-rose-500"
    }

    const expressionBorder = () => {
        switch (expression) {
        case "happy":
            return "border-green-400"
        case "sad":
            return "border-blue-400"
        case "angry":
            return "border-red-400"
        default:
            return "border-gray-300"
        }
    }

    const expressionBadge = () => {
        switch (expression) {
        case "happy":
            return "bg-green-100 text-green-700"
        case "sad":
            return "bg-blue-100 text-blue-700"
        case "angry":
            return "bg-red-100 text-red-700"
        default:
            return "bg-gray-100 text-gray-700"
        }
    }

    const showTurnWarning = turnsRemain <= 2 && !conversationEnded

    /* ---------------------------------------------------------------- */
    /*  Render                                                           */
    /* ---------------------------------------------------------------- */

    return (
        <div className="h-dvh flex flex-col bg-[#F5F6F8]">
        <LoadingOverlay isLoading={loading} />

        {/* Difficulty must be chosen before starting */}
        <Dialog open={difficulty === null}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Select difficulty</DialogTitle>
                    <DialogDescription>
                        You must choose a difficulty level before the conversation begins. <br /> <br />
                        Note that if an existing conversation exist, the difficulty level will follow the existing conversation.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-between">
                    <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        onClick={() => handleDifficultyChange("Easy")}
                        autoFocus
                    >
                        Easy
                    </Button>
                    <Button
                        className="w-full sm:w-auto"
                        onClick={() => handleDifficultyChange("Hard")}
                    >
                        Hard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <Link href="/scenarios">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-600 hover:text-gray-900 bg-transparent"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                </Link>
                <span className="text-sm font-bold text-gray-900">{scenario?.name}</span>
            </div>

            <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                    {difficulty ?? "Difficulty"}
                </Badge>
            </div>
            </div>

            {/* Rapport bar */}
            <div className="max-w-3xl mx-auto mt-2 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-600">Rapport</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                className={`h-full ${getHealthBarColor()} transition-all duration-500`}
                style={{ width: `${rapport}%` }}
                />
            </div>
            <span className="text-xs font-bold text-gray-900 tabular-nums w-8 text-right">
                {rapport}%
            </span>
            </div>

            {/* Turn warning */}
            {showTurnWarning && (
            <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2 text-amber-800 bg-amber-100 px-3 py-1.5 rounded">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium">
                {turnsRemain} {turnsRemain === 1 ? "turn" : "turns"} remaining
                </span>
            </div>
            )}
        </header>

        {/* ── Chat Card (fills remaining space) ──────────────────── */}
        <Card className="flex-1 min-h-0 flex flex-col mx-3 my-3 max-w-3xl w-full self-center overflow-hidden border-gray-200">
            {/* Fixed top: Full-width avatar + name overlay + objective */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
            {/* Full-width avatar banner */}
            <div className="relative w-full">
                <img
                src={persona.avatar}
                alt={persona.name}
                className={`w-full h-32 sm:h-40 object-cover object-center border-b-4 ${expressionBorder()} transition-colors duration-300`}
                />
                {/* Name + expression overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                <div className="flex items-end justify-between">
                    <h3 className="text-base font-bold text-white drop-shadow-sm">{persona.name}</h3>
                    <Badge variant="secondary" className={`text-xs capitalize ${expressionBadge()}`}>
                    {expression}
                    </Badge>
                </div>
                </div>
            </div>

            {/* Objective */}
            <div className="px-3 py-1">
                <div className={`${scenario?.design.bgColor} border rounded-lg px-2.5 py-1`}>
                <h4 className={`text-[10px] font-bold ${scenario?.design.textColor} uppercase tracking-wide mb-0.5`}>
                    Objective
                </h4>
                <p className="text-xs text-gray-800 leading-tight">{scenario?.objective}</p>
                </div>
            </div>

            {/* Coaching tip - fixed below objective */}
            {lastEvaluation && !conversationEnded && (
                <div className="px-3 pb-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                    {suggestion}
                    </p>
                </div>
                </div>
            )}
            </div>

            {/* Scrollable message log */}
            <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 space-y-3 bg-gray-50"
            >
            {messages.map((message) => (
                <div
                key={message.mid}
                className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}
                >
                {/* Bubble */}
                <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                >
                    <p className="text-xs leading-relaxed">{message.content}</p>
                    <span
                    className={`text-xs mt-1 block ${
                        message.sender === "user" ? "text-blue-200" : "text-gray-400"
                    }`}
                    >
                    {toLocalDate(message.sent_at)}
                    </span>
                </div>

                </div>
            ))}

            {/* Bot typing indicator (always left, always last) */}
            {botLoading && (
                <div className="flex flex-col items-start">
                    <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm bg-white border border-gray-200 text-gray-900">
                        <div className="flex items-center gap-2">
                            <Spinner className="text-blue-600" />
                            <span className="text-xs text-gray-500">Typing…</span>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </Card>

        {/* Message send error popup */}
        <Dialog
            open={!!messageError}
            onOpenChange={(open) => {
                if (!open) setMessageError(null)
            }}
        >
            <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Message not sent
                </DialogTitle>
                <DialogDescription>
                We couldn&apos;t send your message or fetch a response from the server.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button onClick={() => setMessageError(null)}>OK</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* ── Bottom controls ────────────────────────────────────── */}

        {/* Guidance + End session / View results */}
        <div className="bg-white border-t border-gray-200 px-4 py-2">
            <div className="max-w-3xl mx-auto space-y-2">
            {conversationEnded ? (
                <Link href={`/complete/${verseId}`}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 text-sm">
                    View Results
                </Button>
                </Link>
            ) : (
                <Button
                onClick={handleEndEarly}
                variant="outline"
                size="sm"
                className="w-full text-gray-500 hover:text-gray-900 border-gray-300 bg-transparent h-8 text-xs"
                >
                End Session Early
                </Button>
            )}
            </div>
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-gray-300 shadow-lg px-4 py-2.5">
            <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
                placeholder={conversationEnded ? "Session ended" : "Type your message..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    converse()
                }
                }}
                disabled={conversationEnded || botLoading}
                className="flex-1 h-10 text-sm bg-gray-50 border-gray-300 disabled:opacity-50"
            />
            <Button
                onClick={converse}
                size="icon"
                disabled={conversationEnded || botLoading}
                className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
                <Send className="w-4 h-4" />
            </Button>
            </div>
        </div>
    </div>
  )
}