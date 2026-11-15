import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { CodeBlock } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { usePageMeta } from "../shell/meta"
import { SkinSample } from "../skins-demo"

const skins: { value: Skin; name: string; what: string; scheme: string; fonts: string; docs: string }[] = [
  {
    value: "base",
    name: "Base",
    what: "Adopts the shadcn/ui theme already on your page, or builds one from a single key color. Light and dark.",
    scheme: "Light and dark",
    fonts: "Your app's",
    docs: "/docs/theming",
  },
  {
    value: "blueprint",
    name: "Blueprint",
    what: "A technical drawing: cyanotype paper, white linework, hatching for filled states, dimension lines for tracks, lettering for labels.",
    scheme: "Dark",
    fonts: "Barlow Semi Condensed",
    docs: "/docs/skins/blueprint",
  },
  {
    value: "studio",
    name: "Studio",
    what: "A rack of synthesizer modules: gunmetal faceplates, rubber caps, silk-screened legends and amber lamps. It sounds mechanical.",
    scheme: "Dark",
    fonts: "Saira Semi Condensed",
    docs: "/docs/skins/studio",
  },
  {
    value: "phosphor",
    name: "Phosphor",
    what: "A monochrome video terminal: intensity for hierarchy, inverse video for what's chosen, a faint bloom and static scan lines. It beeps.",
    scheme: "Dark",
    fonts: "Spline Sans Mono",
    docs: "/docs/skins/phosphor",
  },
  {
    value: "ink",
    name: "Ink",
    what: "Electronic paper: ink on a grey screen, greys made of dots, a reading serif for long text, and no motion at all.",
    scheme: "Light",
    fonts: "Literata, Atkinson Hyperlegible",
    docs: "/docs/skins/ink",
  },
]

function ThemesPage() {
  const { theme } = useSiteTheme()
  usePageMeta({
    title: "Themes for UI SDK: five skins and a generator",
    description:
      "Five skins for Vercel's UI SDK components (Base, Blueprint, Studio, Phosphor and Ink), each checked for contrast in every component, and a generator that turns one color into a complete theme.",
    path: "/themes",
  })
  return (
    <div className="page">
      <header className="page-head">
        <h1>Themes</h1>
        <p>
          A skin is a stylesheet of CSS variables: colors, type, edges, sound and motion. Behavior never changes with it, so you can switch skins live, nest one inside another, or
          write your own. Every skin is checked for contrast in every component, kit and template.
        </p>
        <div className="themes-actions">
          <a className="button-link" data-variant="solid" href="/themes/generator">
            Make a theme from one color
          </a>
          <a className="button-link" href="/docs/theming">
            How theming works
          </a>
        </div>
      </header>

      {skins.map((s) => (
        <section key={s.value} className="band skin-band" id={s.value} aria-labelledby={`${s.value}-title`}>
          <div className="skin-band-copy">
            <h2 id={`${s.value}-title`}>{s.name}</h2>
            <p>{s.what}</p>
            <dl className="skin-facts">
              <div>
                <dt>Scheme</dt>
                <dd>{s.scheme}</dd>
              </div>
              <div>
                <dt>Faces</dt>
                <dd>{s.fonts}</dd>
              </div>
            </dl>
            <p>
              <a href={s.docs}>{s.value === "base" ? "Theming guide" : `${s.name}'s design notes`}</a>
            </p>
          </div>
          <UISet skin={s.value} theme={s.value === "base" ? theme : undefined} className="stage-surface skin-band-stage">
            <SkinSample />
          </UISet>
        </section>
      ))}

      <section className="band" aria-labelledby="use-title">
        <div className="band-intro">
          <h2 id="use-title">Use one</h2>
          <p>Pass the skin to the root. Skins nest: the nearest root wins, so a Blueprint panel can sit inside a Base app.</p>
        </div>
        <CodeBlock
          language="tsx"
          title="app.tsx"
          code={'<UISet skin="base">\n  <Settings />\n  <UISet skin="blueprint">\n    <Schematic />\n  </UISet>\n</UISet>'}
        />
      </section>
    </div>
  )
}

export default ThemesPage
