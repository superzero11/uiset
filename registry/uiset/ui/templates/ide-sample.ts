// The IDE template's sample project and linter, framework-free, so the React template and
// the web IDE page start from the same files and find the same problems.
import type { Problem } from "../ide/editing"

// A small project to start from. Replace it with yours: files are paths to text.
const sampleProject: Record<string, string> = {
  "src/index.ts": `import { greet } from "./lib/greet"
import { config } from "./config"

// TODO: read the name from the command line
const name = config.defaultName

console.log(greet(name))
`,
  "src/lib/greet.ts": `export function greet(name: string) {
  const hour = new Date().getHours()
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"
  return \`Good \${part}, \${name}.\`
}
`,
  "src/lib/format.ts": `export const title = (text: string) =>
  text.replace(/\\b\\w/g, (letter) => letter.toUpperCase())

export function plural(count: number, word: string) {
  return \`\${count} \${word}\${count === 1 ? "" : "s"}\`
`,
  "src/config.ts": `export const config = {
  defaultName: "world",
  locale: "en-US",
}
`,
  "README.md": `# Greeter

Says good morning, afternoon or evening.

\`\`\`sh
npm start
\`\`\`
`,
  "package.json": `{
  "name": "greeter",
  "version": "1.0.0",
  "scripts": { "start": "tsx src/index.ts" }
}
`,
}

/** A tiny linter for the sample: unbalanced braces, console.log, var, and TODOs. */
function sampleLint(path: string, text: string): Problem[] {
  if (!/\.(ts|tsx|js|jsx)$/.test(path)) return []
  const problems: Problem[] = []
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    const todo = line.indexOf("TODO")
    if (todo >= 0) problems.push({ path, line: i + 1, col: todo + 1, severity: "info", message: "A TODO is left here." })
    const log = line.indexOf("console.log")
    if (log >= 0) problems.push({ path, line: i + 1, col: log + 1, severity: "warning", message: "Remove console.log before shipping." })
    const v = line.search(/\bvar\s/)
    if (v >= 0) problems.push({ path, line: i + 1, col: v + 1, severity: "warning", message: "Use const or let instead of var." })
  })
  const open = (text.match(/\{/g) ?? []).length - (text.match(/\}/g) ?? []).length
  if (open !== 0)
    problems.push({
      path,
      line: lines.length,
      severity: "error",
      message: open > 0 ? `Expected "}": ${open} left open.` : `Unexpected "}": ${-open} too many.`,
    })
  return problems
}

export { sampleLint, sampleProject }
