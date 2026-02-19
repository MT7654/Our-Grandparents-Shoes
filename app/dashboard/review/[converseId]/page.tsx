"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
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

function getScenarioIcon(scenario: string) {
  switch (scenario) {
    case "House Visit":
      return <Home className="w-4 h-4 text-blue-600" />
    case "Listening Ear":
      return <Heart className="w-4 h-4 text-purple-600" />
    case "Resolve a Task":
      return <CheckSquare className="w-4 h-4 text-green-600" />
    default:
      return null
  }
}

function getScenarioBg(scenario: string) {
  switch (scenario) {
    case "House Visit":
      return "bg-blue-50 border-blue-200"
    case "Listening Ear":
      return "bg-purple-50 border-purple-200"
    case "Resolve a Task":
      return "bg-green-50 border-green-200"
    default:
      return "bg-gray-50 border-gray-200"
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
      <div className="min-h-screen bg-[#F5F6F8]">
        <LoadingOverlay isLoading />
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">{review == null ? 'Session not found.' : error ?? 'Something went wrong.'}</p>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 bg-transparent text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Session Review</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detailed feedback for your conversation with Margaret Chan.
          </p>
        </div>

        {/* Session Meta */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${getScenarioBg(review.scenario)}`}>
              {getScenarioIcon(review.scenario)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{review.scenario}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 border-gray-300 text-gray-600">
                  {review.difficulty}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Objective Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Objective Status
          </h2>
          <div className="flex items-center gap-2">
            {review.objective_met ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <Badge className="bg-green-100 text-green-800 border-0 text-sm font-semibold">
                  Completed
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <Badge className="bg-gray-100 text-gray-700 border-0 text-sm font-semibold">
                  Not Completed
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Good Conversational Prompts */}
        {review.goodPrompts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
              <ThumbsUp className="w-4 h-4 text-green-700" />
              <h2 className="text-sm font-bold text-green-800">Good Conversational Prompts</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {review.goodPrompts.map((item, index) => (
                <div key={index} className="p-4 space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">
                      {'"'}
                      {item.userMessage}
                      {'"'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed pl-1">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs Improvement */}
        {review.needsImprovement.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-800">Needs Improvement</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {review.needsImprovement.map((item, index) => (
                <div key={index} className="p-4 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">
                      {'"'}
                      {item.userMessage}
                      {'"'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed pl-1">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Feedback */}
        {review.feedback && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-200">
              <MessageCircle className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-blue-800">Overall Feedback</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{review.feedback}</p>
            </div>
          </div>
        )}

        {/* View Conversation History */}
        <Link href={`/dashboard/review/${converseId}/chat`}>
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">View Conversation History</p>
                  <p className="text-xs text-gray-500">Review the full conversation log</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
            </div>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/scenarios" className="flex-1">
            <Button
              variant="outline"
              className="w-full bg-transparent border-gray-300 text-gray-800 hover:bg-gray-100"
            >
              Try Another Scenario
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}