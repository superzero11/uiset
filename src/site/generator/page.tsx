// The theme generator: a key color and a few choices in, the whole base-skin token set out
// for light and dark, every pair that matters checked, a live preview in the generated
// skin, and the files to take away. The math lives in color.ts and tokens.ts.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Alert } from "@/registry/uiset/ui/alert"
import { Button } from "@/registry/uiset/ui/button"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet, Input } from "@/registry/uiset/ui/field"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { Icon } from "@/registry/uiset/ui/shell/icons"
import { Slider } from "@/registry/uiset/ui/slider"
import { Switch } from "@/registry/uiset/ui/switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { formatOklch, maxChroma, parseHex, toHex, type Oklch } from "./color"
import { designTokens, shadcnCss, shareUrl, skinCss, skinNameProblem } from "./exports"
import { Preview } from "./preview"
import {
  COLOR_TOKENS,
  SIZE_TOKENS,
  fixAll,
  fromQuery,
  generateTheme,
  presetInput,
  presets,
  toQuery,
  type Check,
  type Density,
  type GeneratorInput,
  type Start,
  type TextSize,
  type Theme,
} from "./tokens"
import "./generator.css"
import { SITE } from "../shell/meta"

const one = (value: number | readonly number[]) => (Array.isArray(value) ? value[0]! : (value as number))
const fmt = (n: number, digits = 3) => String(Math.round(n * 10 ** digits) / 10 ** digits)
const sameKey = (a: Oklch, b: Oklch) => Math.abs(a.l - b.l) < 1e-6 && Math.abs(a.c - b.c) < 1e-6 && Math.abs(a.h - b.h) < 1e-6

/* ------------------------------------------------------------------ inputs */

function track(stops: string[]): CSSProperties {
  return { "--generator-track": `linear-gradient(to right, ${stops.join(", ")})` } as CSSProperties
}

function KeyColor({ input, set, onKey }: { input: GeneratorInput; set: (next: GeneratorInput) => void; onKey: Oklch }) {
  const { key } = input
  const [draft, setDraft] = useState<string | null>(null)
  const hex = toHex(key)
  const draftColor = draft === null ? null : parseHex(draft)
  const limit = maxChroma(key.l, key.h)
  const setKey = (part: keyof Oklch) => (value: number | readonly number[]) => set({ ...input, key: { ...key, [part]: one(value) } })
  const hues = Array.from({ length: 13 }, (_, i) => `oklch(${fmt(key.l)} ${fmt(key.c)} ${i * 30})`)
  return (
    <FieldSet className="generator-group">
      <FieldLegend>Key color</FieldLegend>
      <div className="generator-key-swatch" style={{ background: formatOklch(key), color: formatOklch(onKey) }} aria-hidden="true">
        <span className="generator-key-sample">Aa</span>
        <span>{hex}</span>
      </div>
      <Field invalid={draft !== null && !draftColor ? true : undefined}>
        <FieldLabel>Hex</FieldLabel>
        <Input
          value={draft ?? hex}
          autoComplete="off"
          spellCheck={false}
          translate="no"
          onValueChange={(value: string) => {
            setDraft(value)
            const color = parseHex(value)
            if (color && /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.test(value.trim())) set({ ...input, key: color })
          }}
          onBlur={() => setDraft(null)}
        />
        {draft !== null && !draftColor && <FieldError match>Six hex digits, like #5b5bd6.</FieldError>}
      </Field>
      <div className="generator-presets" role="group" aria-label="Presets">
        {presets.map((p) => (
          <Button
            key={p.name}
            variant="outline"
            className="generator-preset"
            aria-pressed={sameKey(p.input.key, key)}
            onClick={() =>
              // A preset sets the color and its tint; shape, size and the rest stay as they are.
              set({ ...presetInput(p.name), radius: input.radius, density: input.density, textSize: input.textSize, start: input.start, chartsFromKey: input.chartsFromKey })
            }
          >
            <span className="generator-preset-swatch" style={{ background: formatOklch(p.input.key) }} aria-hidden="true" />
            {p.name}
          </Button>
        ))}
      </div>
      <Field className="generator-slider" style={track([`oklch(0.05 ${fmt(key.c)} ${fmt(key.h)})`, `oklch(0.5 ${fmt(key.c)} ${fmt(key.h)})`, `oklch(0.95 ${fmt(key.c)} ${fmt(key.h)})`])}>
        <FieldLabel>Lightness</FieldLabel>
        <Slider value={key.l} onValueChange={setKey("l")} min={0} max={1} step={0.005} showValue />
      </Field>
      <Field className="generator-slider" style={track([`oklch(${fmt(key.l)} 0 ${fmt(key.h)})`, `oklch(${fmt(key.l)} 0.37 ${fmt(key.h)})`])}>
        <FieldLabel>Chroma</FieldLabel>
        <Slider value={key.c} onValueChange={setKey("c")} min={0} max={0.37} step={0.005} showValue />
        {key.c > limit + 0.001 && <FieldDescription>sRGB shows up to {fmt(limit)} here, so the theme uses that.</FieldDescription>}
      </Field>
      <Field className="generator-slider" style={track(hues)}>
        <FieldLabel>Hue</FieldLabel>
        <Slider value={key.h} onValueChange={setKey("h")} min={0} max={360} step={1} showValue />
      </Field>
    </FieldSet>
  )
}

function Neutrals({ input, set }: { input: GeneratorInput; set: (next: GeneratorInput) => void }) {
  const h = input.neutralHue ?? input.key.h
  const hues = Array.from({ length: 13 }, (_, i) => `oklch(0.7 0.06 ${i * 30})`)
  return (
    <FieldSet className="generator-group">
      <FieldLegend>Neutrals</FieldLegend>
      <Field className="generator-slider" style={track([`oklch(0.62 0 0)`, `oklch(0.62 0.06 ${fmt(h)})`])}>
        <FieldLabel>Tint</FieldLabel>
        <Slider value={input.tint} onValueChange={(v) => set({ ...input, tint: one(v) })} min={0} max={100} step={1} format={(n) => `${n}%`} showValue />
        <FieldDescription>How much color the greys carry, from none to clearly tinted.</FieldDescription>
      </Field>
      <Field className="generator-switch">
        <FieldLabel>Tint with the key&rsquo;s hue</FieldLabel>
        <Switch checked={input.neutralHue === null} onCheckedChange={(on: boolean) => set({ ...input, neutralHue: on ? null : Math.round(input.key.h) })} />
      </Field>
      {input.neutralHue !== null && (
        <Field className="generator-slider" style={track(hues)}>
          <FieldLabel>Tint hue</FieldLabel>
          <Slider value={input.neutralHue} onValueChange={(v) => set({ ...input, neutralHue: one(v) })} min={0} max={360} step={1} showValue />
        </Field>
      )}
    </FieldSet>
  )
}

function Shape({ input, set }: { input: GeneratorInput; set: (next: GeneratorInput) => void }) {
  return (
    <FieldSet className="generator-group">
      <FieldLegend>Shape and size</FieldLegend>
      <Field className="generator-slider">
        <FieldLabel>Radius</FieldLabel>
        <Slider value={input.radius} onValueChange={(v) => set({ ...input, radius: one(v) })} min={0} max={1.25} step={0.125} format={(n) => `${n} rem`} showValue />
      </Field>
      <Field>
        <FieldLabel>Density</FieldLabel>
        <SegmentedControl value={input.density} onValueChange={(v: string | null) => v && set({ ...input, density: v as Density })}>
          <SegmentedControlItem value="compact">Compact</SegmentedControlItem>
          <SegmentedControlItem value="default">Default</SegmentedControlItem>
          <SegmentedControlItem value="comfortable">Roomy</SegmentedControlItem>
        </SegmentedControl>
      </Field>
      <Field>
        <FieldLabel>Text size</FieldLabel>
        <SegmentedControl value={input.textSize} onValueChange={(v: string | null) => v && set({ ...input, textSize: v as TextSize })}>
          <SegmentedControlItem value="small">13px</SegmentedControlItem>
          <SegmentedControlItem value="default">14px</SegmentedControlItem>
          <SegmentedControlItem value="large">15px</SegmentedControlItem>
        </SegmentedControl>
      </Field>
    </FieldSet>
  )
}

function Start({ input, set }: { input: GeneratorInput; set: (next: GeneratorInput) => void }) {
  return (
    <FieldSet className="generator-group">
      <FieldLegend>Surfaces and charts</FieldLegend>
      <Field>
        <FieldLabel>Starting point</FieldLabel>
        <SegmentedControl value={input.start} onValueChange={(v: string | null) => v && set({ ...input, start: v as Start })}>
          <SegmentedControlItem value="base">From base</SegmentedControlItem>
          <SegmentedControlItem value="dark">Dark first</SegmentedControlItem>
        </SegmentedControl>
        <FieldDescription>
          {input.start === "dark" ? "A deeper, near-black dark surface, shown first." : "The base skin's light and dark surfaces."}
        </FieldDescription>
      </Field>
      <Field className="generator-switch">
        <FieldLabel>Lead the charts with the key</FieldLabel>
        <Switch checked={input.chartsFromKey} onCheckedChange={(on: boolean) => set({ ...input, chartsFromKey: on })} />
      </Field>
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ checks */

const valueText = (c: Check) => (c.kind === "contrast" ? `${c.value.toFixed(2)}:1` : `ΔE ${c.value.toFixed(1)}`)
const needText = (c: Check) => (c.kind === "contrast" ? `${c.need}:1` : `ΔE ${c.need}`)

function Status({ theme, onFixAll }: { theme: Theme; onFixAll: () => void }) {
  const fails = theme.checks.filter((c) => !c.pass)
  const fixable = fails.some((c) => c.fix)
  return (
    <div className="generator-status" data-pass={fails.length === 0 || undefined} role="status">
      <Icon name={fails.length ? "warning" : "success"} className="generator-status-icon" />
      <p>
        {fails.length === 0
          ? `All ${theme.checks.length} checks pass in light and dark.`
          : `${fails.length} of ${theme.checks.length} checks ${fails.length === 1 ? "fails" : "fail"}.`}{" "}
        <a href="#generator-checks">See the checks</a>
      </p>
      {fixable && (
        <Button variant="outline" onClick={onFixAll}>
          Fix {fails.length === 1 ? "it" : "all"}
        </Button>
      )}
    </div>
  )
}

function Cell({ check, set }: { check: Check | undefined; set: (next: GeneratorInput) => void }) {
  if (!check) return <td />
  return (
    <td data-pass={check.pass || undefined}>
      <span className="generator-result">
        <Icon name={check.pass ? "check" : "close"} className="generator-result-icon" />
        <span className="generator-result-value">{valueText(check)}</span>
        <span className="generator-result-word">{check.pass ? "Passes" : "Fails"}</span>
      </span>
      <span className="generator-result-detail">{check.detail}</span>
      {!check.pass && check.fix && (
        <Button variant="outline" className="generator-fix" onClick={() => set(check.fix!.input)}>
          {check.fix.label}
        </Button>
      )}
    </td>
  )
}

function Checks({ theme, set }: { theme: Theme; set: (next: GeneratorInput) => void }) {
  const rows = theme.checks.filter((c) => c.scheme === "light")
  const dark = new Map(theme.checks.filter((c) => c.scheme === "dark").map((c) => [c.id.slice(5), c]))
  const groups = [...new Set(rows.map((r) => r.group))]
  return (
    <section className="generator-section" id="generator-checks" aria-labelledby="generator-checks-title">
      <h2 id="generator-checks-title">Checks</h2>
      <p className="generator-lede">
        Every pair the base skin draws, measured on the colors the files contain. Contrast is WCAG 2; chart colors are told apart in OKLab (ΔE ×100), with
        full color vision and with protan and deutan vision simulated.
      </p>
      {theme.impossible.length > 0 && (
        <Alert tone="warning" title="Some checks can't pass with these inputs">
          <ul className="generator-plain-list">
            {theme.impossible.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="generator-table-scroll" role="region" aria-label="Checks" tabIndex={0}>
        <table className="generator-table generator-checks">
          <thead>
            <tr>
              <th scope="col">Check</th>
              <th scope="col">Light</th>
              <th scope="col">Dark</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group}>
              <tr className="generator-table-group">
                <th scope="colgroup" colSpan={3}>
                  {group}
                </th>
              </tr>
              {rows
                .filter((r) => r.group === group)
                .map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      {r.label}
                      <span className="generator-need">Needs {needText(r)}</span>
                    </th>
                    <Cell check={r} set={set} />
                    <Cell check={dark.get(r.id.slice(6))} set={set} />
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
      {theme.notes.length > 0 && (
        <div className="generator-notes">
          <h3>Adjusted to pass</h3>
          <ul className="generator-plain-list">
            {theme.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ export */

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Code({ children, label }: { children: string; label: string }) {
  return (
    <pre className="generator-code" tabIndex={0} aria-label={label} translate="no">
      <code>{children}</code>
    </pre>
  )
}

function FileActions({ text, filename, type, what }: { text: string; filename: string; type: string; what: string }) {
  return (
    <div className="generator-file-actions">
      <CopyButton value={text} label={`Copy ${what}`} />
      <Button variant="outline" onClick={() => download(filename, text, type)}>
        <Icon name="download" />
        Download {filename}
      </Button>
    </div>
  )
}

function Export({ theme, skin, skinDraft, setSkinDraft, link }: { theme: Theme; skin: string; skinDraft: string; setSkinDraft: (s: string) => void; link: string }) {
  const problem = skinNameProblem(skinDraft)
  const css = skinCss(theme, { name: skin, link })
  const shadcn = shadcnCss(theme)
  const json = designTokens(theme)
  const usage = `import "./${skin}.css"\n\n<UISet skin="${skin}"${theme.input.start === "dark" ? ` theme="dark"` : ""}>\n  <App />\n</UISet>`
  return (
    <section className="generator-section" aria-labelledby="generator-export-title">
      <h2 id="generator-export-title">Export</h2>
      <Tabs defaultValue="skin" className="generator-tabs">
        <TabsList aria-label="Formats">
          <TabsTab value="skin">UISet skin</TabsTab>
          <TabsTab value="shadcn">shadcn/ui</TabsTab>
          <TabsTab value="tokens">Design tokens</TabsTab>
          <TabsTab value="link">Link</TabsTab>
        </TabsList>
        <TabsPanel value="skin" className="generator-panel">
          <p className="generator-lede">
            A skin file: every variable as <code>light-dark()</code>, in UISet&rsquo;s skin layer. Import it after UISet&rsquo;s CSS and name it on the root.
          </p>
          <Field className="generator-skin-name" invalid={problem !== null ? true : undefined}>
            <FieldLabel>Skin name</FieldLabel>
            <Input value={skinDraft} onValueChange={(v: string) => setSkinDraft(v.trim())} autoComplete="off" spellCheck={false} translate="no" />
            {problem !== null && <FieldError match>{problem}</FieldError>}
          </Field>
          <Code label="How to use the skin">{usage}</Code>
          <Code label="Skin CSS">{css}</Code>
          <FileActions text={css} filename={`${skin}.css`} type="text/css" what="skin CSS" />
        </TabsPanel>
        <TabsPanel value="shadcn" className="generator-panel">
          <p className="generator-lede">
            shadcn/ui&rsquo;s variables, <code>:root</code> for light and <code>.dark</code> for dark. With no <code>keyColor</code>, UISet&rsquo;s base skin adopts them,
            so shadcn/ui and UISet components match.
          </p>
          <Code label="shadcn/ui CSS">{shadcn}</Code>
          <FileActions text={shadcn} filename="globals.css" type="text/css" what="shadcn/ui CSS" />
        </TabsPanel>
        <TabsPanel value="tokens" className="generator-panel">
          <p className="generator-lede">
            The same tokens in the W3C design tokens format, for Style Dictionary, Tokens Studio or Figma: colors in OKLCH with a hex fallback, under{" "}
            <code>light</code> and <code>dark</code>.
          </p>
          <Code label="Design tokens JSON">{json}</Code>
          <FileActions text={json} filename="tokens.json" type="application/json" what="tokens JSON" />
        </TabsPanel>
        <TabsPanel value="link" className="generator-panel">
          <p className="generator-lede">This page with these inputs. Anyone who opens it gets the same theme.</p>
          <Code label="Link">{link}</Code>
          <div className="generator-file-actions">
            <CopyButton value={link} label="Copy link" />
          </div>
        </TabsPanel>
      </Tabs>
    </section>
  )
}

/* ------------------------------------------------------------------ tokens */

function Swatch({ color }: { color: Oklch }) {
  return (
    <span className="generator-token">
      <span className="generator-token-swatch" style={{ background: formatOklch(color) }} aria-hidden="true" />
      <code>{formatOklch(color)}</code>
      <span className="generator-token-hex">{toHex(color)}</span>
    </span>
  )
}

function Tokens({ theme }: { theme: Theme }) {
  return (
    <section className="generator-section" aria-labelledby="generator-tokens-title">
      <h2 id="generator-tokens-title">Tokens</h2>
      <div className="generator-table-scroll" role="region" aria-label="Tokens" tabIndex={0}>
        <table className="generator-table generator-tokens">
          <thead>
            <tr>
              <th scope="col">Variable</th>
              <th scope="col">Light</th>
              <th scope="col">Dark</th>
            </tr>
          </thead>
          <tbody>
            {COLOR_TOKENS.map((token) => (
              <tr key={token}>
                <th scope="row">
                  <code>--{token}</code>
                </th>
                <td>
                  <Swatch color={theme.light[token]} />
                </td>
                <td>
                  <Swatch color={theme.dark[token]} />
                </td>
              </tr>
            ))}
            {SIZE_TOKENS.map((token) => (
              <tr key={token}>
                <th scope="row">
                  <code>--{token}</code>
                </th>
                <td colSpan={2}>
                  <code>{theme.sizes[token]}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the page */

function ThemeGeneratorPage() {
  const [input, setInput] = useState<GeneratorInput>(() => fromQuery(typeof window === "undefined" ? "" : window.location.search))
  // Sliders stay smooth; the theme, preview and files follow a beat behind while dragging.
  const shown = useDeferredValue(input)
  const theme = useMemo(() => generateTheme(shown), [shown])
  const [skinDraft, setSkinDraft] = useState("custom")
  const skin = skinNameProblem(skinDraft) === null ? skinDraft : "custom"
  const origin = typeof window === "undefined" ? SITE : window.location.origin
  const link = shareUrl(theme, origin)
  // The page's own CSS for the preview is the exported skin, exactly as a user would add it.
  const css = useMemo(() => skinCss(theme, { name: skin }), [theme, skin])

  // Keep the address bar on the current inputs, so a reload or a copied URL restores them.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const id = setTimeout(() => window.history.replaceState(window.history.state, "", `${window.location.pathname}?${toQuery(input)}`), 250)
    return () => clearTimeout(id)
  }, [input])

  const schemes: ("light" | "dark")[] = theme.input.start === "dark" ? ["dark", "light"] : ["light", "dark"]

  return (
    <div className="generator">
      <style>{css}</style>
      <header className="generator-intro">
        <h1>Theme generator</h1>
        <p>
          One key color in; a complete theme out. Surfaces, text, controls, status colors and chart colors for light and dark, every pair checked, as a UISet
          skin, shadcn/ui variables or design tokens.
        </p>
      </header>
      <div className="generator-layout">
        <aside className="generator-rail" aria-label="Inputs">
          <KeyColor input={input} set={setInput} onKey={theme.light["ui-primary-foreground"]} />
          <Neutrals input={input} set={setInput} />
          <Shape input={input} set={setInput} />
          <Start input={input} set={setInput} />
          <Status theme={theme} onFixAll={() => setInput(fixAll(input))} />
        </aside>
        <div className="generator-main">
          <section className="generator-section" aria-labelledby="generator-preview-title">
            <h2 id="generator-preview-title">Preview</h2>
            <div className="generator-previews">
              {schemes.map((scheme) => (
                <Preview key={scheme} skin={skin} scheme={scheme} />
              ))}
            </div>
          </section>
          <Checks theme={theme} set={setInput} />
          <Export theme={theme} skin={skin} skinDraft={skinDraft} setSkinDraft={setSkinDraft} link={link} />
          <Tokens theme={theme} />
        </div>
      </div>
    </div>
  )
}

export { ThemeGeneratorPage }
