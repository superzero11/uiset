#!/usr/bin/env bash
# Installs every registry item into a fresh Vite + React app with the shadcn CLI,
# then typechecks and builds that app. Proves the registry works outside this repo.
#
#   scripts/install-test.sh [workdir]
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
work="${1:-$(mktemp -d)}"
port=5644
app="$work/app"

REGISTRY_URL="http://localhost:$port" pnpm --dir "$repo" -s registry:build >/dev/null

python3 -m http.server "$port" --directory "$repo/public" >/dev/null 2>&1 &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -fs "http://localhost:$port/r/uiset.json" >/dev/null && break; sleep 0.1; done

rm -rf "$app" && mkdir -p "$app/src"
cd "$app"

cat > package.json <<'JSON'
{
  "name": "uiset-install-test",
  "private": true,
  "type": "module",
  "scripts": { "build": "tsc --noEmit && vite build" }
}
JSON
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
JSON
cat > vite.config.ts <<'TS'
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
})
TS
cat > components.json <<'JSON'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils",
    "hooks": "@/hooks"
  }
}
JSON
echo '<!doctype html><div id="root"></div><script type="module" src="/src/main.tsx"></script>' > index.html
touch src/index.css

pnpm add -s react@19.3.1 react-dom@19.3.1 >/dev/null
pnpm add -s -D typescript@5.9.3 vite@8.3.8 @vitejs/plugin-react@6.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24.19.2 >/dev/null

# Every item in the registry, so a new item can't be left out of the test.
# (A plain array, not mapfile: macOS ships bash 3.2. Item names have no spaces.)
items=($(node -e 'for (const i of require(process.argv[1]).items) console.log(i.name)' "$repo/registry.json"))
[ "${#items[@]}" -gt 0 ] || { echo "no items in registry.json"; exit 1; }
for item in "${items[@]}"; do
  npx -y shadcn@4.23.0 add "http://localhost:$port/r/$item.json" --yes --overwrite >/dev/null
done

# Import every installed item so each file is typechecked and bundled.
{
  for item in "${items[@]}"; do
    path=$(node -e 'const i = require(process.argv[1]).items.find((x) => x.name === process.argv[2]); const t = i.files[0].target ?? ""; console.log(t.startsWith("@ui/") ? t.slice(4).replace(/\.tsx?$/, "") : process.argv[2])' "$repo/registry.json" "$item")
    echo "import * as item_${item//-/_} from \"@/components/ui/${path}\""
  done
  echo "export const allItems = [$(printf 'item_%s, ' "${items[@]//-/_}")]"
} > src/all-items.ts

cat > src/main.tsx <<'TSX'
import { allItems } from "./all-items"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldLabel, Input } from "@/components/ui/field"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { UISet } from "@/components/ui/uiset"
import { Knob } from "@/components/ui/knob"
import { PatchBay, PatchBayJack } from "@/components/ui/patch-bay"
import { Fader } from "@/components/ui/fader"
import { LevelMeter } from "@/components/ui/level-meter"
import { StepSequencer } from "@/components/ui/step-sequencer"
import { createAgent } from "@ui-sdk/react/agent"
import { createHistory } from "@ui-sdk/react/history"
import { createApprovals } from "@/components/ui/agent/approvals"
import { highlightAgent } from "@/components/ui/agent/highlight"
import { runAgentTool } from "@/components/ui/agent/tools"
import { AgentActivity, AgentApprovals, AgentConsole } from "@/components/ui/agent-console"
import { ChatMessage, ChatMessageActions, ChatTasks, ChatThread } from "@/components/ui/chat"
import { ChatComposer, ChatModelPicker, ChatUsage } from "@/components/ui/chat-composer"
import { ChatReasoning, ChatSources, ChatTool } from "@/components/ui/chat-parts"
import { ChatResponse } from "@/components/ui/chat-response"
import { ChatLauncher, ChatThreadList } from "@/components/ui/chat-sidebar"

const approvals = createApprovals()
const agent = createAgent({ allow: approvals.allow })
const history = createHistory(agent)
highlightAgent()
void runAgentTool(agent, "snapshot", {})

console.log(allItems.length)

createRoot(document.getElementById("root")!).render(
  <UISet skin="blueprint" sound keyColor={{ l: 0.55, c: 0.2, h: 30 }}>
    <Field>
      <FieldLabel>Name</FieldLabel>
      <Input />
    </Field>
    <Select defaultValue="a">
      <SelectLabel>Choice</SelectLabel>
      <SelectTrigger />
      <SelectContent>
        <SelectItem value="a">A</SelectItem>
      </SelectContent>
    </Select>
    <Slider aria-label="Level" defaultValue={20} />
    <Switch aria-label="Power" />
    <SegmentedControl aria-label="Mode" defaultValue="x">
      <SegmentedControlItem value="x">X</SegmentedControlItem>
    </SegmentedControl>
    <Tabs defaultValue="t">
      <TabsList aria-label="Tabs">
        <TabsTab value="t">T</TabsTab>
      </TabsList>
      <TabsPanel value="t">Panel</TabsPanel>
    </Tabs>
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Hello</DialogTitle>
      </DialogContent>
    </Dialog>
    <Button variant="outline">Go</Button>
    <UISet skin="studio">
      <PatchBay aria-label="Patch bay" labels={{ "a:out": "A out", "b:in": "B in" }}>
        <Knob label="Cutoff" min={80} max={8000} scale="log" defaultValue={900} />
        <PatchBayJack port="a:out" label="A out" />
        <PatchBayJack port="b:in" label="B in" />
      </PatchBay>
      <Fader label="Master" defaultValue={70} />
      <LevelMeter label="Signal" value={40} />
      <StepSequencer label="Pattern" defaultValue={["1", "5"]} />
    </UISet>
    <AgentConsole status="idle">
      <AgentActivity history={history} />
      <AgentApprovals approvals={approvals} />
    </AgentConsole>
    <ChatThreadList threads={[{ id: "a", title: "Hello" }]} value="a" onValueChange={() => {}} />
    <ChatThread>
      <ChatMessage from="assistant" actions={<ChatMessageActions text="Hi" />}>
        <ChatReasoning seconds={2}>Thinking</ChatReasoning>
        <ChatTool name="search" status="done" input={{ q: "x" }} output={{ n: 1 }} />
        <ChatResponse>{"**Hi** there\n\n```ts\nconst a = 1\n```"}</ChatResponse>
        <ChatSources sources={[{ href: "https://example.com", title: "Example" }]} />
        <ChatTasks tasks={[{ id: "1", title: "Do it", status: "done" }]} />
      </ChatMessage>
    </ChatThread>
    <ChatComposer
      onSubmit={() => {}}
      commands={[{ value: "explain", label: "explain" }]}
      attachments={{ maxFiles: 2 }}
      tools={
        <>
          <ChatModelPicker models={[{ value: "a", label: "A" }]} />
          <ChatUsage used={10} limit={100} />
        </>
      }
    />
    <ChatLauncher>
      <p>Hi</p>
    </ChatLauncher>
  </UISet>,
)
TSX

pnpm -s build
echo "install test passed: ${#items[@]} items installed, typechecked and built in $app"
