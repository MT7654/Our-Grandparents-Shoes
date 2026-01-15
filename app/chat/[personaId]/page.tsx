"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { ArrowLeft, Send, Lightbulb, Activity } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import type { Database } from '@/supabase/types'
import LoadingOverlay from "@/components/loading-overlay"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"

type Message = Database['public']['Tables']['messages']['Row']
type Expression = Database['public']['Enums']['eval_expression']
type Sentiment = Database['public']['Enums']['eval_sentiment']

export default function ChatTraining() {
    const params = useParams()
    const personaId = params.personaId as string
    const scrollRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [verseId, setVerseId] = useState<string>('')
    const [chatId, setChatId] = useState<string>('')
    const [personaName, setPersonaName] = useState<string>('Margaret Thompson')
    const [messages, setMessages] = useState<Message[]>([])
    const [rapport, setRapport] = useState<number>(50)
    const [sentiment, setSentiment] = useState<Sentiment>('neutral')
    const [expression, setExpression] = useState<Expression>("neutral")
    const [objective, setObjective] = useState("Get the senior to talk about how they met their spouse")
    const [suggestion, setSuggestion] = useState("Try asking about their day or showing interest in their well-being")
    const [avatarError, setAvatarError] = useState(false)
    const [lastEvaluation, setLastEvaluation] = useState(false)
    const [rapportChange, setRapportChange] = useState(0)
    const [inputValue, setInputValue] = useState("")

    // For Testing
    const [loadingView, setLoadingView] = useState<number>(1)
    const [loadSimulation, setLoadSimulation] = useState<boolean>(false)
    
    // Draggable test view selector state
    const [testViewPosition, setTestViewPosition] = useState({ x: 16, y: 16 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const testViewRef = useRef<HTMLDivElement>(null)

    // Start Conversation (Load Data)
    useEffect(() => {
        const begin = async () => {
            try {
                const [conversationResponse, personaResponse] = await Promise.all([
                    fetch('/api/chat/start', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            personaId: personaId
                        }), 
                    }),
                    fetch(`/api/personas?id=${personaId}`, { method: "GET" }),
                ])

                if (!personaResponse.ok) {
                    const errorData = await personaResponse.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to load persona (${personaResponse.status})`)
                }

                const { persona } = await personaResponse.json()
                
                if (!persona) {
                    throw new Error('Persona not found')
                }

                setPersonaName(persona.name)

                if (!conversationResponse.ok) {
                    const errorData = await conversationResponse.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to start conversation (${conversationResponse.status})`)
                }

                const conversationData = await conversationResponse.json()

                if (conversationData.error) {
                    throw new Error(conversationData.error)
                }

                if (!conversationData) {
                    throw new Error('Failed to initialize conversation')
                }

                const { chat, conversation, messages, evaluation } = conversationData
                setVerseId(conversation.vid)
                setChatId(conversation.cid)

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

                if (chat) {
                    setObjective(chat.objective)
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
                    router.push('/personas')
                }, 2000)
            } finally {
                setLoading(false)
            }
        }

        begin()
    }, [personaId, router, toast])

    // Converse 
    const converse = async () => {
        if (!inputValue.trim()) {
            return
        }

        setLoading(true)
        if (loadSimulation) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

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

            const { user_message, persona_message, evaluation, rapport_change } = data

            // Set Variables
            if (user_message) {
                setMessages(prev => [...prev, user_message, persona_message])
            } else {
                setMessages(prev => [...prev, persona_message])
            }
            

            if (evaluation) {
                // Update Avatar Expression
                setExpression(evaluation.expression)
                setAvatarError(false)

                // Update System Suggestion
                setSuggestion(evaluation.suggestion)

                // Update Rapport
                setRapport(evaluation.rapport)

                setSentiment(evaluation.sentiment)
                setLastEvaluation(true)
            }

            if (rapport_change) {
                setRapportChange(rapport_change)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
            console.error('Converse Error: ', error)
            toast({
                title: "Error sending message",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setInputValue("")
            setLoading(false)
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

    // Helpers
    const toLocalDate = (input: string) => {
        const localDate = new Date(input)
        return localDate.toLocaleTimeString([], { hour: "2-digit", minute: '2-digit' })
    }

    const getPortraitUrl = (name: String, expr: Expression) => {
        // Map expression to image filename
        // Images are named: Happy.jpg, Sad.jpg, Angry.jpg, Neutral.jpg, Shocked.jpg in public folder
    
        const emotionMap: Record<Expression, string> = {
            happy: "Happy",
            sad: "Sad",
            angry: "Angry",
            neutral: "Neutral",
            shocked: "Shocked",
        }
    
        const emotion = emotionMap[expr] || "Neutral"
        
        // Return the image path - images are shared for both personas
        return `/${name + " " + emotion}.jpg`
    }
    
    const handleAvatarError = () => {
        // Fallback to neutral avatar if image fails to load
        if (!avatarError) {
            setAvatarError(true)
            setExpression("neutral")
        }
    }

    // Auto-scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Draggable test view selector handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only start dragging if clicking on the container or drag handle, not on buttons or switch
        const target = e.target as HTMLElement
        const isButton = target.tagName === 'BUTTON' || target.closest('button')
        const isSwitch = target.closest('[data-slot="switch"]') || target.closest('[data-slot="switch-thumb"]')
        
        if (!isButton && !isSwitch) {
            e.preventDefault()
            if (testViewRef.current) {
                const rect = testViewRef.current.getBoundingClientRect()
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                })
                setIsDragging(true)
            }
        }
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && testViewRef.current) {
                const rect = testViewRef.current.getBoundingClientRect()
                const newX = e.clientX - dragOffset.x
                const newY = e.clientY - dragOffset.y
                
                // Constrain to viewport
                const maxX = window.innerWidth - rect.width
                const maxY = window.innerHeight - rect.height
                
                setTestViewPosition({
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                })
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.body.style.userSelect = 'none'
            document.body.style.cursor = 'grabbing'
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }
    }, [isDragging, dragOffset])

    const getHealthBarColor = () => {
        if (rapport >= 70) return "bg-emerald-500"
        if (rapport >= 40) return "bg-amber-500"
        return "bg-rose-500"
    }

    const getSentimentColor = (sentiment: "positive" | "neutral" | "negative") => {
        if (sentiment === "positive") return "text-emerald-600"
        if (sentiment === "negative") return "text-rose-600"
        return "text-gray-600"
    }

    return (
        <div className="min-h-screen bg-[#F5F6F8] pb-32">
        {/* Test View Selector - Draggable */}
        <div 
            ref={testViewRef}
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex flex-col gap-2 select-none"
            style={{
                left: `${testViewPosition.x}px`,
                top: `${testViewPosition.y}px`,
                userSelect: 'none',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Drag Handle */}
            <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <span className="text-gray-700 text-xs font-semibold">Test Controls</span>
                <span className="text-gray-400 text-xs">⋮⋮</span>
            </div>

            <div className="flex gap-1 items-center">
                <span className="text-gray-600 text-xs whitespace-nowrap">Loading:</span>
                <button
                    onClick={() => setLoadingView(1)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        loadingView === 1 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="View 1: With Overlay"
                >
                    1
                </button>
                <button
                    onClick={() => setLoadingView(2)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        loadingView === 2 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="View 2: No Overlay"
                >
                    2
                </button>
                <button
                    onClick={() => setLoadingView(3)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        loadingView === 3 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="View 3: Small Loader"
                >
                    3
                </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200">
                <span className="text-gray-600 text-xs whitespace-nowrap">Load Sim:</span>
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <span className="text-gray-600 text-xs">
                        {loadSimulation ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                        checked={loadSimulation}
                        onCheckedChange={setLoadSimulation}
                    />
                </div>
            </div>
        </div>
        {loadingView === 1 && <LoadingOverlay isLoading={loading} />}

        {/* Header */}
        <div className="border-b border-gray-200 bg-white shadow-sm">
            <div className="container mx-auto px-4 py-3">
            <Link href="/personas">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Personas
                </Button>
            </Link>
            </div>
        </div>

        <div className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
            {/* 1. Objective */}
            <Card className="bg-blue-50 border-blue-200 p-4">
            <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2 mb-1">🎯 Objective</h4>
            <p className="text-gray-700 text-sm leading-relaxed">{objective}</p>
            </Card>

            {/* 2. Rapport */}
            <Card className="bg-white border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-gray-800 text-sm">Rapport Level</h4>
                <span className="text-gray-900 font-bold text-lg">{rapport}%</span>
            </div>
            <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                <div
                className={`absolute inset-y-0 left-0 ${getHealthBarColor()} transition-all duration-500 rounded-full`}
                style={{ width: `${rapport}%` }}
                />
            </div>
            </Card>

            {/* 3. Avatar */}
            <Card className="bg-white border-gray-200 p-4 flex items-center gap-4">
            <div className="flex-shrink-0">
                <img
                src={getPortraitUrl(personaName, expression)}
                alt={`${personaName} - ${expression} expression`}
                className="w-[150px] h-[150px] max-[600px]:w-[120px] max-[600px]:h-[120px] object-cover rounded-full border-4 border-gray-300 transition-opacity duration-300"
                style={{ flex: "0 0 auto" }}
                onError={(e) => {
                    // Fallback to placeholder if image fails
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                    handleAvatarError()
                }}
                onLoad={() => setAvatarError(false)}
                />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900">{personaName}</h3>
            </div>
            </Card>

            {/* 4. Convo Tips / Suggestions */}
            <Card className="bg-amber-50 border-amber-200 p-4">
            <h4 className="font-bold text-amber-700 text-sm flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4" /> Conversation Tip
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed">{suggestion}</p>
            </Card>

            {lastEvaluation && (
            <Card className="bg-purple-50 border-purple-200 p-3">
                <h4 className="font-bold text-purple-700 text-xs flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5" /> AI Evaluation
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <span className="text-gray-600 font-medium">Sentiment:</span>
                    <p className={`font-bold capitalize ${getSentimentColor(sentiment)}`}>
                    {sentiment}
                    </p>
                </div>
                <div>
                    <span className="text-gray-600 font-medium">Expression:</span>
                    <p className="font-bold text-purple-700 capitalize">{expression}</p>
                </div>
                <div>
                    <span className="text-gray-600 font-medium">Rapport:</span>
                    <p className={`font-bold ${rapportChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {rapportChange >= 0 ? "+" : ""}
                    {rapportChange}
                    </p>
                </div>
                </div>
            </Card>
            )}

            {/* 5. Convo Log */}
            <Card className="bg-white border-gray-200 flex flex-col h-[400px]">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
                <h4 className="font-bold text-gray-800 text-sm">Conversation Log</h4>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1" ref={scrollRef}>
                {messages.map((message) => (
                <div key={message.mid} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                    }`}
                    >
                    <p className="leading-relaxed text-sm">{message.content}</p>
                    <span
                        className={`text-xs mt-1 block ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}
                    >
                        {toLocalDate(message.sent_at)}
                    </span>
                    </div>
                </div>
                ))}
            </div>

            {loadingView === 3 && loading && (<Spinner className="text-blue-600 ml-8" />)}

            </Card>

            {/* 6. End Training Button */}
            <Button 
                className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-semibold py-3.5 rounded-lg shadow-md"
                onClick={end}
            >
                End Training Session
            </Button>
        </div>

        {/* Input Bar */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-300 bg-white shadow-lg p-4">
            <div className="container mx-auto max-w-3xl">
            <div className="flex gap-2 items-center">
                <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !loading && converse()}
                disabled={loadingView === 3 && loading}
                className="flex-1 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button 
                    onClick={converse} 
                    size="icon" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loadingView === 3 && loading}
                >
                <Send className="w-4 h-4" />
                </Button>
            </div>
            </div>
        </div>
        </div>
    )
}