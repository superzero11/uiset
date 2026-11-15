import { useEffect, useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
  VerifyCodeForm,
} from "@/registry/uiset/ui/templates/auth"

const screens = ["sign-in", "sign-up", "forgot-password", "reset-password", "verify"] as const
type Screen = (typeof screens)[number]

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const brand = (
  <>
    <span className="template-logo" aria-hidden="true" />
    Acme Cloud
  </>
)

// The auth screens, wired the way an app would: links move between them, and sample
// handlers succeed or explain why not. Try "wrong" as the password, or 000000 as the code.
function AuthDemo() {
  const [screen, setScreen] = useState<Screen>("sign-in")
  useEffect(() => {
    const follow = () => {
      const hash = window.location.hash.slice(1) as Screen
      if (screens.includes(hash)) setScreen(hash)
    }
    follow()
    window.addEventListener("hashchange", follow)
    return () => window.removeEventListener("hashchange", follow)
  }, [])
  const go = (next: Screen) => {
    window.location.hash = next
    setScreen(next)
  }

  if (screen === "sign-up")
    return (
      <SignUpForm
        brand={brand}
        onSignUp={async () => {
          await wait(600)
          go("verify")
        }}
      />
    )
  if (screen === "forgot-password")
    return <ForgotPasswordForm brand={brand} onRequest={() => wait(600)} />
  if (screen === "reset-password")
    return (
      <ResetPasswordForm
        brand={brand}
        onReset={async () => {
          await wait(600)
          go("sign-in")
        }}
      />
    )
  if (screen === "verify")
    return (
      <VerifyCodeForm
        brand={brand}
        destination="ada@example.com"
        onVerify={async ({ code }) => {
          await wait(500)
          if (code === "000000") return "That code has expired. Send a new one."
          go("sign-in")
        }}
        onResend={() => wait(300)}
      />
    )
  return (
    <SignInForm
      brand={brand}
      onSignIn={async ({ password }) => {
        await wait(700)
        if (password === "wrong") return "That email and password don't match. Try again or reset it."
      }}
      alternatives={
        <>
          <Button variant="outline" type="button">
            Continue with a passkey
          </Button>
          <Button variant="outline" type="button">
            Email me a sign-in link
          </Button>
        </>
      }
    />
  )
}

export { AuthDemo, screens as authScreens }
