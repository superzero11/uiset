// A form's definition as an agent tool: its fields are the tool's input, and a call fills the
// form on the page through the agent bridge, so the bridge's `allow` and the submit's
// `data-agent-confirm` still decide what happens. The person sees every value land.
import { toJSONSchema, type FormDefinition, type JSONSchema } from "./schema"

type BridgeStep = { ref: string; action: string; args?: unknown[] }
/** The agent bridge from `createAgent`, as far as a form tool needs it. */
type Bridge = { act: (input: { steps: BridgeStep[] }) => Promise<{ ok: boolean; error?: { message: string } }> }

type FormToolOptions = {
  /** The form's name on the page, when it isn't its title (a form with `heading={false}` and its own `aria-label`). */
  ref?: string
  /**
   * The submit button's label, to press it after filling. A submit marked with
   * `data-agent-confirm` (the form's default) waits for the person to approve it.
   */
  submit?: string
}

type FormToolResult = { ok: true; filled: string[] } | { ok: false; error: string }

type FormTool = {
  name: string
  description: string
  inputSchema: JSONSchema
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean; consequentialHint: boolean }
  execute: (input: Record<string, unknown>) => Promise<FormToolResult>
}

/**
 * The form as a tool for a model: name, description, JSON Schema input and `execute`. Hand it
 * to your model SDK (AI SDK's `tool({ description, inputSchema: jsonSchema(t.inputSchema),
 * execute: t.execute })`), or to the browser's agent with `registerFormTool`.
 */
function formTool(form: FormDefinition, agent: Bridge, options: FormToolOptions = {}): FormTool {
  const ref = options.ref ?? form.title
  const fields = form.names.map((name) => form.fields[name]!.label).join(", ")
  return {
    name: form.name,
    description: [
      `${form.title}.`,
      form.description,
      `Fills the "${ref}" form on the page (${fields}).`,
      options.submit ? `Then presses ${options.submit}, which may wait for the person to approve it.` : "The person reviews it and sends it.",
    ]
      .filter(Boolean)
      .join(" "),
    inputSchema: toJSONSchema(form),
    // Results carry the page's words (labels, problems), and a submit can't be taken back.
    annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: !!options.submit },
    async execute(input) {
      const steps: BridgeStep[] = [{ ref, action: "fill", args: [input ?? {}] }]
      if (options.submit) steps.push({ ref: options.submit, action: "press" })
      const result = await agent.act({ steps })
      return result.ok ? { ok: true, filled: Object.keys(input ?? {}) } : { ok: false, error: result.error?.message ?? `"${ref}" couldn't be filled.` }
    },
  }
}

type ModelContext = { registerTool?: (tool: Omit<FormTool, "execute"> & { execute: (input: Record<string, unknown>) => Promise<FormToolResult> }, options: { signal: AbortSignal }) => Promise<unknown> }

/**
 * Registers the form's tool with the browser's own agent through WebMCP
 * (`document.modelContext.registerTool`), as UI SDK's `registerTools` does for its three.
 * Does nothing where the browser has no WebMCP. Returns a function that unregisters it.
 */
function registerFormTool(form: FormDefinition, agent: Bridge, options: FormToolOptions = {}) {
  const context = (globalThis.document as (Document & { modelContext?: ModelContext }) | undefined)?.modelContext
  if (!context?.registerTool) return () => {}
  const controller = new AbortController()
  const tool = formTool(form, agent, options)
  context.registerTool({ ...tool, execute: (input) => tool.execute(input) }, { signal: controller.signal }).catch(() => {})
  return () => controller.abort()
}

export { formTool, registerFormTool }
export type { Bridge, FormTool, FormToolOptions, FormToolResult }
