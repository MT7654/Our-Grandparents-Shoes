"use client"

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
} from "lucide-react"
import { useParams } from "next/navigation"

interface FeedbackItem {
  userMessage: string
  explanation: string
}

interface SessionReview {
  scenario: "House Visit" | "Listening Ear" | "Resolve a Task"
  difficulty: "Easy" | "Hard"
  date: string
  objectiveCompleted: boolean
  goodPrompts: FeedbackItem[]
  needsImprovement: FeedbackItem[]
}

// Placeholder data - in real app this comes from backend
const sessionReviews: Record<string, SessionReview> = {
  "1": {
    scenario: "Listening Ear",
    difficulty: "Easy",
    date: "2025-01-28",
    objectiveCompleted: true,
    goodPrompts: [
      {
        userMessage:
          "That sounds like it was really important to you. Can you tell me more about that time?",
        explanation:
          "This message validates the senior's feelings and uses an open-ended follow-up to encourage them to share more, without rushing or redirecting.",
      },
      {
        userMessage: "I can see why that memory means so much to you.",
        explanation:
          "A simple acknowledgment that shows empathy and active listening. It lets the senior know their story is being heard without shifting focus to yourself.",
      },
    ],
    needsImprovement: [
      {
        userMessage: "Yeah, but anyway, what about your kids?",
        explanation:
          "This abruptly changed the topic while the senior was still sharing. A better approach would be to let them finish before transitioning naturally.",
      },
    ],
  },
  "2": {
    scenario: "House Visit",
    difficulty: "Hard",
    date: "2025-01-27",
    objectiveCompleted: false,
    goodPrompts: [
      {
        userMessage: "Good morning! I just wanted to check in and see how you're doing today.",
        explanation:
          "A warm, non-intrusive greeting that sets a friendly tone for the visit.",
      },
    ],
    needsImprovement: [
      {
        userMessage: "You should try going out more, it would help.",
        explanation:
          "Offering unsolicited advice can feel dismissive. Instead, try reflecting what they said back to them or asking what they feel would help.",
      },
      {
        userMessage: "I don't have much time, so let's get to the point.",
        explanation:
          "This feels rushed and impersonal. Even brief visits benefit from a moment of friendly conversation before addressing practical matters.",
      },
    ],
  },
  "3": {
    scenario: "Resolve a Task",
    difficulty: "Easy",
    date: "2025-01-26",
    objectiveCompleted: true,
    goodPrompts: [
      {
        userMessage:
          "Let's take this one step at a time. First, can you show me where the remote is?",
        explanation:
          "Breaking the task into small, clear steps helps the senior feel confident and avoids overwhelm.",
      },
      {
        userMessage: "You're doing great! Just one more step.",
        explanation:
          "Encouragement during the task helps maintain confidence and patience.",
      },
    ],
    needsImprovement: [
      {
        userMessage: "No, that's wrong. Press the other button.",
        explanation:
          "This correction feels blunt. A gentler approach like 'Almost! Try the button next to it' would preserve dignity while still guiding.",
      },
    ],
  },
  "4": {
    scenario: "Listening Ear",
    difficulty: "Hard",
    date: "2025-01-25",
    objectiveCompleted: true,
    goodPrompts: [
      {
        userMessage: "Take your time, there's no rush.",
        explanation:
          "This reassures the senior that the conversation is patient and unhurried, which helps build trust and comfort.",
      },
    ],
    needsImprovement: [
      {
        userMessage: "I know exactly how you feel, the same thing happened to me.",
        explanation:
          "While well-intentioned, redirecting to your own experience can minimize their feelings. Try staying focused on their story.",
      },
    ],
  },
}

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
  const sessionId = params.sessionId as string
  const review = sessionReviews[sessionId]

  if (!review) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">Session not found.</p>
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
            {review.objectiveCompleted ? (
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
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
