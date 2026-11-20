"use client"
import { useState, type FormEvent } from "react"
import { createAuthClient } from "@neondatabase/auth/next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
const client = createAuthClient()
export default function AuthPage() {
  const [mode, setMode] = useState<
    "login" | "recover" | "signup" | "verify" | "reset"
  >("login")
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [otp, setOtp] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus("")
    try {
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
  return (
    <main className="min-h-dvh grid place-items-center bg-[#faf6ec] px-4">
      <Card className="w-full max-w-md p-7">
        <h1 className="text-3xl font-semibold">
          {mode === "login"
            ? "Sign in"
            : mode === "recover"
              ? "Restore your practice history"
              : mode === "signup"
                ? "Create an account"
                : "Verify your email"}
        </h1>
        {mode === "recover" && (
          <p>
            Use your original account email and choose a new password. Your past
            visits will appear after verification.
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
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
            />
          </label>
          {mode !== "verify" && mode !== "recover" && (
            <label className="block">
              {mode === "login" ? "Password" : "New password"}
              <Input
                type="password"
                required
                minLength={mode === "login" ? 1 : 8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
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
          {mode === "signup" && (
            <label className="block">
              <input type="checkbox" required /> I consent to ConverseBetter
              collecting and using my personal data in accordance with the app’s
              privacy policy.
            </label>
          )}
          <p role="status">{status}</p>
          <Button disabled={busy}>
            {mode === "login"
              ? "Sign in"
              : mode === "reset"
                ? "Set password and sign in"
                : mode === "verify"
                  ? "Verify and sign in"
                  : "Send verification code"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-4">
          {(["login", "recover", "signup"] as const)
            .filter((m) => m !== mode)
            .map((m) => (
              <button
                key={m}
                className="underline"
                onClick={() => {
                  setMode(m)
                  setStatus("")
                }}
              >
                {m === "recover"
                  ? "Restore an existing account"
                  : m === "login"
                    ? "Sign in"
                    : "Create an account"}
              </button>
            ))}
        </div>
      </Card>
    </main>
  )
}
