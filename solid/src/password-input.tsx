import type { ComponentProps } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { PasswordInput as PasswordInputRoot, PasswordInputControl, PasswordInputToggle } from "@ui-sdk/solid/password-input"
import { createEffect, For, omit } from "solid-js"

function PasswordInput(props: ComponentProps<typeof PasswordInputRoot>) {
  return (
    <PasswordInputRoot {...omit(props, "children")}>
      {props.children ?? (
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
function PasswordRules(
  props: Omit<ComponentProps<"ul">, "children"> & {
    value: string
    rules: PasswordRule[]
    messages?: Partial<PasswordRulesMessages>
  },
) {
  const words = () => ({ ...rulesMessages, ...props.messages })
  const met = () => props.rules.map((rule) => rule.test(props.value))
  createEffect(
    () => ({ key: met().map(Number).join(""), rules: props.rules, words: words() }),
    (now, before) => {
      if (!before || before.key === now.key) return
      if (!now.key.includes("0")) return void announce(now.words.allMet)
      const changed = now.rules
        .filter((_, i) => before.key[i] !== now.key[i])
        .map((rule) => `${now.key[now.rules.indexOf(rule)] === "1" ? now.words.met : now.words.unmet}: ${rule.label}`)
      announce(changed.join(". "))
    },
  )
  return (
    <ul class={["uiset-password-rules", props.class]} aria-label={props["aria-label"] ?? "Password rules"} {...omit(props, "value", "rules", "messages", "class", "aria-label")}>
      <For each={props.rules}>
        {(rule, i) => (
          <li data-met={met()[i()] ? "" : undefined}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {met()[i()] ? <path d="M3.5 8.5 6.5 11.5 12.5 4.5" /> : <circle cx="8" cy="8" r="2.5" />}
            </svg>
            <span class="uiset-password-rules-state">{met()[i()] ? words().met : words().unmet}: </span>
            {rule.label}
          </li>
        )}
      </For>
    </ul>
  )
}

export { PasswordInput, PasswordInputControl, PasswordInputToggle, PasswordRules }
export type { PasswordRule, PasswordRulesMessages }
export { createPasswordInputController } from "@ui-sdk/solid/password-input"
