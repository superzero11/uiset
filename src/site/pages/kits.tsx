import { useRef, type ReactNode } from "react"
import { IdeTemplate } from "@/registry/uiset/ui/templates/ide-app"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { AgentPanel } from "../agent-panel"
import { BoardDemo } from "../board-demo"
import { CanvasDemo } from "../canvas-demo"
import { ChartsDemo } from "../charts-demo"
import { ChatDemo } from "../chat-demo"
import { EditorDemo } from "../editor-demo"
import { GridDemo } from "../grid-demo"
import { MobileDemo } from "../mobile-demo"
import { SchedulerDemo } from "../scheduler-demo"
import { studioScript } from "../scripts"
import { StudioDevice, synth } from "../studio-device"
import { TerminalDemo } from "../terminal-demo"
import { InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { usePageMeta } from "../shell/meta"
import { SkinPicker, skins, skinValues, useUrlState } from "../shell/skin-picker"

type Kit = {
  id: string
  name: string
  docs: string
  title: string
  what: string
  items: string[]
  stage?: string
  demo: (skin: Skin) => ReactNode
}

const kits: Kit[] = [
  {
    id: "chat",
    name: "Chat",
    docs: "/docs/kits/chat",
    title: "A complete chat kit",
    what: "Streaming Markdown and code, reasoning, tool calls, sources and citations, plans, versions, message actions, a composer with attachments, commands, mentions and a model picker, and a list of chats. Plug in any model as a stream of events.",
    items: ["chat", "chat-response", "chat-parts", "chat-composer", "chat-sidebar"],
    stage: "chat-stage",
    demo: () => <ChatDemo />,
  },
  {
    id: "writing",
    name: "Rich text",
    docs: "/docs/kits/rich-text",
    title: "A rich text editor agents can write in too",
    what: 'Headings, lists, to-dos, quotes, code and links, with a toolbar, Markdown as you type, "/" for blocks and "@" for people. Pasted pages come in clean; it saves Markdown or HTML. No editor library underneath.',
    items: ["rich-text"],
    demo: () => <EditorDemo />,
  },
  {
    id: "data",
    name: "Data grid",
    docs: "/docs/kits/data-grid",
    title: "A data grid that works like a spreadsheet",
    what: "Ten thousand orders, rendered as you scroll. Sort, filter, group, pin, resize and reorder columns; select a block of cells, copy and paste with the system clipboard, edit in place, and export. Agents sort, filter and edit through UI SDK's bridge.",
    items: ["data-grid"],
    demo: () => <GridDemo />,
  },
  {
    id: "charts",
    name: "Charts",
    docs: "/docs/kits/charts",
    title: "Charts you can read with the keyboard",
    what: "Lines, bars, areas, scatter, heatmaps and part-to-whole bars, with colors checked for color blindness in every skin. Arrow through the data, pin a point, switch to a table, isolate a series. No chart library underneath.",
    items: ["line-chart", "bar-chart", "scatter-chart", "heatmap", "segmented-bar"],
    demo: () => <ChartsDemo />,
  },
  {
    id: "board",
    name: "Board",
    docs: "/docs/kits/board",
    title: "A kanban board you can drive from the keyboard",
    what: "Columns with limits, cards that move by drag or by keys, lanes, search, a card dialog and confirmed deletes. Every move is announced and can be undone.",
    items: ["board"],
    demo: () => <BoardDemo />,
  },
  {
    id: "scheduler",
    name: "Scheduler",
    docs: "/docs/kits/scheduler",
    title: "Calendars that people and agents can edit",
    what: "A week, a day, a month or a timeline of rooms. Draw, move and resize events with the pointer or the arrow keys; overlapping events share lanes; time zones stay right.",
    items: ["scheduler"],
    demo: () => <SchedulerDemo />,
  },
  {
    id: "canvas",
    name: "Canvas",
    docs: "/docs/kits/canvas",
    title: "A node editor with wires",
    what: "Pan and zoom, drag nodes, connect ports, lasso a group, a minimap, and undo. Each node and port is reachable from the keyboard.",
    items: ["canvas"],
    demo: () => <CanvasDemo />,
  },
  {
    id: "ide",
    name: "IDE",
    docs: "/docs/kits/ide",
    title: "The parts of a code editor",
    what: "A file tree with version control marks, tabs, a code editor with syntax colors, a command palette, problems, an outline and a status bar, in resizable panes.",
    items: ["ide", "ide-app"],
    stage: "ide-stage",
    demo: () => <IdeTemplate />,
  },
  {
    id: "mobile",
    name: "Mobile",
    docs: "/docs/kits/mobile",
    title: "Phone patterns, done properly",
    what: "Rows that swipe aside to actions, wheel pickers, bottom sheets and action sheets, pull to refresh, an app bar and a tab bar.",
    items: ["mobile"],
    demo: () => <MobileDemo />,
  },
  {
    id: "terminal",
    name: "Terminal",
    docs: "/docs/kits/terminal",
    title: "A terminal for the browser",
    what: "ANSI colors kept readable in every skin, links, streaming output with progress lines, Tab completion, history, Ctrl+C and Ctrl+L.",
    items: ["terminal"],
    demo: () => <TerminalDemo />,
  },
]

function KitsPage() {
  const { theme } = useSiteTheme()
  const [skin, setSkin] = useUrlState<Skin>("skin", skinValues, "base")
  const studio = useRef<HTMLDivElement>(null)

  usePageMeta({
    title: "UI SDK kits: chat, rich text, data grid, charts and more",
    description:
      "Large, complete components built on Vercel's UI SDK: a chat kit, a rich text editor, a data grid, charts, a kanban board, a scheduler, a node canvas, an IDE, mobile patterns, a terminal, a synth studio and an agent console. Each installs with the shadcn CLI.",
    path: "/kits",
  })
  return (
    <div className="page">
      <header className="page-head">
        <h1>Kits</h1>
        <p>
          The big components apps are made of, which UI SDK leaves to you: each one complete, keyboard-first, named for agents, and styled by the skin around it. Every demo below is
          the real thing.
        </p>
        <nav className="kit-index" aria-label="Kits on this page">
          {[...kits, { id: "studio", name: "Studio" }].map((k) => (
            <a key={k.id} href={`#${k.id}`}>
              {k.name}
            </a>
          ))}
          <a href="/agents">Agent Console</a>
        </nav>
        <div className="page-controls">
          <SkinPicker value={skin} onChange={setSkin} />
        </div>
      </header>

      {kits.map((kit) => (
        <section key={kit.id} id={kit.id} className="band kit-band" aria-labelledby={`${kit.id}-title`}>
          <div className="band-intro">
            <h2 id={`${kit.id}-title`}>{kit.title}</h2>
            <p>{kit.what}</p>
          </div>
          <UISet skin={skin} theme={theme} className={kit.stage ?? "grid-stage"}>
            {kit.demo(skin)}
          </UISet>
          <div className="kit-actions">
            <InstallCommand items={kit.items} label={`Install the ${kit.name} kit`} />
            <a className="kit-docs" href={kit.docs}>
              {kit.name} docs
            </a>
          </div>
        </section>
      ))}

      <section id="studio" className="band kit-band" aria-labelledby="studio-title">
        <div className="band-intro">
          <h2 id="studio-title">Studio: a synth rack, with sound</h2>
          <p>
            Knobs, a fader, a level meter, a step sequencer and a patch bay, built from UI SDK behaviors. It plays real sound. Every control works with the keyboard, reads out to
            screen readers, and an agent can play it: try the prompts below.
          </p>
          {skin !== "studio" && (
            <p className="band-note">
              Shown in the {skins.find((s) => s.value === skin)?.label} skin, like the rest of the page.{" "}
              <a href="?skin=studio#studio" onClick={(event) => (event.preventDefault(), setSkin("studio"))}>
                See it in the Studio skin
              </a>
              , which draws it as hardware.
            </p>
          )}
        </div>
        <UISet ref={studio} skin={skin} theme={theme} sound className="studio-stage">
          <StudioDevice />
        </UISet>
        <AgentPanel within={studio} script={studioScript} showSnapshot={false} beforeRun={() => synth.unlock()} />
        <div className="kit-actions">
          <InstallCommand items={["knob", "patch-bay", "fader", "level-meter", "step-sequencer"]} label="Install the Studio kit" />
          <a className="kit-docs" href="/docs/kits/studio">
            Studio docs
          </a>
        </div>
      </section>
    </div>
  )
}

export { kits }
export default KitsPage
