"use client"

import { announce } from "@ui-sdk/core"
import {
  PasswordInput as PasswordInputRoot,
  PasswordInputControl,
  PasswordInputToggle,
} from "@ui-sdk/react/password-input"
import { useEffect, useRef } from "react"
import type * as React from "react"

function PasswordInput({
  children,
  ...props
}: React.ComponentProps<typeof PasswordInputRoot>) {
  return (
    <PasswordInputRoot {...props}>
      {children ?? (
        <>
          <PasswordInputControl />
          <PasswordInputToggle aria-label="Show password" />
        </>
      )}
    </PasswordInputRoot>
  )
}

type PasswordRule = { label: string; test: (password: string) => boolean }
type PasswordRulesMessages = { met: string; unmet: string; allMet: string }

const rulesMessages: PasswordRulesMessages = { met: "Done", unmet: "To do", allMet: "Every rule is met" }

// The rules a new password has to meet, ticking off as it's typed. Each says "Done" or "To do"
// to a screen reader; when one changes it's announced, once, so typing stays quiet otherwise.
// The rules are yours: UI SDK imposes no password policy.
function PasswordRules({
  value,
  rules,
  messages,
  className,
  "aria-label": label = "Password rules",
  ...props
}: Omit<React.ComponentProps<"ul">, "children"> & {
  value: string
  rules: PasswordRule[]
  messages?: Partial<PasswordRulesMessages>
}) {
  const words = { ...rulesMessages, ...messages }
  const met = rules.map((rule) => rule.test(value))
  const key = met.map(Number).join("")
  const last = useRef(key)
  useEffect(() => {
    const before = last.current
    last.current = key
    if (before === key) return
    if (!key.includes("0")) return announce(words.allMet)
    const changed = rules.filter((_, i) => before[i] !== key[i]).map((rule) => `${key[rules.indexOf(rule)] === "1" ? words.met : words.unmet}: ${rule.label}`)
    announce(changed.join(". "))
  }, [key, rules, words])
  return (
    <ul className={["uiset-password-rules", className].filter(Boolean).join(" ")} aria-label={label} {...props}>
      {rules.map((rule, i) => (
        <li key={rule.label} data-met={met[i] ? "" : undefined}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {met[i] ? <path d="M3.5 8.5 6.5 11.5 12.5 4.5" /> : <circle cx="8" cy="8" r="2.5" />}
          </svg>
          <span className="uiset-password-rules-state">{met[i] ? words.met : words.unmet}: </span>
          {rule.label}
        </li>
      ))}
    </ul>
  )
}

export { PasswordInput, PasswordInputControl, PasswordInputToggle, PasswordRules }
export type { PasswordRule, PasswordRulesMessages }
export { createPasswordInputController } from "@ui-sdk/react/password-input"
