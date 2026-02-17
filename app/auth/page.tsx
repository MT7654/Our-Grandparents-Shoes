"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@/lib/supabase/client'

export default function AuthScreen() {
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [registerName, setRegisterName] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [consentChecked, setConsentChecked] = useState(false);
  
    const router = useRouter();
    const { toast } = useToast();

    const onBack = () => {
      router.push("/")
    }
  
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

        // Refresh the session to get the updated token with role claim
        const supabase = createClient()
        await supabase.auth.refreshSession()

        // Get the role from the refreshed session or database
        const { data: { session: refreshedSession } } = await supabase.auth.getSession()
        
        let role: string | null = null
        
        // Try to get role from JWT token
        try {
          if (refreshedSession?.access_token) {
            const payload = JSON.parse(atob(refreshedSession.access_token.split('.')[1]))
            role = payload['user_role'] || null
          }
        } catch (e) {
          console.error('Error parsing JWT token:', e)
        }

        // If role not in token, fetch from database
        if (!role && refreshedSession?.user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', refreshedSession.user.id)
              .single()
            
            if (profile) {
              role = profile.role
            }
          } catch (e) {
            console.error('Error fetching role from database:', e)
          }
        }

        // Default to 'user' if role is still null
        if (!role) {
          role = 'user'
        }

        if (role === 'admin') {
          router.push('/admin');
        } else {
          router.push("/scenarios");
        }
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
      if (!registerName || !registerEmail || !registerPassword || !consentChecked) {
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

        router.push("/scenarios");
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

                <div className="flex items-start space-x-2">
                  <input
                    id="consent"
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <Label htmlFor="consent" className="text-xs text-gray-700">
                    I consent to TalkBetter: Senior Care collecting and using my personal data in accordance with the app's privacy policy.
                  </Label>
                </div>

                <Button className="w-full" onClick={register}>Register</Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }