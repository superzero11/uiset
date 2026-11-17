# Canvas

A node editor composed from UI SDK's canvas behaviors: `createViewport` pans and zooms,
`createMove` drags nodes, `createSelection` and `createLasso` choose them, `spatialMove`
sends focus to the nearest node, and `createConnect` draws wires. People use a pointer or
the keyboard; agents use the same actions by the names people see.

```bash
npx shadcn@latest add @uiset/canvas
```

## Parts

| Part                     | What it is                                                                       |
| ------------------------ | -------------------------------------------------------------------------------- |
| `Canvas`                 | The editor: dot grid, nodes with ports, wires, zoom controls and a minimap       |
| `CanvasToolbar`          | On UI SDK's Toolbar: Add node (by kind), remove the selection, undo, redo, fit view |
| `CanvasInspector`        | The selected node: rename it, list its wires with Disconnect, and your own fields |
| `useCanvasHistory`       | Nodes and edges with undo and redo; one step per move, add, wire or removal      |
| `createCanvasController` | Connects the toolbar, inspector or your code to the canvas                       |

## Use

```tsx
const [canvas] = useState(createCanvasController)
const history = useCanvasHistory({ nodes, edges })
const [selected, setSelected] = useState<string[]>([])

<CanvasToolbar canvas={canvas} kinds={kinds} selectedCount={selected.length}
  onUndo={history.undo} onRedo={history.redo} canUndo={history.canUndo} canRedo={history.canRedo} />
<Canvas
  label="Workflow"
  controller={canvas}
  nodes={history.nodes}
  edges={history.edges}
  onNodesChange={history.onNodesChange}
  onEdgesChange={history.onEdgesChange}
  selected={selected}
  onSelectedChange={setSelected}
  kinds={kinds}
  onAddNode={(kind, at, title) => ({ id: crypto.randomUUID(), kind, title: title ?? "New step", ...at, ...portsFor(kind) })}
  renderNode={(node) => node.data?.summary}
  onUndo={history.undo}
  onRedo={history.redo}
  fitView
/>
<CanvasInspector node={one(selected)} nodes={history.nodes} edges={history.edges} canvas={canvas}
  onRename={rename}>{(node) => <YourFields node={node} />}</CanvasInspector>
```

- A node is `{ id, title, x, y, inputs?, outputs?, kind?, color?, width?, data? }`; a port is
  `{ id, label }`. Ids may not contain `:`.
- An edge is `{ id, from, to }`, with ports keyed `"node:out:port"` and `"node:in:port"`.
  Wires run from an output to an input on another node; each input takes one wire, and a
  new one replaces it. `canConnect(from, to)` adds your own rules, like matching types.
- Nodes, edges and the selection are controlled or not (`defaultNodes`, `defaultEdges`,
  `defaultSelected`). Removing nodes removes their wires.
- `renderNode` draws under a node's ports, as text or pictures: node faces aren't
  interactive, so the nodes can be a listbox. Its text is part of the node's description.
  Put fields in the inspector: its children start over for each node shown.
- A node is named by its title, then its kind, as it reads on screen; its description adds
  the body and its wires.
- `CanvasToolbar`'s `label` is its own name, "Canvas tools" by default. Keep the canvas's
  name out of it: agents find components by names that contain what they ask for.
- `grid` is where dropped nodes snap and how far Alt with an arrow moves them (8).
- `locked(node)` keeps a node in place. `fitView` frames every node on first show;
  `controls` and `minimap` turn the corner parts off.
- Ports are drawn from fixed sizes (a 36px header and 28px rows, in canvas units), so wires
  never wait on measuring. Keep custom styles to those sizes.

## Keys

| Keys                        | Does                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| Tab                         | Into the canvas (one stop, on the last node focused) and out           |
| Arrows                      | The nearest node in that direction                                     |
| Alt with arrows             | Move the node (or the selection) by the grid; Shift for ten steps      |
| Space                       | Select or unselect the node                                            |
| Ctrl/⌘ A, Escape            | Select every node; clear the selection                                 |
| C                           | Start a wire from the node's output (C again: its next output)         |
| Arrows, Enter, Escape       | While wiring: choose an input, connect, stop                           |
| Delete, Backspace           | Remove the node, or the selection; focus moves to the nearest node     |
| Enter                       | Open the node (your `onNodeOpen`, like focusing the inspector)         |
| +, −, 0                     | Zoom in, out, back to 100%                                             |
| Ctrl/⌘ Z, Ctrl/⌘ Shift Z    | Undo, redo (with `onUndo` and `onRedo`)                                |

Focus never falls to the page: removing a node (by Delete, the toolbar, an undo or an
agent) moves it to the nearest node, the toolbar keeps disabled tools focusable, and
Disconnect in the inspector moves to the next wire. A node added from the toolbar takes
focus; one an agent adds doesn't take it from the person. Focus rings and the selection
edge keep their width on screen at any zoom.

With a pointer: drag empty space to pan, scroll or pinch to zoom, Shift-drag to select a
box, drag a node (or the selection) to move it, drag from an output dot to an input to
wire them, and press a wire's × to remove it. The minimap pans where you press. Every
move, wire and removal is announced, and each node's description says what it's wired to
("Inputs: Prompt from Answer template Prompt.").

## For agents

`addNode(kind, title?, x?, y?)`, `moveNode(node, x, y)`, `connect(from, to, fromPort?,
toPort?)`, `disconnect(from, to)`, `select(...nodes)`, `openNode(node)` and `fitView()`,
by titles (or ids, when two share a title). A wire that isn't allowed, an unknown kind or
port, or a locked node says why. `query({ within: "Workflow" })` lists each node as
`{ value: id, label: "Draft answer (at 600, 130; Inputs: …; Outputs: …)" }`. Removing goes
through the toolbar's Remove button, marked `data-agent-confirm`, so a person approves it.

## Known limits

Find in page doesn't reveal nodes off screen yet (UI SDK's `bindFindable` can add it).
Very large graphs (thousands of nodes) render every node; virtualizing them is future
work.
