"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { ArrowLeft, Send, Lightbulb, AlertCircle, Target, X, ClipboardList } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import type { Database } from '@/supabase/types'
import { Guidance, Difficulty, Scenario, Persona } from '@/lib/types/types'
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
type Expression = Database['public']['Enums']['eval_new_expression']
type Sentiment = Database['public']['Enums']['eval_sentiment']

const default_persona: Persona = {
    name: "Margaret Chan",
    age: 78,
    gender: 'Female',
    personality: "A warm and friendly senior who enjoys conversation.",
    interests: ["Gardening", "Baking", "Family History"],
    avatar: "/elderly-woman-cartoon-avatar-smiling-grandmother.jpg",
    emotions: {
            "angry": "/Margaret Chan_Angry.png",
            "confused": "/Margaret Chan_Confused.png",
            "happy": "/Margaret Chan_Happy.png",
            "neutral": "/Margaret Chan_Neutral.png",
            "scared": "/Margaret Chan_Scared.png",
            "worried": "/Margaret Chan_Worried.png"
        }
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
    const [showDifficultyPopup, setShowDifficultyPopup] = useState(false)

    // Scenario & Persona
    const [scenario, setScenario] = useState<Scenario | null>(null)
    const [persona, setPersona] = useState<Persona>(default_persona)
    const [objectiveOpen, setObjectiveOpen] = useState(false)
    
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
    const [showSteps, setShowSteps] = useState(false)
    const [endEarly, setEndEarly] = useState(false)

    // Initial load: try to resume active session; if none, we'll show difficulty popup
    useEffect(() => {
        const resumeCheck = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/chat/resume', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scenario_name }),
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to load (${response.status})`)
                }

                const data = await response.json()
                if (data.error) throw new Error(data.error)

                const { scenario, persona, conversation, messages, evaluation } = data

                if (scenario === undefined || persona === undefined || conversation === undefined || messages === undefined || evaluation === undefined) {
                    setShowDifficultyPopup(true)
                    setLoading(false)
                    return
                } else {                    
                    if (scenario) {
                        setRapport(scenario.constraints.starting_score)
                        setScenario(scenario)
                        setExpression(scenario.constraints.default_expression)
                    }
                    if (persona) setPersona(persona)
                    if (conversation) {
                        setVerseId(conversation.vid)
                        setTurnsRemain(conversation.turns)
                        setDifficulty(conversation.difficulty)
                    }
                    if (messages) setMessages(messages)
                    if (evaluation) {
                        setSentiment(evaluation.sentiment)
                        setRapport(evaluation.rapport)
                        setExpression(evaluation.expression)
                        setSuggestion(evaluation.suggestion)
                        setLastEvaluation(true)
                    }
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation'
                console.error("Load error: ", error)
                toast({
                    title: "Error loading conversation",
                    description: errorMessage,
                    variant: "destructive",
                })
                setTimeout(() => router.push('/scenarios'), 2000)
            } finally {
                setLoading(false)
            }
        }

        resumeCheck()
    }, [scenario_name, router, toast])

    // Start new conversation after user selects difficulty (only when no active session)
    useEffect(() => {
        if (difficulty === null || verseId !== "") return

        const begin = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/chat/start', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scenario_name, difficulty_level: difficulty }),
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to start conversation (${response.status})`)
                }

                const data = await response.json()
                if (data.error) throw new Error(data.error)
                if (!data) throw new Error('Failed to initialize conversation')

                const { scenario, persona, conversation, messages, evaluation } = data

                if (scenario) {
                    setRapport(scenario.constraints.starting_score)
                    setScenario(scenario)
                    setExpression(scenario.constraints.default_expression)
                }
                if (persona) setPersona(persona)
                if (conversation) {
                    setVerseId(conversation.vid)
                    setTurnsRemain(conversation.turns)
                    setDifficulty(conversation.difficulty)
                }
                if (messages) setMessages(messages)
                if (evaluation) {
                    setSentiment(evaluation.sentiment)
                    setRapport(evaluation.rapport)
                    setExpression(evaluation.expression)
                    setSuggestion(evaluation.suggestion)
                    setLastEvaluation(true)
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation'
                console.error("Start error: ", error)
                toast({
                    title: "Error starting conversation",
                    description: errorMessage,
                    variant: "destructive",
                })
                setTimeout(() => router.push('/scenarios'), 2000)
            } finally {
                setLoading(false)
            }
        }

        begin()
    }, [scenario_name, difficulty, verseId, router, toast])

    // Converse
    const converse = async () => {
        if (!inputValue.trim() || conversationEnded) {
            return
        }

        const userText = inputValue
        setInputValue("")

        // Optimistic: add user message to local state immediately
        const optimisticUserMsg: Message = {
            mid: `optimistic-${Date.now()}`,
            vid: verseId as string,
            sender: 'user',
            content: userText,
            sent_at: new Date().toISOString(),
            feedback: null,
            status: null,
        }
        setMessages(prev => [...prev, optimisticUserMsg])
        setBotLoading(true)

        try {
            const response = await fetch('/api/chat/next', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId,
                    latestMessage: userText,
                    history: messages
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

            // Replace optimistic user message with the real one from the server, then add persona message
            setMessages(prev => {
                const withoutOptimistic = prev.filter(m => m.mid !== optimisticUserMsg.mid)
                if (user_message) {
                    return [...withoutOptimistic, user_message, persona_message]
                }
                return [...withoutOptimistic, persona_message]
            })

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
            // Remove the optimistic message on error
            setMessages(prev => prev.filter(m => m.mid !== optimisticUserMsg.mid))
            setMessageError(errorMessage)
            toast({
                title: "Error sending message",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
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
                    converseId: verseId,
                    end_early: endEarly
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Failed to end conversation (${response.status})`)
            }

            // Successfully ended, navigate to completion page
            router.push(`/dashboard/review/${verseId}`)
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
            router.push(`/dashboard/review/${verseId}`)
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
        setEndEarly(true)
    }

    useEffect(() => {
        if (endEarly) end()
    }, [endEarly])

    const handleDifficultyChange = (value: "Easy" | "Hard") => {
        setShowDifficultyPopup(false)
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
        case "worried":
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
        case "worried":
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

        {/* Difficulty popup only when starting a new conversation (no active session) */}
        <Dialog open={showDifficultyPopup}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Select difficulty</DialogTitle>
                    <DialogDescription>
                        Choose a difficulty level to start a new conversation.
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
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{scenario?.name}</span>
                    {!!scenario?.objective && (
                    <Popover open={objectiveOpen} onOpenChange={setObjectiveOpen}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-gray-600 hover:text-gray-900 bg-transparent"
                                            aria-label="View objective"
                                        >
                                            <Target className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>
                                    {"Objective"}
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent align="start" className="w-[360px] p-0">
                                <div className={`${scenario?.design.bgColor} border rounded-md px-3 py-2`}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                    <Target className={`h-4 w-4 ${scenario?.design.textColor}`} />
                                    <h4 className={`text-xs font-bold ${scenario?.design.textColor} uppercase tracking-wide`}>
                                        Objective
                                    </h4>
                                    </div>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-white/60"
                                    aria-label="Close objective"
                                    onClick={() => setObjectiveOpen(false)}
                                    >
                                    <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                    <p className="mt-1 text-sm text-gray-800 leading-relaxed">
                                        {scenario?.objective}
                                    </p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                    {difficulty ?? "Difficulty"}
                </Badge>
            </div>
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
            {/* Fixed top: Full-width avatar + name overlay */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                {/* Full-width avatar banner */}
                <div className="relative w-full">
                    <img
                        src={persona.emotions[expression.toLowerCase()]}
                        alt={persona.name}
                        className={`w-full h-60 sm:h-68 object-cover object-center border-b-4 ${expressionBorder()} transition-colors duration-300`}
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

                {/* Tip + Rapport directly under picture */}
                <div className="px-4 pt-3 pb-3 space-y-2 bg-white">
                    {scenario_name != "Resolve a Task" && (
                    <div className="flex items-center gap-3">
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
                    )}

                    {lastEvaluation && !conversationEnded && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                {`Tip: ${suggestion}`}
                            </p>
                        </div>
                    )}  
                    {scenario_name === "Resolve a Task" && (
                        <button
                            onClick={() => setShowSteps(true)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <ClipboardList className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                            <p className="text-xs text-gray-900 font-medium">
                                View Steps to Book HealthHub Appointment
                            </p>
                        </button>
                    )}
                </div>
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

        {/* Steps modal for Resolve a Task */}
        <Dialog open={showSteps} onOpenChange={setShowSteps}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Steps to Book HealthHub Appointment</DialogTitle>
                    <DialogDescription>
                        Follow these steps to help the senior make a Healthier SG appointment.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 1: Log in</p>
                        <p className="text-sm text-gray-600">Open the HealthHub app and log in using Singpass.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 2: Start enrolment</p>
                        <p className="text-sm text-gray-600">Tap the Healthier SG banner to begin your enrolment.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 3: Select profile</p>
                        <p className="text-sm text-gray-600">Choose your user profile for self-enrolment, and tap Enrol in Healthier SG to proceed.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 4: Choose your clinic</p>
                        <p className="text-sm text-gray-600">Tap Select preferred clinic. You will be shown up to 3 clinics based on your past visits and residential address. To select other clinics, tap Search/Filters and search by postal code or keyword, then tap Apply filters.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 5: Confirm your enrolment</p>
                        <p className="text-sm text-gray-600">Tap Confirm enrolment to complete your enrolment with your preferred clinic.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Step 6: Book your appointment</p>
                        <p className="text-sm text-gray-600">After selecting your clinic, you will be prompted to book your first Healthier SG appointment. Follow the on-screen instructions or contact your clinic directly if prompted. You can also tap Book/Manage appointment on the Health Plan tab to schedule your consultation.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setShowSteps(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* ── Bottom controls ────────────────────────────────────── */}
        <div className="bg-white border-t border-gray-300 shadow-lg px-4 py-2.5">
            <div className="max-w-3xl mx-auto space-y-2">
                {conversationEnded ? (
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 text-sm"
                        onClick={end}
                    >
                        View Results
                    </Button>
                ) : (
                    <div className="flex gap-2 items-center">
                        <Button
                            onClick={handleEndEarly}
                            variant="outline"
                            size="sm"
                            className="h-10 px-3 text-xs whitespace-nowrap text-gray-600 hover:text-gray-900 border-gray-300 bg-transparent"
                        >
                            End Early
                        </Button>

                        <Input
                            placeholder="Type your message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    converse()
                                }
                            }}
                            disabled={botLoading}
                            className="flex-1 h-10 text-sm bg-gray-50 border-gray-300 disabled:opacity-50"
                        />

                        <Button
                            onClick={converse}
                            size="icon"
                            disabled={botLoading}
                            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}