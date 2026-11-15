// Syntax colors from shiki, loaded on first use: the core and the JavaScript regex engine
// once, then each language the first time it's asked for. Its css-variables theme colors
// tokens from --shiki-* variables (code/code.css), so every skin themes code.

type Token = { content: string; color?: string }
type Highlighter = {
  codeToTokensBase: (code: string, options: { lang: string; theme: string }) => Token[][]
  loadLanguage: (...langs: unknown[]) => Promise<void>
  getLoadedLanguages: () => string[]
}

let highlighter: Promise<Highlighter> | null = null

function loadHighlighter() {
  highlighter ??= (async () => {
    const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ])
    return (await createHighlighterCore({
      themes: [createCssVariablesTheme({ name: "uiset", variablePrefix: "--shiki-" })],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    })) as unknown as Highlighter
  })()
  return highlighter
}

/** Lines of colored tokens, or null for a language shiki doesn't know. */
async function tokenize(code: string, language: string): Promise<Token[][] | null> {
  const shiki = await loadHighlighter()
  const { bundledLanguages, bundledLanguagesAlias } = (await import("shiki/langs")) as unknown as {
    bundledLanguages: Record<string, () => Promise<unknown>>
    bundledLanguagesAlias: Record<string, () => Promise<unknown>>
  }
  const load = bundledLanguages[language] ?? bundledLanguagesAlias[language]
  if (!load) return null
  if (!shiki.getLoadedLanguages().includes(language)) await shiki.loadLanguage(load())
  return shiki.codeToTokensBase(code, { lang: language, theme: "uiset" })
}

const byExtension: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
  mdx: "mdx",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "shellscript",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sql: "sql",
}

/** The language for a file name, like "tsx" for "app.tsx", or undefined for plain text. */
function languageOf(path: string) {
  const name = path.split("/").pop() ?? path
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return byExtension[ext]
}

export { languageOf, loadHighlighter, tokenize }
export type { Token }
