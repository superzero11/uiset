import { UISet } from "@/registry/uiset/ui/uiset"
import { benchmark, type Metrics } from "../benchmark-results"
import { AgentCheckDemo } from "../agent-check-demo"
import { ConsoleDemo } from "../console-demo"
import { ProjectSettings } from "../project-settings"
import { CodeBlock, CommandLine, InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { SITE, usePageMeta } from "../shell/meta"

const fmt = {
  toolCalls: (n: number) => String(Math.round(n)),
  textRead: (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))),
  seconds: (n: number) => `${Math.round(n)} s`,
  tokens: (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))),
}
const rows: { key: keyof Metrics; label: string }[] = [
  { key: "toolCalls", label: "Tool calls" },
  { key: "textRead", label: "Text read (characters)" },
  { key: "seconds", label: "Time" },
  { key: "tokens", label: "Tokens, with Claude Code\u2019s own" },
]
const delta = (browser: number, bridge: number) => {
  if (!browser) return ""
  const change = Math.round(((bridge - browser) / browser) * 100)
  return `${change < 0 ? "\u2212" : change > 0 ? "+" : ""}${Math.abs(change)}%`
}

const prompt = `This project uses UISet (components, kits, templates and themes for Vercel's UI SDK).
Read ${SITE}/llms.txt for what's available, and the docs page for each item you use.
Install items with: npx shadcn@latest add superzero11/uiset/<item>
Wrap the app in <UISet skin="base"> from @/components/ui/uiset.
Don't hand-write keyboard handling or ARIA that a UI SDK component covers, and give every control a name.`

function AgentsPage() {
  const { theme } = useSiteTheme()
  usePageMeta({
    title: "Agent-ready UI for UI SDK: the bridge, the benchmark, the skill",
    description:
      "Interfaces built with UISet can be used by AI agents through UI SDK's agent bridge, without screenshots. See the benchmark on UISet's kits, a live agent console with approvals and undo, and the skill and llms.txt for coding agents.",
    path: "/agents",
  })
  return (
    <div className="page">
      <header className="page-head">
        <h1>Agents</h1>
        <p>
          Two kinds of agent meet UISet. Agents that <em>use</em> your app read it through UI SDK&rsquo;s agent bridge and work its controls directly. Agents that <em>build</em> your
          app read UISet&rsquo;s skill and docs and put the right pieces together.
        </p>
      </header>

      <section className="band" id="bridge" aria-labelledby="bridge-title">
        <div className="band-intro">
          <h2 id="bridge-title">Agents that use your app</h2>
          <p>
            UI SDK&rsquo;s bridge gives an agent the page as data: each control&rsquo;s name, value and actions. UISet names every control and gives each kit actions that mean
            something: a data grid sorts, filters and edits, a scheduler adds events, the rich text editor reads and writes Markdown. Destructive steps carry a confirmation, so a
            person approves them.
          </p>
        </div>
        <CodeBlock
          language="ts"
          title="An agent's view"
          code={`await agent.snapshot()
// [{ ref: "c12", component: "data-grid", label: "Orders", actions: ["sort", "filter", "edit", ...] }, ...]

await agent.act({ steps: [{ ref: "Orders", action: "filter", args: ["Region", "Europe"] }] })`}
        />
      </section>

      <section className="band" id="benchmark" aria-labelledby="benchmark-title">
        <div className="band-intro">
          <h2 id="benchmark-title">The benchmark</h2>
          <p>
            UI SDK measured agents doing a project-settings task with browser tools on another library, and with the bridge on UI SDK. We ran the same comparison on UISet&rsquo;s own
            kits: the same tasks, done once by an agent with browser tools (a page snapshot, click, type) and once by an agent with the bridge (snapshot, act, query).
          </p>
        </div>
        {benchmark ? (
          <>
            <p className="bench-headline">{benchmark.headline}</p>
            {benchmark.tasks.map((task) => (
              <div key={task.id} className="bench-task">
                <h3>{task.name}</h3>
                <p className="bench-prompt">&ldquo;{task.prompt}&rdquo;</p>
                <div className="docs-table" role="region" aria-label={`${task.name} results`} tabIndex={0}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Median of runs</th>
                        <th scope="col">Browser tools</th>
                        <th scope="col">UISet and the bridge</th>
                        <th scope="col">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key}>
                          <th scope="row">{r.label}</th>
                          <td>{fmt[r.key](task.median.browser[r.key])}</td>
                          <td>{fmt[r.key](task.median.bridge[r.key])}</td>
                          <td>{delta(task.median.browser[r.key], task.median.bridge[r.key])}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row">Finished the task</th>
                        <td>{task.completed.browser}</td>
                        <td>{task.completed.bridge}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="bench-method">
              Method: {benchmark.model}, run through Claude Code on {benchmark.date}. Both approaches get the same prompt and the same page, and only the tools that approach
              allows; the harness checks the page afterwards, so a run counts as finished only if the page shows the result. Text read counts the characters the tools returned.
              Time is the agent&rsquo;s whole run. Tokens include about 67,000 of Claude Code&rsquo;s own instructions and tool definitions, the same for both. Claude Code
              shortens very long command output, so on the data grid the browser agents saw less than the full page snapshot, which favors them. The harness, the prompts and
              every run&rsquo;s raw numbers are in <a href="https://github.com/superzero11/uiset/tree/main/bench">the repository</a>.
            </p>
          </>
        ) : (
          <p className="bench-method">The benchmark hasn&rsquo;t been run yet.</p>
        )}
      </section>

      <section className="band" id="agents" aria-labelledby="agents-title">
        <div className="band-intro">
          <h2 id="agents-title">Let an agent work in your app, and stay in charge</h2>
          <p>
            The Agent Console is the human side of the bridge. Risky steps wait for your approval right in the app. Every change the agent makes is listed, highlighted where it
            happened, and can be undone without losing your own edits. It works with any model. Try a prompt below.
          </p>
        </div>
        <div className="console-stage">
          <UISet skin="base" theme={theme} className="console-target">
            <ProjectSettings />
          </UISet>
          <ConsoleDemo />
        </div>
        <div className="kit-actions">
          <InstallCommand items={["agent-console"]} label="Install the Agent Console" />
          <a className="kit-docs" href="/docs/kits/agent-console">
            Agent Console docs
          </a>
        </div>
      </section>

      <section className="band" id="agent-check" aria-labelledby="agent-check-title">
        <div className="band-intro">
          <h2 id="agent-check-title">Check that an agent can use your pages</h2>
          <p>
            An agent finds each control by its name. The agent-readiness check asks a page&rsquo;s bridge what an agent sees, and scores the page: every control named, each name
            finding one control, and none the agent can&rsquo;t see. Run it on this page, with and without the mistakes in the form.
          </p>
        </div>
        <AgentCheckDemo />
        <div className="kit-actions">
          <InstallCommand items={["agent-check"]} label="Install the agent-readiness check" />
          <a className="kit-docs" href="/docs/agent-check">
            Agent readiness check docs
          </a>
        </div>
      </section>

      <section className="band" id="coding-agents" aria-labelledby="coding-title">
        <div className="band-intro">
          <h2 id="coding-title">Agents that build your app</h2>
          <p>
            Coding agents tend to hand-wire arrow keys and ARIA instead of using the behaviors that already exist. UISet&rsquo;s skills teach them the items, the skins and the rules,
            and llms.txt points them at the docs.
          </p>
        </div>
        <div className="coding-agents">
          <div>
            <h3>Install the skills</h3>
            <p>One skill for UISet, and one for each kit.</p>
            <CommandLine command="npx skills add superzero11/uiset" />
          </div>
          <div>
            <h3>Or give it the docs</h3>
            <p>
              <a href="/llms.txt">llms.txt</a> lists every page; <a href="/llms-full.txt">llms-full.txt</a> holds them all in one file. Every docs page has its Markdown one click away.
              Agents that use Context7 find the same docs as <a href="https://context7.com/superzero11/uiset">/superzero11/uiset</a>.
            </p>
          </div>
          <div className="coding-agents-prompt">
            <h3>A prompt to start from</h3>
            <CodeBlock language="text" title="Prompt" code={prompt} />
          </div>
        </div>
      </section>
    </div>
  )
}

export default AgentsPage
