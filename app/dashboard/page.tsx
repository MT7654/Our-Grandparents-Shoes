"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
  MessageCircle,
  Home,
  Heart,
  CheckSquare,
  ChevronRight,
  Lock,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface PastSession {
  id: string
  scenario: "House Visit" | "Listening Ear" | "Resolve a Task"
  difficulty: "Easy" | "Hard"
  date: string
  objectiveCompleted: boolean
}

const pastSessions: PastSession[] = [
  {
    id: "1",
    scenario: "Listening Ear",
    difficulty: "Easy",
    date: "2025-01-28",
    objectiveCompleted: true,
  },
  {
    id: "2",
    scenario: "House Visit",
    difficulty: "Hard",
    date: "2025-01-27",
    objectiveCompleted: false,
  },
  {
    id: "3",
    scenario: "Resolve a Task",
    difficulty: "Easy",
    date: "2025-01-26",
    objectiveCompleted: true,
  },
  {
    id: "4",
    scenario: "Listening Ear",
    difficulty: "Hard",
    date: "2025-01-25",
    objectiveCompleted: true,
  },
]

interface Achievement {
  id: string
  label: string
  icon: typeof CheckCircle2
  unlocked: boolean
}

const achievements: Achievement[] = [
  {
    id: "first-convo",
    label: "First Conversation Completed",
    icon: MessageCircle,
    unlocked: true,
  },
  {
    id: "all-scenarios",
    label: "All 3 Scenarios Completed",
    icon: CheckSquare,
    unlocked: true,
  },
  {
    id: "all-hard",
    label: "All Scenarios Completed on Hard",
    icon: Lock,
    unlocked: false,
  },
]

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

export default function ProgressDashboard() {
  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 bg-transparent text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
              <p className="text-sm text-gray-600 mt-1">Review your past conversations</p>
            </div>
            <Link href="/personas">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                Train
              </Button>
            </Link>
          </div>
        </div>

        {/* Past Conversations - Primary Section */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Past Conversations</h2>

          {pastSessions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-sm text-gray-600">No conversations yet. Start your first training session.</p>
              <Link href="/personas">
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Start Training</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {pastSessions.map((session) => (
                <Link key={session.id} href={`/dashboard/review/${session.id}`} className="block">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Scenario Icon */}
                        <div className={`p-2 rounded-lg border ${getScenarioBg(session.scenario)}`}>
                          {getScenarioIcon(session.scenario)}
                        </div>

                        {/* Session Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{session.scenario}</span>
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0 border-gray-300 text-gray-600"
                            >
                              {session.difficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {new Date(session.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-xs text-gray-400">-</span>
                            {session.objectiveCompleted ? (
                              <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                <XCircle className="w-3 h-3" />
                                Not Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Achievements - Secondary Section */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Achievements</h2>
          <div className="space-y-2">
            {achievements.map((achievement) => {
              const Icon = achievement.icon
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 bg-white border rounded-lg p-3 ${
                    achievement.unlocked ? "border-gray-200" : "border-gray-200 opacity-50"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      achievement.unlocked ? "bg-green-50 border border-green-200" : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {achievement.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${achievement.unlocked ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {achievement.label}
                  </span>
                  {achievement.unlocked && (
                    <Badge className="ml-auto bg-green-100 text-green-800 border-0 text-xs">Unlocked</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
