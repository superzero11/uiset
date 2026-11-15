# Agent benchmark

UI SDK's docs compare an agent that drives a page with browser tools against one that uses
UI SDK's agent bridge. This folder runs the same comparison on UISet's kits, so the numbers
on [uiset.dev/agents](https://uiset.dev/agents#benchmark) can be checked and
rerun.

## Results (2026-11-15, Claude Sonnet 5.5 through Claude Code, medians of 3 runs)

| Task | Approach | Tool calls | Text read (chars) | Time | Tokens* | Finished |
| --- | --- | --- | --- | --- | --- | --- |
| Project settings | Browser tools | 10 | 3,895 | 20.5 s | 68,921 | 3 of 3 |
| | Bridge | 6 | 2,976 | 16.2 s | 68,397 | 3 of 3 |
| Data grid | Browser tools | 6 | 54,343 | 24.8 s | 74,112 | 3 of 3 |
| | Bridge | 6 | 9,700 | 15.0 s | 72,325 | 3 of 3 |
| Scheduler | Browser tools | 11 | 17,464 | 29.6 s | 70,538 | 3 of 3 |
| | Bridge | 3 | 3,661 | 13.1 s | 68,794 | 3 of 3 |

Across the three tasks (the median of each task's change), the bridge took 40% fewer tool
calls, read 79% less text and finished 40% sooner. Every run of both approaches finished
its task.

\* Tokens are what Claude Code reported for each agent. They include about 67,000 tokens of
Claude Code's own instructions and tool definitions, the same for both approaches, so they
show the page's share only faintly.

`results/summary.json` has every run; `results/raw/<run>.json` has every tool call with the
characters it returned.

## The tasks

Each task opens a screen of the site (`/bench/<task>`) built from UISet's kits, and asks:

- **Project settings** (`/bench/settings`, a form with a text field, two selects, a switch
  and a save button): "Rename the project to Atlas, make it public, move it to Europe, turn
  on the weekly digest, and save the project."
- **Data grid** (`/bench/grid`, the Orders grid with 10,000 rows, drawn as the page scrolls): "In the Orders grid, show
  only the orders from Europe, sorted by amount from highest to lowest."
- **Scheduler** (`/bench/scheduler`, a week calendar): "Add a 30-minute event called Roadmap
  sync on Wednesday this week, starting at 10:00 AM."

After the agent stops, the harness checks the page itself (`check` in `tasks.mjs`; the agent
never sees it). A run counts as finished only if the page shows the result.

## The two approaches

Both agents get the same prompt and the same page, and one command to reach it,
`node bench/cli.mjs <run> <command> '<json>'`. They differ only in the commands allowed:

- **Browser tools**, as Playwright's MCP server gives an agent: `snapshot` (the page's
  accessibility tree), `click`, `fill`, `press`, `select` and `check-box` by role and name.
  Each action returns the new snapshot, as Playwright's MCP tools do.
- **Bridge**, UI SDK's agent bridge on the same page: `snapshot` (the page's components as
  JSON), `act` and `query`.

The agent is told to use only that command, not to read files, and to reply in one sentence
when done. The full prompts are in `results/summary.json`'s task list and below.

## Measures

- **Tool calls**: calls the agent made to the page, failed ones included.
- **Text read**: characters the tools returned, which is what the page costs the model.
- **Time**: the agent's whole run, as Claude Code reported it.
- **Tokens**: as Claude Code reported them (see the note above).

Claude Code shortens very long command output, so on the data grid the browser agents saw
less than the full page snapshot. That makes their token count lower than a tool that
returned everything would, so it favors browser tools.

## Rerun it

```bash
pnpm dev                     # the site on :5620
node bench/server.mjs        # the harness on :5697 (Google Chrome locally, Chromium in CI)
```

For each task and approach, open a run, give an agent the prompt, then record the result:

```bash
node bench/cli.mjs settings-bridge-1 open '{"task":"settings","approach":"bridge"}'
# … the agent works, through node bench/cli.mjs settings-bridge-1 <command> …
node bench/cli.mjs settings-bridge-1 result
```

Record each agent's tokens and seconds in `results/agents.json` (agent id → `{ run, tokens,
seconds }`), then:

```bash
node bench/summarize.mjs     # writes results/summary.json and src/site/benchmark-results.ts
```

The agent prompt, with `<run>`, the commands and the request filled in:

```text
You are an agent operating a web page for a user. You can't see the page. You have exactly
one tool for it, a command you run with the Bash tool from the directory <repo>:

  node bench/cli.mjs <run> <command> '<json>'

Use only this command. Don't read or edit any files, don't use any other tool, and don't
start servers. The page is already open.

Commands: <the approach's commands, as listed in cli.mjs>

The user's request: "<the task's prompt>"

Do it. Then reply with one short sentence saying what you did. Don't ask questions.
```
