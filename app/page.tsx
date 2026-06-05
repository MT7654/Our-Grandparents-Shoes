"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, BarChart3, Shield, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"
import LoadingOverlay from '@/components/loading-overlay'

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      setIsLoggedIn(true)
      
      // Try to get role from JWT token
      let role: string | null = null
      try {
        if (session.access_token) {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]))
          role = payload['user_role'] || null
        }
      } catch (e) {
        console.error('Error parsing JWT token:', e)
      }

      // If role not in token, fetch from database
      if (!role && session.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single()
          
          if (profile) {
            role = profile.role
          }
        } catch (e) {
          console.error('Error fetching role from database:', e)
        }
      }
      
      setUserRole(role)
    } else {
      setIsLoggedIn(false)
      setUserRole(null)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to logout")
      }

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })

      setIsLoggedIn(false)
      setUserRole(null)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to logout"
      toast({
        title: "Logout Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // For client side redirection
  const verify = async (target: string) => {
    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!session || sessionError) {
      return { hasSession: false, actualRole: null, isAuthorized: false }
    }

    // Try to get role from JWT token
    let role: string | null = null
    try {
      if (session.access_token) {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        role = payload['user_role'] || null
      }
    } catch (e) {
      console.error('Error parsing JWT token:', e)
    }

    // If role not in token, try to fetch from database
    if (!role && session.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        
        if (profile) {
          role = profile.role
        } else if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist - this shouldn't happen due to trigger, but handle it
          console.warn('Profile not found for user, defaulting to user role')
          role = 'user'
        }
      } catch (e) {
        console.error('Error fetching role from database:', e)
      }
    }

    // Default to 'user' if role is still null (new users default to user role)
    if (!role) {
      role = 'user'
    }

    const isAuthorized = role === target
    console.log('Role verification:', { role, target, isAuthorized })

    return { hasSession: true, actualRole: role, isAuthorized }
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

    console.log('Navigation check:', { isAuthorized, hasSession, actualRole, targetRole: role, successPath })

    if (isAuthorized) {
      console.log('Authorized, navigating to:', successPath)
      router.push(successPath)
      // Also use window.location as fallback to ensure navigation happens
      setTimeout(() => {
        if (window.location.pathname === '/') {
          window.location.href = successPath
        }
      }, 100)
    } else {
      if (hasSession) {
        console.log('Has session but wrong role:', { actualRole, targetRole: role })
        toast({
          description: sessionMessage,
          variant: "default",
        });
      } else {
        console.log('No session, redirecting to auth')
        toast({
          description: accountMessage,
          variant: "default",
        })
        router.push('/auth')
      }
    }

    setIsLoading(false)
  }

  const startTraining = async () => {
    await navigateWithRole({
      role: 'user',
      successPath: '/scenarios',
      sessionMessage: "Please log out and log in as a user to start your training session.",
      accountMessage: "This feature requires a user account. Please log in with your user credentials.",
    })
  }

  const startTracking = async () => {
    await navigateWithRole({
      role: 'user',
      successPath: '/dashboard',
      sessionMessage: "Please log out and log in as a user to track your progress.",
      accountMessage: "This feature requires a user account. Please log in with your user credentials.",
    })
  }

  const goToAdmin = async () => {
    await navigateWithRole({
      role: 'admin',
      successPath: '/admin',
      sessionMessage: "Please log out and log in as an admin to access the admin panel.",
      accountMessage: "This feature requires an admin account. Please log in with your admin credentials.",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <LoadingOverlay isLoading={isLoading} />
      
      {/* Logout Button - Top Right */}
      {isLoggedIn && (
        <div className="absolute top-4 right-4 z-10">
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      )}

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>Communication Training</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance inline-flex items-center justify-center gap-3">
              <span>ConverseBetter</span>
              <span className="inline-flex items-center px-2 py-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-800">beta</span>
            </h1>

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
              Admin Dashboard
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


