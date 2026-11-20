"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { createAuthClient } from "@neondatabase/auth/next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
const client = createAuthClient()
export default function AuthPage() {
  const [mode, setMode] = useState<
    "login" | "recover" | "signup" | "verify" | "reset" | "betaSignup" | "betaLogin"
  >("login")
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [otp, setOtp] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false)
  const [betaEnabled, setBetaEnabled] = useState(false)
  const [betaSessionPresent, setBetaSessionPresent] = useState(false)
  const [consent, setConsent] = useState(false)
  const isBeta = mode === "betaLogin" || mode === "betaSignup"
  const isSignup = mode === "signup" || mode === "betaSignup"
  const isLogin = mode === "login" || mode === "betaLogin"
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/beta/status", { cache: "no-store", signal: controller.signal })
      .then(async res => {
        if (res.ok && !controller.signal.aborted) {
          const result = await res.json()
          if (!controller.signal.aborted) {
            setBetaEnabled(result.enabled === true)
            if (result.active) location.replace("/scenarios")
            else setBetaSessionPresent(result.needsAccountSwitch === true)
          }
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus("")
    try {
      if (isBeta) {
        const response = await fetch(mode === "betaSignup" ? "/api/beta/signup" : "/api/beta/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "betaSignup" ? { email, password, name: name.trim(), consent } : { email, password })
        })
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw Error(typeof body?.error === "string" ? body.error : "Unable to finish beta sign-in.")
        }
        location.assign("/scenarios")
        return
      }
      if (mode === "recover") {
        // Initialize an unusable credential if this historical email has not yet activated.
        const created = await client.signUp.email({
          email,
          password: crypto.randomUUID() + crypto.randomUUID(),
          name: "Volunteer"
        })
        if (
          created.error &&
          ![
            "USER_ALREADY_EXISTS",
            "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ].includes(created.error.code ?? "")
        )
          throw Error(created.error.message)
        const sent = await client.emailOtp.requestPasswordReset({ email })
        if (sent.error) throw Error(sent.error.message)
        setMode("reset")
        setStatus(
          "Enter the password reset code from your email and choose a new password."
        )
        return
      }
      if (mode === "reset") {
        const result = await client.emailOtp.resetPassword({
          email,
          otp,
          password
        })
        if (result.error) throw Error(result.error.message)
      }
      if (mode === "signup") {
        const result = await client.signUp.email({
          email,
          password,
          name: name.trim() || "Volunteer"
        })
        if (
          result.error &&
          ![
            "USER_ALREADY_EXISTS",
            "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ].includes(result.error.code ?? "")
        )
          throw Error(result.error.message)
        // Send explicitly so a returning user can request a fresh verification code.
        const sent = await client.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification"
        })
        if (sent.error) throw Error(sent.error.message)
        setMode("verify")
        setStatus("Enter the code sent to your email.")
        return
      }
      if (mode === "verify") {
        const result = await client.emailOtp.verifyEmail({ email, otp })
        if (result.error) throw Error(result.error.message)
      }
      const result = await client.signIn.email({ email, password })
      if (result.error) throw Error(result.error.message)
      const response = await fetch("/api/auth/session", { cache: "no-store" })
      if (!response.ok)
        throw Error(
          "Your account could not be linked. Contact your coordinator."
        )
      const { user } = await response.json()
      location.assign(user.role === "admin" ? "/admin" : "/scenarios")
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unable to finish sign-in.")
    } finally {
      setBusy(false)
    }
  }
  async function signOutToSwitch() {
    setBusy(true)
    setStatus("")
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw Error()
      location.reload()
    } catch {
      setStatus("Could not sign out. Please try again before switching accounts.")
      setBusy(false)
    }
  }

  if (betaSessionPresent) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] grid place-items-center bg-background px-4 py-8">
        <Card className="w-full max-w-md gap-5 rounded-2xl p-6 sm:p-9">
          <h1 className="text-3xl font-semibold">Switch accounts</h1>
          <p>Sign out of beta before signing in with another account.</p>
          <p role="status">{status}</p>
          <Button disabled={busy} onClick={signOutToSwitch}>Sign out to switch accounts</Button>
          {betaEnabled && <Link href="/scenarios" className="underline">Back to practice</Link>}
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] grid place-items-center bg-background px-4 py-8">
      <Card className="w-full max-w-md gap-5 rounded-2xl p-6 sm:p-9">
        <h1 className="text-3xl font-semibold">
          {mode === "betaSignup" ? "Create a beta volunteer account"
            : mode === "betaLogin" ? "Sign in to your beta volunteer account"
            : mode === "login"
            ? "Sign in"
            : mode === "recover"
              ? "Restore your practice history"
              : mode === "signup"
                ? "Create an account"
                : mode === "reset" ? "Set a new password" : "Verify your email"}
        </h1>
        {mode === "login" && (
          <p className="text-sm text-muted-foreground">
            Volunteers can sign in for live AI practice and type their own responses to Margaret.
          </p>
        )}
        {mode === "betaSignup" && (
          <p className="text-sm text-muted-foreground">
            You can use a burner email. We won’t send a code or link this account to earlier practice. Keep your password safe: beta accounts can’t be reset by email.
          </p>
        )}
        {mode === "betaLogin" && (
          <p className="text-sm text-muted-foreground">
            Use the email and password you chose for this beta account. For an older account or coordinator access, use existing account sign-in.
          </p>
        )}
        {mode === "recover" && (
          <p>
            Use your original account email and choose a new password. Your past
            visits will appear after verification.
          </p>
        )}
        <form onSubmit={submit} className="auth-form space-y-4">
          {isSignup && (
            <label className="block">
              Name
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            Email
            <Input
              type="email"
              required
              value={email}
              readOnly={mode === "verify" || mode === "reset"}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={isBeta ? 254 : undefined}
            />
          </label>
          {mode !== "verify" && mode !== "recover" && (
            <label className="block">
              {isLogin ? "Password" : "New password"}
              <Input
                type="password"
                required
                minLength={isLogin ? 1 : mode === "betaSignup" ? 12 : 8}
                maxLength={isBeta ? 128 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  isLogin ? "current-password" : "new-password"
                }
              />
            </label>
          )}
          {(mode === "verify" || mode === "reset") && (
            <label className="block">
              Verification code
              <Input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </label>
          )}
          {isSignup && (
            <label className="block">
              <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /> I consent to ConverseBetter
              collecting and using my personal data in accordance with the app’s
              privacy policy.
            </label>
          )}
          <p role="status">{status}</p>
          <Button className="w-full" disabled={busy}>
            {mode === "betaSignup" ? "Create beta account"
              : mode === "betaLogin" ? "Sign in to beta"
              : mode === "login" ? "Sign in"
              : mode === "reset"
                ? "Set password and sign in"
                : mode === "verify"
                  ? "Verify and sign in"
                  : "Send verification code"}
          </Button>
        </form>
        {mode === "login" && (
          <div className="space-y-2 border-t pt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/guest">Try guided demo</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Choose from scripted responses in a guided visit. No account is needed, and the visit is not saved.
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-3 text-sm text-primary">
          {(betaEnabled ? ["login", "recover", "betaSignup", "betaLogin"] as const : ["login", "recover", "signup"] as const)
            .filter((m) => m !== mode)
            .map((m) => (
              <button
                key={m}
                className="underline"
                onClick={() => {
                  setMode(m)
                  setPassword("")
                  setOtp("")
                  setConsent(false)
                  setStatus("")
                }}
              >
                {m === "recover"
                  ? "Restore an existing account"
                  : m === "login"
                    ? betaEnabled ? "Existing account or coordinator sign-in" : "Sign in"
                    : m === "betaSignup" ? "Create a beta account"
                    : m === "betaLogin" ? "Sign in to beta"
                    : "Create an account"}
              </button>
            ))}
        </div>
      </Card>
    </main>
  )
}
