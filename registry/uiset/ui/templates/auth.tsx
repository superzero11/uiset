"use client"

import { inputHints } from "@ui-sdk/core"
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react"
import { Alert } from "../alert"
import { Button } from "../button"
import { Checkbox } from "../checkbox"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field"
import { Meter } from "../meter"
import { OTPInput } from "../otp-input"
import { PasswordInput, PasswordInputControl, PasswordInputToggle } from "../password-input"
import { Spinner } from "../spinner"
import "./templates.css"

// Sign in, sign up, forgot and reset password, and verify a code. Each form takes an
// async handler: return nothing on success, or a message to show (like "That password
// doesn't match"). Browser checks (required, email) run first, and the first problem
// takes focus; your message shows above the form and is announced.

type AuthResult = string | void | undefined
type Handler<Values> = (values: Values) => Promise<AuthResult> | AuthResult

function useAuthSubmit<Values>(handler: Handler<Values>, read: (form: FormData) => Values) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await handler(read(new FormData(event.currentTarget)))
      if (typeof result === "string" && result) setError(result)
      else setDone(true)
    } catch {
      setError("Something went wrong. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }
  return { error, pending, done, onSubmit, clearError: () => setError(null), showError: setError }
}

function SubmitButton({ pending, children, busy }: { pending: boolean; children: string; busy: string }) {
  // Stays enabled while busy, so focus never drops to the page; repeat presses are ignored.
  return (
    <Button type="submit" className="auth-submit" aria-disabled={pending || undefined} data-pending={pending ? "" : undefined}>
      {pending ? (
        <>
          <Spinner label={busy} /> <span aria-hidden="true">{busy}</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/** A centered panel with your brand, a heading and the form. Each auth screen uses it. */
function AuthLayout({
  brand,
  title,
  description,
  children,
  footer,
}: {
  brand?: ReactNode
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="auth-layout">
      <div className="auth-panel">
        {brand && <div className="auth-brand">{brand}</div>}
        <div className="auth-heading">
          <h1 className="auth-title">{title}</h1>
          {description && <p className="auth-description">{description}</p>}
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  )
}

type SignInValues = { email: string; password: string; remember: boolean }

function SignInForm({
  onSignIn,
  forgotHref = "#forgot-password",
  signUpHref = "#sign-up",
  alternatives,
  brand,
}: {
  onSignIn: Handler<SignInValues>
  forgotHref?: string
  signUpHref?: string
  /** Other ways in, like "Continue with a passkey", shown under a divider. */
  alternatives?: ReactNode
  brand?: ReactNode
}) {
  const form = useAuthSubmit(onSignIn, (data) => ({
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
    remember: data.get("remember") === "on",
  }))
  return (
    <AuthLayout
      brand={brand}
      title="Sign in"
      description="Welcome back."
      footer={
        <>
          New here? <a href={signUpHref}>Create an account</a>
        </>
      }
    >
      <form className="auth-form" onSubmit={form.onSubmit} aria-label="Sign in">
        {form.error && (
          <Alert tone="danger" urgent>
            {form.error}
          </Alert>
        )}
        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input type="email" required {...inputHints("email", { enter: "next" })} onValueChange={form.clearError} />
          <FieldError match="valueMissing">Enter your email address.</FieldError>
          <FieldError match="typeMismatch">Enter an email address like ada@example.com.</FieldError>
        </Field>
        <Field name="password">
          <div className="auth-label-row">
            <FieldLabel>Password</FieldLabel>
            <a href={forgotHref} className="auth-link">
              Forgot password?
            </a>
          </div>
          <PasswordInput required autoComplete="current-password" data-agent-secret="">
            <PasswordInputControl enterKeyHint="done" />
            <PasswordInputToggle aria-label="Show password" />
          </PasswordInput>
          <FieldError match="valueMissing">Enter your password.</FieldError>
        </Field>
        <Field name="remember" className="auth-check">
          <Checkbox />
          <FieldLabel>Keep me signed in</FieldLabel>
        </Field>
        <SubmitButton pending={form.pending} busy="Signing in…">
          Sign in
        </SubmitButton>
        {alternatives && (
          <>
            <p className="auth-divider">
              <span>or</span>
            </p>
            <div className="auth-alternatives">{alternatives}</div>
          </>
        )}
      </form>
    </AuthLayout>
  )
}

/** 0–4 from length and variety: a nudge, not a rule. Your server decides what's allowed. */
function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return password ? Math.max(1, score) : 0
}
const strengthWords = ["", "Weak", "Fair", "Good", "Strong"]

function NewPassword({ label, name = "password" }: { label: string; name?: string }) {
  const [password, setPassword] = useState("")
  const strength = passwordStrength(password)
  return (
    <Field name={name}>
      <FieldLabel>{label}</FieldLabel>
      <PasswordInput
        required
        autoComplete="new-password"
        data-agent-secret=""
        value={password}
        onValueChange={(value) => setPassword(value)}
      >
        <PasswordInputControl minLength={10} />
        <PasswordInputToggle aria-label={`Show ${label.toLowerCase()}`} />
      </PasswordInput>
      <FieldDescription>At least 10 characters. Longer is stronger.</FieldDescription>
      <Meter
        className="auth-strength"
        aria-label={`${label} strength`}
        value={strength}
        max={4}
        format={(value: number) => (value ? strengthWords[value]! : "Not set")}
        data-strength={strength}
        data-agent-hidden=""
      />
      <FieldError match="valueMissing">Choose a password.</FieldError>
      <FieldError match="tooShort">Use at least 10 characters.</FieldError>
    </Field>
  )
}

type SignUpValues = { name: string; email: string; password: string }

function SignUpForm({
  onSignUp,
  signInHref = "#sign-in",
  termsHref = "#terms",
  brand,
}: {
  onSignUp: Handler<SignUpValues>
  signInHref?: string
  termsHref?: string
  brand?: ReactNode
}) {
  const form = useAuthSubmit(onSignUp, (data) => ({
    name: String(data.get("name") ?? ""),
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
  }))
  return (
    <AuthLayout
      brand={brand}
      title="Create an account"
      description="It takes a minute."
      footer={
        <>
          Already have an account? <a href={signInHref}>Sign in</a>
        </>
      }
    >
      <form className="auth-form" onSubmit={form.onSubmit} aria-label="Create an account">
        {form.error && (
          <Alert tone="danger" urgent>
            {form.error}
          </Alert>
        )}
        <Field name="name">
          <FieldLabel>Full name</FieldLabel>
          <Input required {...inputHints("name", { enter: "next" })} />
          <FieldError match="valueMissing">Enter your name.</FieldError>
        </Field>
        <Field name="email">
          <FieldLabel>Work email</FieldLabel>
          <Input type="email" required {...inputHints("email", { enter: "next" })} onValueChange={form.clearError} />
          <FieldError match="valueMissing">Enter your email address.</FieldError>
          <FieldError match="typeMismatch">Enter an email address like ada@example.com.</FieldError>
        </Field>
        <NewPassword label="New password" />
        <Field name="terms" className="auth-check">
          <Checkbox required />
          <FieldLabel>
            I agree to the <a href={termsHref}>terms</a>
          </FieldLabel>
          <FieldError match="valueMissing">Accept the terms to continue.</FieldError>
        </Field>
        <SubmitButton pending={form.pending} busy="Creating your account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}

function ForgotPasswordForm({
  onRequest,
  signInHref = "#sign-in",
  brand,
}: {
  onRequest: Handler<{ email: string }>
  signInHref?: string
  brand?: ReactNode
}) {
  const [email, setEmail] = useState("")
  const form = useAuthSubmit(onRequest, (data) => ({ email: String(data.get("email") ?? "") }))
  return (
    <AuthLayout
      brand={brand}
      title={form.done ? "Check your email" : "Reset your password"}
      description={
        form.done
          ? `If ${email} has an account, a reset link is on its way. It works for 30 minutes.`
          : "Enter your email and we'll send you a link."
      }
      footer={<a href={signInHref}>Back to sign in</a>}
    >
      {form.done ? (
        <Alert tone="success" live>
          Link sent. You can close this page.
        </Alert>
      ) : (
        <form className="auth-form" onSubmit={form.onSubmit} aria-label="Reset your password">
          {form.error && (
            <Alert tone="danger" urgent>
              {form.error}
            </Alert>
          )}
          <Field name="email">
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              required
              value={email}
              onValueChange={(value) => setEmail(value)}
              {...inputHints("email", { enter: "send" })}
            />
            <FieldError match="valueMissing">Enter your email address.</FieldError>
            <FieldError match="typeMismatch">Enter an email address like ada@example.com.</FieldError>
          </Field>
          <SubmitButton pending={form.pending} busy="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  )
}

function ResetPasswordForm({
  onReset,
  brand,
}: {
  onReset: Handler<{ password: string }>
  brand?: ReactNode
}) {
  const [mismatch, setMismatch] = useState(false)
  const confirmId = useId()
  const form = useAuthSubmit(onReset, (data) => ({ password: String(data.get("password") ?? "") }))
  return (
    <AuthLayout brand={brand} title="Choose a new password" description="You'll use it the next time you sign in.">
      <form
        className="auth-form"
        aria-label="Choose a new password"
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget)
          if (data.get("password") !== data.get("confirm")) {
            event.preventDefault()
            setMismatch(true)
            document.getElementById(confirmId)?.focus()
            return
          }
          // They match now, whichever field changed.
          setMismatch(false)
          void form.onSubmit(event)
        }}
      >
        {form.error && (
          <Alert tone="danger" urgent>
            {form.error}
          </Alert>
        )}
        <NewPassword label="New password" />
        <Field name="confirm" invalid={mismatch ? true : undefined}>
          <FieldLabel>Confirm new password</FieldLabel>
          <PasswordInput
            required
            autoComplete="new-password"
            data-agent-secret=""
            onValueChange={() => setMismatch(false)}
          >
            <PasswordInputControl id={confirmId} />
            <PasswordInputToggle aria-label="Show confirmed password" />
          </PasswordInput>
          <FieldError match="valueMissing">Type the password again.</FieldError>
          {mismatch && <FieldError match>The passwords don't match.</FieldError>}
        </Field>
        <SubmitButton pending={form.pending} busy="Saving…">
          Save password
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}

function VerifyCodeForm({
  onVerify,
  onResend,
  destination,
  length = 6,
  brand,
}: {
  onVerify: Handler<{ code: string }>
  /** Sends a new code; the button waits 30 seconds between sends. */
  onResend?: () => void | Promise<void>
  /** Where the code went, like "ada@example.com". */
  destination: string
  length?: number
  brand?: ReactNode
}) {
  const [wait, setWait] = useState(30)
  const form = useAuthSubmit(onVerify, (data) => ({ code: String(data.get("code") ?? "") }))
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])
  return (
    <AuthLayout
      brand={brand}
      title="Enter your code"
      description={`We sent a ${length}-digit code to ${destination}.`}
    >
      <form className="auth-form" aria-label="Enter your code" onSubmit={form.onSubmit}>
        {form.error && (
          <Alert tone="danger" urgent>
            {form.error}
          </Alert>
        )}
        {/* The code field checks itself: empty and partial codes stop the submit with a message. */}
        <Field name="code">
          <FieldLabel>Verification code</FieldLabel>
          <OTPInput
            name="code"
            required
            maxLength={length}
            onValueChange={() => form.clearError()}
            autoComplete="one-time-code"
          />
          <FieldError match="valueMissing">Enter the {length}-digit code.</FieldError>
          <FieldError match="tooShort">Enter all {length} digits.</FieldError>
        </Field>
        <SubmitButton pending={form.pending} busy="Checking…">
          Verify
        </SubmitButton>
        {onResend && (
          <Button
            type="button"
            variant="ghost"
            aria-disabled={wait > 0 || undefined}
            onClick={async () => {
              if (wait > 0) return
              // The wait starts now, so a second press can't send a second code.
              setWait(30)
              try {
                await onResend()
              } catch {
                setWait(0)
                form.showError("Couldn't send a new code. Try again.")
              }
            }}
          >
            {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
          </Button>
        )}
      </form>
    </AuthLayout>
  )
}

export {
  AuthLayout,
  ForgotPasswordForm,
  passwordStrength,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
  VerifyCodeForm,
}
export type { AuthResult, SignInValues, SignUpValues }
