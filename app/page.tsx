"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, BarChart3, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"
import LoadingOverlay from '@/components/loading-overlay'

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // For client side redirection
  const verify = async (target: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const role = session?.access_token ? JSON.parse(atob(session.access_token.split('.')[1]))['user_role'] : null

    return { hasSession: !!session, actualRole: role, isAuthorized: session && role == target }
  }

  const navigateWithRole = async ({
    role, 
    successPath, 
    sessionMessage,
    accountMessage,
  }: {
    role: 'user' | 'admin'
    successPath: string
    sessionMessage: string
    accountMessage: string
  }) => {
    setIsLoading(true)

    const { isAuthorized, hasSession, actualRole } = await verify(role)

    if (isAuthorized) {
      router.push(successPath)
    } else {
      if (!hasSession) {
        toast({
          description: sessionMessage,
          variant: "default",
        });
      } else {
        toast({
          description: accountMessage,
          variant: "default",
        })
      }
    }

    setIsLoading(false)
  }

  const startTraining = async () => {
    await navigateWithRole({
      role: 'user',
      successPath: '/personas',
      sessionMessage: "Please log in as a user to start your training session.",
      accountMessage: "This feature requires a user account. Please log in with your user credentials.",
    })
  }

  const startTracking = async () => {
    await navigateWithRole({
      role: 'user',
      successPath: '/dashboard',
      sessionMessage: "Please log in as a user to track your progress.",
      accountMessage: "This feature requires a user account. Please log in with your user credentials.",
    })
  }

  const goToAdmin = async () => {
    await navigateWithRole({
      role: 'admin',
      successPath: '/admin',
      sessionMessage: "Please log in as an admin to access the admin panel.",
      accountMessage: "This feature requires an admin account. Please log in with your admin credentials.",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <LoadingOverlay isLoading={isLoading} />
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>Communication Training</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">Senior Conversation Trainer</h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              Build meaningful connections through practice. Learn to communicate with empathy, clarity, and confidence
              with senior citizens.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto" onClick={() => startTraining()}>
              Start Training
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 w-full sm:w-auto bg-transparent"
              onClick={() => startTracking()}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Track My Progress
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 w-full sm:w-auto bg-transparent"
              onClick={() => goToAdmin()}
            >
              <Shield className="w-5 h-5 mr-2" />
              Admin Login
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Practice Conversations</CardTitle>
                <CardDescription>Engage in realistic dialogues with AI-powered senior personas</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <CardTitle>Real-Time Feedback</CardTitle>
                <CardDescription>Get instant suggestions on empathy, tone, and conversational flow</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>Monitor your improvement with detailed scores and completion badges</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


