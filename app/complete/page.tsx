"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { CheckCircle2, XCircle, ThumbsUp, AlertTriangle } from "lucide-react"

interface FeedbackItem {
  userMessage: string
  explanation: string
}

export default function ConversationComplete() {
  // Placeholder data - in real app this comes from backend evaluation
  const objectiveCompleted = true

  const goodPrompts: FeedbackItem[] = [
    {
      userMessage: "That sounds like it was really important to you. Can you tell me more about that time?",
      explanation:
        "This message validates the senior's feelings and uses an open-ended follow-up to encourage them to share more, without rushing or redirecting.",
    },
    {
      userMessage: "I can see why that memory means so much to you.",
      explanation:
        "A simple acknowledgment that shows empathy and active listening. It lets the senior know their story is being heard without shifting focus to yourself.",
    },
    {
      userMessage: "Take your time, there's no rush.",
      explanation:
        "This reassures the senior that the conversation is patient and unhurried, which helps build trust and comfort.",
    },
  ]

  const needsImprovement: FeedbackItem[] = [
    {
      userMessage: "Yeah, but anyway, what about your kids?",
      explanation:
        "This abruptly changed the topic while the senior was still sharing. A better approach would be to let them finish before transitioning naturally.",
    },
    {
      userMessage: "You should try going out more, it would help.",
      explanation:
        "Offering unsolicited advice can feel dismissive. Instead, try reflecting what they said back to them or asking what they feel would help.",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Conversation Ended</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your session with Margaret Chan has concluded. Here is your feedback.
          </p>
        </div>

        {/* Objective Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Objective Status</h2>
          <div className="flex items-center gap-2">
            {objectiveCompleted ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <Badge className="bg-green-100 text-green-800 border-0 text-sm font-semibold">Completed</Badge>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <Badge className="bg-gray-100 text-gray-700 border-0 text-sm font-semibold">Not Completed</Badge>
              </>
            )}
          </div>
        </div>

        {/* Good Conversational Prompts */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
            <ThumbsUp className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-bold text-green-800">Good Conversational Prompts</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {goodPrompts.map((item, index) => (
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

        {/* Needs Improvement */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-amber-800">Needs Improvement</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {needsImprovement.map((item, index) => (
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/personas" className="flex-1">
            <Button
              variant="outline"
              className="w-full bg-transparent border-gray-300 text-gray-800 hover:bg-gray-100"
            >
              Try Another Scenario
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
