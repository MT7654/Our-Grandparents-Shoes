"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageCircle } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)

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

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">TalkBetter: Senior Care</h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              Build meaningful connections with seniors through thoughtful communication.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto" onClick={() => setIsAuthOpen(true)}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthScreen({ onBack }: { onBack: () => void }) {
  const [consentChecked, setConsentChecked] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit mb-2">
            ← Back
          </Button>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in or create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="••••••••" />
              </div>
              <Link href="/personas">
                <Button className="w-full">Sign In</Button>
              </Link>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input id="register-name" type="text" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" type="password" placeholder="••••••••" />
              </div>

              {/* Consent Checkbox */}
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

              <Link href={consentChecked ? "/personas" : "#"}>
                <Button className="w-full" disabled={!consentChecked}>
                  Create Account
                </Button>
              </Link>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
