"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageCircle, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"

export default function LandingPage() {
  const router = useRouter();

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // For client side redirection
  const verify = async (nextPath: string) => {
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      router.push(`/${nextPath}`) 
    } else {
      setIsAuthOpen(true)
      setIsLoading(false)
    } 
  }

  const startTraining = () => {
    setIsLoading(true)
    verify('personas')
  }

  const startTracking = () => {
    setIsLoading(true)
    verify('dashboard')
  }

  if (isLoading) return null

  if (isAuthOpen) {
    return <AuthScreen onBack={() => setIsAuthOpen(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
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

function AuthScreen({ onBack }: { onBack: () => void }) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  async function login() {
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid email or password",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/personas");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function register() {
    if (!registerName || !registerEmail || !registerPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          metadata: { full_name: registerName }
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Registration Failed",
          description: result.error || "Failed to create account",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Registration Successful",
        description: "Account created! Redirecting...",
      });
      router.push("/personas");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit mb-2">
            ← Back
          </Button>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue your conversation training journey</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={login}>Sign In</Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="John Doe"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={register}>Register</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
