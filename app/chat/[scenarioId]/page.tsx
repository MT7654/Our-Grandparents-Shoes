"use client"

import { challenges, getChallenge, chapterImage } from "@/lib/visits/challenges"
import { visits } from "@/lib/visits/scenes"
import { followUpHints, houseGreeting } from "@/lib/chat/hints"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

const closeCopy = {
    objective_met: "You met the visit objective.",
    boundary: "Margaret indicated that she wanted to end the visit.",
    turn_limit: "This visit reached the practice turn limit.",
    ended_early: "You ended the visit early.",
} as const

type CloseReason = keyof typeof closeCopy

function isCloseReason(reason: unknown): reason is CloseReason {
    return typeof reason === "string" && Object.prototype.hasOwnProperty.call(closeCopy, reason)
}

type Progress = { turns?: number; completed?: boolean; end_reason?: unknown }

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

    const submission = useRef<{text:string;id:string}|null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const hintsRef = useRef<HTMLDetailsElement>(null)

    // UI
    const [loading, setLoading] = useState(false)
    const [focus, setFocus] = useState("")
    const challenge = getChallenge(focus, scenario_name)
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
    const [endReason, setEndReason] = useState<CloseReason | null>(null)
    const [assessmentRetry,setAssessmentRetry]=useState<{userMessageId:string;personaMessageId:string}|null>(null)
    const [messageError, setMessageError] = useState<string | null>(null)
    const [showSteps, setShowSteps] = useState(false)
    const [showEndConfirm, setShowEndConfirm] = useState(false)
    const [evaluating, setEvaluating] = useState(false)

    function applyProgress(progress: Progress) {
        if (typeof progress.turns === "number") setTurnsRemain(progress.turns)
        if (isCloseReason(progress.end_reason)) {
            setEndReason(progress.end_reason)
            setConversationEnded(true)
        } else if (progress.completed === true) {
            setConversationEnded(true)
        }
    }

    // Initial load: try to resume active session; if none, we'll show difficulty popup
    useEffect(() => {
        const resumeCheck = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/chat/resume', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ context: new URLSearchParams(location.search).get('context'), scenario_name }),
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to load (${response.status})`)
                }

                const data = await response.json()
                if (data.error) throw new Error(data.error)

                const { scenario, persona, conversation, messages, evaluation } = data

                if (scenario === undefined || persona === undefined || conversation === undefined || messages === undefined || evaluation === undefined) {
                    setFocus(getChallenge(new URLSearchParams(location.search).get('focus'), scenario_name)?.id ?? challenges.find(c=>c.scenario===scenario_name)?.id ?? '')
                    const assigned = new URLSearchParams(location.search).get('difficulty')
                    if (assigned === 'Easy' || assigned === 'Hard') setDifficulty(assigned)
                    else setShowDifficultyPopup(true)
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
                        setFocus(conversation.challenge_id ?? "")
                    setVerseId(conversation.vid)
                        applyProgress(conversation)
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
                    body: JSON.stringify({ context: new URLSearchParams(location.search).get('context'), scenario_name, challenge: focus, difficulty_level: difficulty }),
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
                    setFocus(conversation.challenge_id ?? "")
                    setVerseId(conversation.vid)
                    applyProgress(conversation)
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

    // Converse (two-phase: reply first, then evaluation)
    const opening = messages.find((message) => message.sender === "persona")?.content.split("\n")[0]
    const scene = visits.find((visit) => visit.scenario === scenario_name && visit.opening === opening)
    const sentReplies = messages.filter((message) => message.sender === "user").length
    const hintOptions = difficulty !== "Easy" ? []
        : sentReplies === 0 && scene ? [scene.greeting.label]
        : sentReplies === 1 && scene ? scene.choices.map((choice) => choice.label)
        : scenario_name === "House Visit" && !scene && sentReplies === 0
            ? [houseGreeting]
            : (followUpHints[scenario_name] ?? []).filter(hint =>
                !messages.some(message => message.sender === "user" && message.content.trim() === hint)
            )

    function useHint(hint: string) {
        if (inputValue.trim()) return
        setInputValue(hint)
        if (hintsRef.current) hintsRef.current.open = false
        inputRef.current?.focus()
    }
    const converse = async (userText = inputValue) => {
        if (!verseId || !userText.trim() || botLoading || conversationEnded || evaluating || assessmentRetry) {
            return
        }

        if(submission.current?.text!==userText) submission.current={text:userText,id:crypto.randomUUID()}
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
            // Phase 1: Get persona reply fast
            const response = await fetch('/api/chat/next', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId,
                    latestMessage: userText,
                    turnId: submission.current.id
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Failed to send message (${response.status})`)
            }

            const phase1 = await response.json()

            if (phase1.error) {
                throw new Error(phase1.error)
            }

            const { user_message, persona_message } = phase1

            submission.current=null
            // Show persona reply immediately
            setMessages(prev => {
                const withoutOptimistic = prev.filter(m => m.mid !== optimisticUserMsg.mid)
                if (user_message) {
                    return [...withoutOptimistic, user_message, persona_message]
                }
                return [...withoutOptimistic, persona_message]
            })
            setBotLoading(false)

            applyProgress(phase1)

            // Phase 2: Run evaluation in background
            if (phase1.pendingEvaluation) {
                setEvaluating(true)
                try {
                    const evalResponse = await fetch('/api/chat/evaluate', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            converseId: verseId,
                            userMessageId: user_message.mid,
                            personaMessageId: persona_message.mid
                        })
                    })

                    if (evalResponse.ok) {
                        const evalData = await evalResponse.json()

                        if (evalData.evaluation) {
                            setExpression(evalData.evaluation.expression)
                            setSuggestion(evalData.evaluation.suggestion)
                            setRapport(evalData.evaluation.rapport)
                            setSentiment(evalData.evaluation.sentiment)
                            setLastEvaluation(true)
                        }

                        applyProgress(evalData)

                        // Update persona message content if completion changed it
                        if (evalData.completionOverride) {
                            setMessages(prev => prev.map(m =>
                                m.mid === persona_message.mid
                                    ? { ...m, content: evalData.completionOverride }
                                    : m
                            ))
                        }
                    } else {
                        setAssessmentRetry({userMessageId:user_message.mid,personaMessageId:persona_message.mid})
                    }
                } catch (evalError) {
                    setAssessmentRetry({userMessageId:user_message.mid,personaMessageId:persona_message.mid})
                } finally {
                    setEvaluating(false)
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
            console.error('Converse Error: ', error)
            setInputValue(userText)
            // Remove the optimistic message on error
            setMessages(prev => prev.filter(m => m.mid !== optimisticUserMsg.mid))
            setMessageError(errorMessage)
            toast({
                title: "Error sending message",
                description: errorMessage,
                variant: "destructive",
            })
            setBotLoading(false)
        }
    }

    // End Conversation (Save Data)
    const end = async (early = false) => {
        setShowEndConfirm(false)
        setLoading(true)

        try {
            const response = await fetch('/api/chat/end', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId,
                    end_early: early
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
            // Keep the transcript available so the volunteer can try again.
        } finally {
            setLoading(false)
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Keep the latest reply in view when conversation content changes. */
    /* ---------------------------------------------------------------- */

    useEffect(() => {
        if (!messages.length) return
        const frame = requestAnimationFrame(() => {
            const scrollport = scrollRef.current
            if (scrollport) scrollport.scrollTop = scrollport.scrollHeight
        })
        return () => cancelAnimationFrame(frame)
    }, [messages.length, botLoading])

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

    const expressionBadge = () => {
        switch (expression) {
        case "happy":
            return "bg-green-100 text-green-700"
        case "worried":
            return "bg-blue-100 text-blue-700"
        case "angry":
            return "bg-red-100 text-red-700"
        default:
            return "bg-gray-100 text-foreground"
        }
    }

    const showTurnWarning = !!verseId && turnsRemain > 0 && turnsRemain <= 2 && !conversationEnded
    const scenarioTitle = scenario?.name ?? scenario_name
    const isMargaret = persona.name === default_persona.name
    const useVisitPortrait = !!scene || isMargaret
    const portraitExpression = verseId && ["neutral", "happy", "worried", "confused", "scared", "angry"].includes(expression)
        ? expression
        : "neutral"
    const portrait = useVisitPortrait
        ? `/journal/margaret-${portraitExpression}.webp`
        : persona.emotions[expression.toLowerCase()]
    const observations = !scene ? []
        : scenario_name === "House Visit" ? [
            ["Doorway", "Margaret has stayed by the door."],
            ["Chair", "The chair is tucked under the table."],
            ["Sleeve", "Her needle is still threaded."],
        ] : scenario_name === "Emotional Listening Ear" ? [
            ["Radio", "Music is playing softly."],
            ["Chair", "There is space to sit nearby."],
            ["Cup", "Margaret turns her cup in her hands."],
        ] : scene.opening.includes("recipe") ? [
            ["Tin", "Margaret keeps her recipes upright."],
            ["Divider", "The divider separates everyday favourites."],
            ["Recipe cards", "The cards have handwritten titles."],
        ] : [
            ["Packets", "The paper has a crease across the top."],
            ["Pencil", "The labels are handwritten."],
            ["Seeds", "Several types are waiting to be labelled."],
        ]

    return (
        <div className="flex h-dvh min-w-0 flex-col bg-background text-foreground">
            <LoadingOverlay isLoading={loading} />

            <Dialog open={showDifficultyPopup}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader className="chapter-heading text-left">
                        <img className="chapter-strip" src={chapterImage(scenario_name)} alt="" />
                        <DialogTitle>{scenarioTitle}</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                            Choose how you want to practise {scenarioTitle}.
                        </DialogDescription>
                    </DialogHeader>
                    <label className="journal-select">Choose a challenge<select value={focus} onChange={e => setFocus(e.target.value)}><option value="">Practise freely</option>{challenges.filter(c => c.scenario === scenario_name).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
                    {challenge && <div className="focus-card"><img src={challenge.image} alt="" /><p>{challenge.cue}</p></div>}
                    <div className="grid gap-3">
                        {([
                            ["Easy", "Practise a more approachable visit with optional reply hints."],
                            ["Hard", "Practise a more challenging visit without reply hints."],
                        ] as const).map(([level, description]) => (
                            <Button
                                key={level}
                                type="button"
                                variant="outline"
                                className="h-auto min-h-16 w-full flex-col items-start justify-center gap-1 whitespace-normal rounded-xl border-input px-4 py-3 text-left hover:bg-secondary"
                                onClick={() => handleDifficultyChange(level)}
                            >
                                <span className="text-base font-semibold">{level}</span>
                                <span className="text-sm font-normal leading-snug text-muted-foreground">{description}</span>
                            </Button>
                        ))}
                        <Link
                            href="/scenarios"
                            className="inline-flex min-h-11 items-center justify-center rounded-md text-sm font-semibold text-primary underline underline-offset-4"
                        >
                            Back to practice
                        </Link>
                    </div>
                </DialogContent>
            </Dialog>

            <header className="journal-mast chat-mast shrink-0 border-b border-border bg-card px-3 py-1.5 sm:px-4">
                <div className="mx-auto flex max-w-5xl items-center gap-2">
                    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0">
                        <Link href="/scenarios" aria-label="Back to practice">
                            <ArrowLeft aria-hidden="true" className="size-5" />
                        </Link>
                    </Button>
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                        <h1 className="min-w-0 break-words text-base font-bold leading-tight">{scenarioTitle}</h1>
                        {!!scenario?.objective && (
                            <Popover open={objectiveOpen} onOpenChange={setObjectiveOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="View objective">
                                        <Target aria-hidden="true" className="size-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" collisionPadding={12} className="w-[min(22rem,calc(100vw-1.5rem))] max-w-[var(--radix-popover-content-available-width)]">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="text-sm font-semibold">Objective</h2>
                                        <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Close objective" onClick={() => setObjectiveOpen(false)}>
                                            <X aria-hidden="true" className="size-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm leading-relaxed">{scenario.objective}</p>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    {difficulty && <Badge variant="secondary" className="shrink-0 text-sm">{difficulty}</Badge>}
                </div>
                {showTurnWarning && (
                    <div className="mx-auto mt-1 flex max-w-5xl items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900">
                        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                        {turnsRemain} {turnsRemain === 1 ? "turn" : "turns"} remaining
                    </div>
                )}
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 px-3 py-2 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-4">
                <section style={{backgroundImage: "url("+chapterImage(scenario_name)+")"}} aria-label="Visit details" className="flex shrink-0 items-center gap-4 overflow-hidden rounded-xl border bg-card md:block md:self-start">
                    <img src={portrait} alt={persona.name} className="size-[clamp(4.5rem,16dvh,9rem)] shrink-0 object-cover md:aspect-square md:h-auto md:w-full" />
                    <div className="min-w-0 space-y-1 md:p-4">
                        <h2 className="font-semibold">{persona.name}</h2>
                        <Badge variant="secondary" className={`capitalize ${expressionBadge()}`}>{expression}</Badge>
                    </div>
                </section>
                <div ref={scrollRef} aria-label="Visit conversation" tabIndex={0} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-xl">
                    <div className="rounded-xl border bg-card">
                        {scene && (
                            <details className="border-t border-border">
                                <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-primary">Look around the flat</summary>
                                <div className="grid gap-2 px-3 pb-3 md:grid-cols-1">
                                    {observations.map(([name, hint]) => (
                                        <details key={name} className="rounded-lg bg-secondary px-3">
                                            <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold">{name}</summary>
                                            <p className="pb-3 text-sm leading-relaxed">{hint}</p>
                                        </details>
                                    ))}
                                </div>
                            </details>
                        )}
                        <details className="border-t border-border">
                            <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-primary">Coaching and rapport</summary>
                            <div className="space-y-3 px-3 pb-3">
                                {scenario_name !== "Resolve a Task" && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-muted-foreground">Rapport</span>
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                            <div className={`h-full transition-all duration-500 ${getHealthBarColor()}`} style={{ width: `${rapport}%` }} />
                                        </div>
                                        <span className="text-sm font-bold tabular-nums">{rapport}%</span>
                                    </div>
                                )}
                                {lastEvaluation && !conversationEnded && difficulty === "Easy" && (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                                        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                                        <p>{`Tip: ${suggestion}`}</p>
                                    </div>
                                )}
                                {!scene && difficulty === "Easy" && scenario_name === "Resolve a Task" && (
                                    <Button type="button" variant="outline" onClick={() => setShowSteps(true)} className="h-auto min-h-11 w-full justify-start whitespace-normal border-input px-3 py-2 text-left">
                                        <ClipboardList aria-hidden="true" className="size-4 shrink-0" />
                                        View steps to book a HealthHub appointment
                                    </Button>
                                )}
                            </div>
                        </details>
                    </div>

                    <section aria-label="Transcript" className="flex min-h-48 min-w-0 flex-col rounded-xl border border-border bg-card">
                        <h2 className="border-b border-border px-3 py-2.5 text-sm font-semibold md:px-4">Transcript</h2>
                        <div role="log" aria-label="Conversation messages" aria-live="polite" className="flex-1 space-y-3 px-3 py-3 md:px-4">
                            {messages.map((message) => (
                                <div key={message.mid} className={`flex min-w-0 flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}>
                                    <div className={`max-w-[92%] rounded-xl px-3 py-2.5 md:max-w-[85%] ${message.sender === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-secondary text-foreground"}`}>
                                        <p className="text-base leading-relaxed [overflow-wrap:anywhere]">{message.content}</p>
                                        <time dateTime={message.sent_at} className={`mt-1 block text-xs ${message.sender === "user" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                            {toLocalDate(message.sent_at)}
                                        </time>
                                    </div>
                                </div>
                            ))}
                            {botLoading && (
                                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
                                    <Spinner className="text-primary" />
                                    Typing…
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {assessmentRetry && (
                <Button type="button" variant="outline" disabled={evaluating} className="mx-3 my-1 min-h-11 self-center" onClick={async () => {
                    setEvaluating(true)
                    try {
                        const response = await fetch("/api/chat/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ converseId: verseId, ...assessmentRetry }) })
                        if (!response.ok) throw new Error("The assessment is still unavailable.")
                        const data = await response.json()
                        if (data.evaluation) {
                            setExpression(data.evaluation.expression)
                            setSuggestion(data.evaluation.suggestion)
                            setRapport(data.evaluation.rapport)
                            setSentiment(data.evaluation.sentiment)
                            setLastEvaluation(true)
                        }
                        applyProgress(data)
                        if (data.completionOverride) {
                            setMessages((previous) => previous.map((message) => message.mid === assessmentRetry.personaMessageId ? { ...message, content: data.completionOverride } : message))
                        }
                        setAssessmentRetry(null)
                    } catch {
                        toast({ title: "Assessment is still unavailable", description: "Please try again.", variant: "destructive" })
                    } finally {
                        setEvaluating(false)
                    }
                }}>Retry assessment</Button>
            )}
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
                {messageError}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setMessageError(null)}>Edit reply</Button>
                <Button disabled={botLoading || !inputValue.trim()} onClick={() => {
                    setMessageError(null)
                    void converse(inputValue)
                }}>Try again</Button>
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
                        <p className="text-sm font-semibold text-foreground">Step 1: Log in</p>
                        <p className="text-sm text-muted-foreground">Open the HealthHub app and log in using Singpass.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Step 2: Start enrolment</p>
                        <p className="text-sm text-muted-foreground">Tap the Healthier SG banner to begin your enrolment.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Step 3: Select profile</p>
                        <p className="text-sm text-muted-foreground">Choose your user profile for self-enrolment, and tap Enrol in Healthier SG to proceed.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Step 4: Choose your clinic</p>
                        <p className="text-sm text-muted-foreground">Tap Select preferred clinic. You will be shown up to 3 clinics based on your past visits and residential address. To select other clinics, tap Search/Filters and search by postal code or keyword, then tap Apply filters.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Step 5: Confirm your enrolment</p>
                        <p className="text-sm text-muted-foreground">Tap Confirm enrolment to complete your enrolment with your preferred clinic.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Step 6: Book your appointment</p>
                        <p className="text-sm text-muted-foreground">After selecting your clinic, you will be prompted to book your first Healthier SG appointment. Follow the on-screen instructions or contact your clinic directly if prompted. You can also tap Book/Manage appointment on the Health Plan tab to schedule your consultation.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setShowSteps(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

            <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>End this visit early?</DialogTitle>
                        <DialogDescription>The practice you have completed so far will be included in your results.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowEndConfirm(false)}>Keep practising</Button>
                        <Button type="button" onClick={() => void end(true)}>End and view results</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <footer className="shrink-0 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
                <div className="mx-auto max-w-5xl space-y-2">
                    {challenge && !conversationEnded && <details className="focus-tab"><summary>Your focus · {challenge.title}</summary><p>{difficulty === "Easy" ? challenge.cue : challenge.title}</p></details>}
                    {!!verseId && !conversationEnded && hintOptions.length > 0 && (
                        <details ref={hintsRef} className="rounded-lg border border-border bg-background">
                            <summary className="min-h-11 cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold text-primary">Show reply hints</summary>
                            <section aria-label="Reply hints" className="px-3 pb-2">
                                <p className="mb-2 text-sm text-muted-foreground" id="reply-hint-help">
                                    {inputValue.trim() ? "Clear your draft to use a hint. Your current draft has not changed." : "Choose an example to edit in your reply. Nothing will be sent."}
                                </p>
                                <div className="grid max-h-[min(18dvh,11rem)] min-w-0 gap-1.5 overflow-y-auto overscroll-contain pr-1 md:grid-cols-2">
                                    {hintOptions.map((hint) => (
                                        <Button key={hint} type="button" variant="outline" className="h-auto min-h-11 w-full min-w-0 justify-start whitespace-normal break-words border-input px-3 py-2 text-left text-sm leading-snug text-primary" disabled={!!inputValue.trim() || botLoading || evaluating || !!assessmentRetry} onClick={() => useHint(hint)}>
                                            <span className="min-w-0 break-words">{hint}</span>
                                        </Button>
                                    ))}
                                </div>
                            </section>
                        </details>
                    )}
                    {conversationEnded ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground" role="status">{endReason ? closeCopy[endReason] : "The visit has ended."}</p>
                            <Button type="button" className="min-h-11 w-full text-base font-semibold" disabled={loading || evaluating} onClick={() => void end()}>
                                View results
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={(event) => { event.preventDefault(); void converse() }} className="space-y-0.5">
                            <div className="flex min-w-0 items-center gap-2">
                                <Input
                                    ref={inputRef}
                                    aria-label="Type your reply"
                                    aria-describedby="reply-length"
                                    placeholder="Say something…"
                                    value={inputValue}
                                    onChange={(event) => setInputValue(event.target.value)}
                                    maxLength={200}
                                    disabled={!verseId || botLoading || evaluating || !!assessmentRetry}
                                    className="h-11 min-w-0 flex-1 border-input bg-background text-base md:text-base"
                                />
                                <Button type="submit" aria-label="Send reply" className="h-11 shrink-0 gap-2 px-3 sm:px-4" disabled={!inputValue.trim() || !verseId || botLoading || evaluating || !!assessmentRetry}>
                                    <Send aria-hidden="true" className="size-4" />
                                    Send
                                </Button>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <Button type="button" variant="ghost" size="sm" className="min-h-10 px-2 text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => setShowEndConfirm(true)} disabled={!verseId || botLoading || evaluating}>
                                    End visit early
                                </Button>
                                <span id="reply-length" className="pr-1 text-sm tabular-nums text-muted-foreground">
                                    <span className="sr-only">Characters used: </span>{inputValue.length}/200
                                </span>
                            </div>
                        </form>
                    )}
                </div>
            </footer>
        </div>
    )
}
