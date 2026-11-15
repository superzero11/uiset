// What the generator hands over: a UISet skin file, shadcn/ui variables, design tokens
// (W3C DTCG) and a link back to the inputs. Plain strings, no React, no DOM.
import { formatOklch, toHex, type Oklch } from "./color"
import { CHART_TOKENS, COLOR_TOKENS, SIZE_TOKENS, toQuery, type ColorToken, type SchemeColors, type Theme } from "./tokens"

/** Skins UISet ships; a generated skin needs its own name. */
const RESERVED = ["base", "blueprint", "studio", "phosphor", "ink"]

/** Null when the name works as `skin="…"`, else what's wrong with it. */
function skinNameProblem(name: string): string | null {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return "Use lowercase letters, digits and hyphens, starting with a letter."
  if (RESERVED.includes(name)) return `UISet already has a skin called ${name}.`
  return null
}

const neutralHue = (theme: Theme) => theme.input.neutralHue ?? theme.input.key.h
const fmt = (n: number) => String(Math.round(n * 1000) / 1000)
const summary = (theme: Theme) => {
  const k = theme.input.key
  return `key oklch(${fmt(k.l)} ${fmt(k.c)} ${fmt(k.h)}), radius ${theme.sizes["ui-radius"]}`
}
const failing = (theme: Theme) => theme.checks.filter((c) => !c.pass)

/** The checks, said once at the top of each file: what holds, or what still fails. */
function checkComment(theme: Theme, indent = "") {
  const fails = failing(theme)
  if (!fails.length)
    return `${indent}Every pair checked in light and dark: text 4.5:1, control edges and focus 3:1,\n${indent}chart colors 3:1 and told apart with protan and deutan vision.`
  return `${indent}${fails.length} ${fails.length === 1 ? "check fails" : "checks fail"}: ${fails.map((c) => `${c.label.toLowerCase()} (${c.scheme})`).join(", ")}.`
}

/* ------------------------------------------------------------------ the UISet skin */

function shadow(theme: Theme) {
  const h = fmt(neutralHue(theme))
  return `0 1px 2px light-dark(oklch(0.2 0.02 ${h} / 0.08), oklch(0 0 0 / 0.5)),\n      0 12px 32px -12px light-dark(oklch(0.2 0.04 ${h} / 0.22), oklch(0 0 0 / 0.7))`
}

/**
 * A skin stylesheet: every variable as light-dark(light, dark) on its own selector, in the
 * uiset.skin layer. It leaves color-scheme alone, so `theme` on <UISet> (or the device)
 * picks the scheme, and nested roots keep working.
 */
function skinCss(theme: Theme, { name = "custom", link }: { name?: string; link?: string } = {}) {
  const lines = COLOR_TOKENS.map((token) => `    --${token}: light-dark(${formatOklch(theme.light[token])}, ${formatOklch(theme.dark[token])});`)
  const sizes = SIZE_TOKENS.map((token) => `    --${token}: ${theme.sizes[token]};`)
  return `/*
  A UISet skin from the theme generator: ${summary(theme)}.
  Use it with <UISet skin="${name}">. Light and dark follow the theme prop, or the device.
${checkComment(theme, "  ")}${link ? `\n  Open it again: ${link}` : ""}
*/
@layer ui-sdk, uiset.tokens, uiset.base, uiset.skin;

@layer uiset.skin {
  [data-uiset][data-skin="${name}"] {
${lines.join("\n")}
${sizes.join("\n")}
    --ui-shadow:
      ${shadow(theme)};
  }
}
`
}

/* ------------------------------------------------------------------ shadcn/ui */

/** shadcn/ui's variable names, each from one of ours. */
const SHADCN: [string, ColorToken][] = [
  ["background", "ui-background"],
  ["foreground", "ui-foreground"],
  ["card", "ui-background"],
  ["card-foreground", "ui-foreground"],
  ["popover", "ui-background"],
  ["popover-foreground", "ui-foreground"],
  ["primary", "ui-primary"],
  ["primary-foreground", "ui-primary-foreground"],
  ["secondary", "ui-muted"],
  ["secondary-foreground", "ui-foreground"],
  ["muted", "ui-muted"],
  ["muted-foreground", "ui-muted-foreground"],
  ["accent", "ui-muted"],
  ["accent-foreground", "ui-foreground"],
  ["destructive", "ui-destructive"],
  ["border", "ui-border"],
  ["input", "ui-input"],
  ["ring", "ui-ring-border"],
  ...CHART_TOKENS.slice(0, 5).map((t) => [t, t] as [string, ColorToken]),
]

function shadcnBlock(selector: string, colors: SchemeColors, radius?: string) {
  const lines = SHADCN.map(([name, token]) => `  --${name}: ${formatOklch(colors[token])};`)
  return `${selector} {\n${radius ? `  --radius: ${radius};\n` : ""}${lines.join("\n")}\n}`
}

/** shadcn/ui's theme variables. UISet's base skin adopts them when no keyColor is set. */
function shadcnCss(theme: Theme) {
  return `/*
  shadcn/ui theme variables from the UISet theme generator: ${summary(theme)}.
  Paste over the ones in your global CSS. UISet's base skin adopts them, so shadcn/ui
  and UISet components match.
${checkComment(theme, "  ")}
*/
${shadcnBlock(":root", theme.light, theme.sizes["ui-radius"])}

${shadcnBlock(".dark", theme.dark)}
`
}

/* ------------------------------------------------------------------ design tokens (DTCG) */

type DtcgColor = { $value: { colorSpace: "oklch"; components: [number, number, number]; alpha?: number; hex: string } }

function dtcgColor(color: Oklch): DtcgColor {
  return {
    $value: {
      colorSpace: "oklch",
      components: [color.l, color.c, color.h],
      ...(color.alpha === undefined ? {} : { alpha: color.alpha }),
      hex: toHex(color),
    },
  }
}

/** "ui-muted-foreground" → ["ui", "muted-foreground"]; "chart-seq-1" → ["chart", "seq-1"]. */
const tokenPath = (token: string): [string, string] => {
  const i = token.indexOf("-")
  return [token.slice(0, i), token.slice(i + 1)]
}

function dtcgScheme(colors: SchemeColors) {
  const groups: Record<string, Record<string, DtcgColor>> = {}
  for (const token of COLOR_TOKENS) {
    const [group, name] = tokenPath(token)
    ;(groups[group] ??= {})[name] = dtcgColor(colors[token])
  }
  return { $type: "color", ...groups }
}

/**
 * The tokens in the W3C Design Tokens format (2025.10): colors under `light` and `dark`,
 * sizes under `size`. A token's path, joined with hyphens past the first group, is its CSS
 * variable: light.ui.muted-foreground is --ui-muted-foreground in light.
 */
function designTokens(theme: Theme) {
  const size: Record<string, { $value: { value: number; unit: "rem" } }> = {}
  for (const token of SIZE_TOKENS) size[tokenPath(token)[1]] = { $value: { value: parseFloat(theme.sizes[token]), unit: "rem" } }
  const doc = {
    $description: `UISet theme from the theme generator: ${summary(theme)}. ${checkComment(theme).replace(/\n/g, " ")}`,
    light: dtcgScheme(theme.light),
    dark: dtcgScheme(theme.dark),
    size: { $type: "dimension", ui: size },
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

/* ------------------------------------------------------------------ the link */

function shareUrl(theme: Theme, origin: string, path = "/themes/generator") {
  return `${origin}${path}?${toQuery(theme.input)}`
}

export { RESERVED, SHADCN, designTokens, shadcnCss, shareUrl, skinCss, skinNameProblem, tokenPath }
