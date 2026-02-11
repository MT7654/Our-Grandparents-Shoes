"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Home, Heart, CheckSquare } from "lucide-react"

const scenarios = [
  {
    id: "house-visit",
    name: "House Visit",
    description: "Practice short, polite social visits with practical conversations",
    icon: Home,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    instructions: [
      "Keep conversation short and polite",
      "Ask clear, practical questions",
      "Stay focused on the purpose of the visit",
    ],
    cta: "Start House Visit",
  },
  {
    id: "listening-ear",
    name: "Listening Ear",
    description: "Learn to provide emotional support and validation",
    icon: Heart,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    instructions: [
      "Encourage the senior to talk",
      "Validate emotions and feelings",
      "Do not rush or interrupt",
      "Avoid giving solutions unless asked",
    ],
    cta: "Start Listening Session",
  },
  {
    id: "resolve-task",
    name: "Resolve a Task",
    description: "Practice helping seniors complete practical tasks with patience",
    icon: CheckSquare,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    instructions: [
      "Explain steps clearly and slowly",
      "Break tasks into simple parts",
      "Check understanding frequently",
      "Be patient and reassuring",
    ],
    cta: "Start Task Training",
  },
]

export default function ScenarioSelection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <h1 className="text-4xl font-bold mb-2 text-balance">Choose What You Want to Practice</h1>
            <p className="text-lg text-muted-foreground">Select a training scenario to begin</p>
          </div>

          {/* Persona Context - Static */}
          <Card className="mb-8 border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <img
                  src="/elderly-woman-cartoon-avatar-smiling-grandmother.jpg"
                  alt="Margaret Chan"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
                <div>
                  <CardTitle className="text-2xl">Margaret Chan</CardTitle>
                  <CardDescription className="text-base mt-1 leading-relaxed">
                    A warm and friendly senior who enjoys conversation. You'll practice different scenarios with Margaret.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Scenario Selection Cards */}
          <div className="space-y-6">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon
              return (
                <Card
                  key={scenario.id}
                  className={`border-2 ${scenario.borderColor} ${scenario.bgColor} hover:shadow-lg transition-all`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-white border ${scenario.borderColor}`}>
                        <Icon className={`w-8 h-8 ${scenario.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-1">{scenario.name}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">{scenario.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        How to Approach This Scenario
                      </h3>
                      <ul className="space-y-1.5">
                        {scenario.instructions.map((instruction, index) => (
                          <li key={index} className="text-sm leading-relaxed flex items-start gap-2">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href={`/chat/margaret?scenario=${scenario.id}`} className="block">
                      <Button className="w-full" size="lg">
                        {scenario.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
