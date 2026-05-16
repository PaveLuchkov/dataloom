# Lineage Editor — Session Handoff

## Goal

A web app for a data analyst to visually document DataFrame lineage.
The mental model: you build a graph where nodes are DataFrames (with columns),
edges are derivation relationships between columns, and operator nodes (Merge, Filter, GroupBy)
sit between source and result DataFrames.

End state imagined: open the app, drag columns across DataFrames to show where
each column came from, place operator nodes to document transformations, export the diagram
as PNG or save it for the next session.

---

## What's Built (current state)

### Stack
- `create-react-app` (CRA) — intentionally chosen for zero-config, despite deprecation warnings
- React Flow (`reactflow`) — canvas, nodes, edges, handles, pan/zoom
- Tailwind CSS v3 — utility styles
- `html-to-image` — PNG export
- `dagre` — auto-layout

### Dev server
Running at **http://localhost:3001** (port 3000 was occupied).
Start with: `PORT=3001 npm start` from `lineage-editor/`.

### Git history (latest first)
```
(uncommitted) fix: trace upstream through companion/result DFs; fix duplicate node in TracePanel
c92e40d  feat: companion DF pattern + column lineage tracing
d8bd62f  Этап 3: улучшенный поиск по всему графу
2f981c2  Этап 2: типы колонок в UI GroupByNode и FunctionNode
a8d8ce6  Этап 1: единый источник истины для колонок нод
ba9b4c5  Исправлены иконки в тулбаре и исправлены цвета навазния колонок в function
49d76c6  Fix tracker search for merge node output columns
5ad4d88  Fix ESLint unused vars blocking Vercel build
c4d4069  Add RenameNode, TransformNode, ConcatNode; stage badges, code snippets, column edges, tracker highlights
```

---

## File Map

```
src/
├── nodes/                        ← one directory per node type
│   ├── registry.js               ← SINGLE entry point: nodeTypes, isValidConnection,
│   │                                getMinimapColor, ADDABLE_NODES, getDagre*, getNodeDisplayName
│   ├── dataframe/
│   │   ├── index.jsx             ← DataFrameNode component
│   │   │                            (companion badge ⊙, read-only mode, per-row ◎ trace button)
│   │   ├── config.js             ← colors, dagreWidth/Height, make(), makeCompanion(), menu, connections
│   │   └── callbacks.js          ← useDataFrameCallbacks(setNodes, setEdges, pushHistory)
│   ├── merge/
│   │   ├── index.jsx             ← MergeNode (config-only: join type + key pairs; companion button →●/→○)
│   │   ├── config.js
│   │   └── callbacks.js          ← useMergeCallbacks(setNodes, pushHistory)
│   ├── function/
│   │   ├── index.jsx             ← FunctionNode (companion button →●/→○)
│   │   ├── config.js
│   │   └── callbacks.js          ← useFunctionCallbacks(setNodes, setEdges, pushHistory)
│   ├── filter/
│   │   ├── index.jsx             ← FilterNode component
│   │   ├── config.js             ← amber/orange colors; connections: [] (universal rule)
│   │   └── callbacks.js          ← useFilterCallbacks(setNodes, pushHistory)
│   ├── groupby/
│   │   ├── index.jsx             ← GroupByNode (companion button →●/→○)
│   │   ├── config.js             ← sky/cyan colors; connections: [] (universal rule)
│   │   └── callbacks.js          ← useGroupByCallbacks(setNodes, setEdges, pushHistory)
│   ├── rename/
│   │   ├── index.jsx             ← RenameNode component
│   │   ├── config.js
│   │   └── callbacks.js          ← useRenameCallbacks(setNodes, pushHistory)
│   ├── transform/
│   │   ├── index.jsx             ← TransformNode component
│   │   ├── config.js
│   │   └── callbacks.js          ← useTransformCallbacks(setNodes, pushHistory)
│   ├── concat/
│   │   ├── index.jsx             ← ConcatNode component
│   │   ├── config.js
│   │   └── callbacks.js          ← useConcatCallbacks()
│   └── comment/
│       ├── index.jsx             ← CommentNode component
│       ├── config.js             ← NOTE_PALETTE (5 sticky-note colors); no connections
│       └── callbacks.js          ← useCommentCallbacks(setNodes, pushHistory)
├── utils/
│   ├── uid.js                    ← shared ID counter (Date.now() seed)
│   ├── nodeOutputAttrs.js        ← SINGLE SOURCE OF TRUTH for column output per node type:
│   │                                computeNodeOutputAttributes(node, edges, nodes) → Attr[]
│   │                                getUpstreamAttrs(nodeId, edges, nodes, handleId?) → Attr[]
│   │                                inferAggType(func, inputType) → type string
│   │                                traceColumnUpstream(nodeId, colName, edges, nodes) → chain | null
│   │                                traceColumnDownstream(nodeId, colName, edges, nodes) → branch[]
│   │                                flattenUpstream(step) → step[] (oldest → newest)
│   └── exportSql.js              ← SQL generation from graph
├── components/
│   ├── AttributeTrackerPanel.jsx ← Track overlay (Ctrl+Shift+F): input + suggestions dropdown
│   ├── ColumnEdge.jsx            ← custom edge type showing column name on hover
│   ├── ColumnSelect.jsx          ← shared column selector with fallback to text input
│   ├── ContextMenu.jsx           ← reads ADDABLE_NODES from registry; node label from getNodeDisplayName
│   ├── DragContext.jsx           ← React Context with useRef for drag state (no re-renders)
│   ├── EditableText.jsx          ← shared inline-edit component (double-click to edit)
│   ├── HighlightedConditionInput.jsx ← textarea with @column syntax highlighting + autocomplete
│   ├── NodeCodeBlock.jsx         ← collapsible code snippet block (toggled via </> button)
│   ├── NodeErrorBoundary.jsx     ← class component; isolates node render crashes
│   ├── SearchModal.jsx           ← Cmd+K search overlay (searches all node types via _outputAttrs)
│   ├── ShortcutsModal.jsx        ← ? keyboard shortcuts reference overlay
│   ├── SqlExportModal.jsx        ← modal showing generated SQL with copy button
│   ├── SqlImportModal.jsx        ← modal to paste SQL SELECT → auto-create DataFrameNode
│   ├── StageBadge.jsx            ← clickable stage pill on node header
│   ├── TabBar.jsx                ← canvas tabs bar (add, rename, close, switch)
│   └── TracePanel.jsx            ← column lineage trace panel (right side overlay)
├── hooks/
│   ├── useAutoLayout.js          ← dagre LR layout; sizes come from registry
│   ├── useCanvasTabs.js          ← multi-canvas tab state; each tab saved to its own localStorage key
│   ├── useContextMenu.js         ← menu state + onPaneContextMenu / onNodeContextMenu
│   ├── useLineagePersistence.js  ← save / load localStorage, export PNG, save/load JSON file
│   └── useLineageState.js        ← state + history; composes per-type callback hooks;
│                                    addNodeOfType(type, x, y) uses registry config.make();
│                                    COMPANION_TYPES = mergeNode | groupByNode | functionNode;
│                                    addNodeOfType auto-creates companion DF for operator types;
│                                    deleteNode and keyboard Delete cascade to companion DF;
│                                    onCreateCompanion: manual companion creation callback;
│                                    makeCompanionEdge: dashed slate edge (data.isCompanionEdge: true);
│                                    useEffect clears stale companionId when companion deleted;
│                                    connectedAttrs injected via getUpstreamAttrs for
│                                      FilterNode/RenameNode/TransformNode;
│                                    leftDF/rightDF injected via computeNodeOutputAttributes
│                                      for MergeNode (works for chained merges);
│                                    result-DF column sync via useEffect — covers ALL operator nodes
├── constants.js                  ← DRAG_TYPE, STORAGE_KEY, TABS_KEY, ACTIVE_TAB_KEY, canvasKey(),
│                                    JOIN_TYPES, JOIN_ACTIVE_STYLES,
│                                    ATTR_TYPES, ATTR_TYPE_META  (no per-node colors/sizes)
├── App.jsx                       ← UI shell: imports nodeTypes/isValidConnection/getMinimapColor
│                                    from registry; passes addableNodes to Toolbar + ContextMenu;
│                                    owns traceState (nodeId + colName + nodeType + nodeLabel);
│                                    onTraceColumn toggles traceState (same click = close);
│                                    traceResult = { upstream: chain, downstream: branches[] };
│                                    tracePathNodeIds / tracePathEdgeIds computed as Sets;
│                                    Escape key closes trace mode first, then other panels;
│                                    trackedNodes: trace mode takes priority over keyword tracker
│                                      (cyan glow for current, blue outline for path, 10% for off-path);
│                                    displayEdges: path edges animate cyan at 2.5px, off-path dims to 4%;
│                                    AttributeTrackerPanel hidden while trace mode is active;
│                                    renders <TracePanel> when traceState is set
└── Toolbar.jsx                   ← add-node buttons rendered from ADDABLE_NODES
```

---

## Feature Inventory

### DataFrameNode
- Double-click title or any column name → inline edit (Enter/Escape)
- `+` button in header → add column (**hidden on companion DFs**)
- Hover column → `×` appears → delete column (**hidden on companion DFs**)
- Hover column → grip icon `⠿` → **drag within same node** to reorder
  - Blue insert-line indicator shows drop position
- **Drag column onto a different DataFrame** → column is copied there + lineage edge created automatically; type is preserved
- Per-column handles: left dot (target) + right dot (source) for manual edge drawing
- Two teal square handles at top corners:
  - `df-in` (top-left) — receives any `df-out` connection
  - `df-out` (top-right) — sends to any node's `df-in`, or to `left-in`/`right-in` on MergeNode
- **Type badge** (`str`/`int`/`flt`/`dat`/`bool`) before each column name — click to cycle type (**disabled on companion DFs**)
- **Auto-synced**: if a DataFrameNode is connected via `df-in` to any operator node, its columns are automatically overwritten by `computeNodeOutputAttributes` of the upstream node
- **Companion badge `⊙`**: shown in header when `data._companionOf` is set — marks the node as an operator output
- **Trace button `◎`**: per-column, visible on hover — calls `onTraceColumn(nodeId, colName)` to open the trace panel
- **Trace highlight**: active traced column row gets `rgba(6,182,212,0.12)` background + cyan bold text

### FunctionNode
- Drop columns from any node onto the Inputs panel → creates input entry + edge
- **Drag `df-out` handle from any node → `df-in` on FunctionNode** → adds the whole DataFrame as a named input group
- Add/delete/rename output columns; each output has explicit type (clickable to cycle)
- **Companion button `→●` / `→○`** in header — click `→○` to create a companion output DF; grays out to `→●` when one exists
- Two square handles at top corners: `df-in` (top-left), `df-out` (top-right)

### MergeNode
- Created by: select exactly 2 nodes → toolbar **⋈ Merge** button (or right-click canvas)
- Auto-wires: left node `df-out → left-in`, right node `df-out → right-in`
- **Companion output DF** auto-created on merge (label `merge_result`) with dashed companion edge
- **Companion button `→●` / `→○`** in header — create additional companion manually
- Join type toggle: `inner` / `left` / `right` / `outer` (color-coded)
- Key pairs editor: add/remove `left_col = right_col` pairs with dropdowns
- Output panel removed — output columns live in the companion DF, driven by result-DF sync
- Square handle: `df-out` (top-right) — source for companion + downstream connections

### GroupByNode (sky/cyan)
- Square handles at top corners: `df-in` (top-left), `df-out` (top-right) — universal DF-level connections
- **Left panel (Inputs)**: drop zone; toggle `⊞` / `○` per input to mark as group-by key
- **Right panel (Outputs)**: group-by keys + aggregation outputs with TypeBadge and source handles
- **Companion button `→●` / `→○`** in header
- Auto-spawns companion DF when placed from toolbar

### FilterNode (amber/orange)
- Square handles at top corners: `df-in` (left), `df-out` (right)
- **Multi-condition WHERE builder** with `HighlightedConditionInput` (see below)
- `connectedAttrs` injected via `getUpstreamAttrs`

### RenameNode (indigo)
- Square handles at top corners: `df-in` (left), `df-out` (right)
- Rows of `old_name → new_name` mappings; source column type preserved in output

### TransformNode
- Square handles at top corners: `df-in` (left), `df-out` (right)
- Stores explicit `attributes[]` (not derived)

### ConcatNode
- Square handles; pass-through: output = union of all upstream inputs

### CommentNode (sticky note)
- No handles — canvas decoration only
- 5 palette colors, textarea body

### Result-DF column sync
Any DataFrameNode connected via `df-in` to any operator has its attributes auto-driven by `computeNodeOutputAttributes` of the upstream node. Implemented as a `useEffect` watching `nodes + edges`. `JSON.stringify` comparison prevents infinite loops.

### Companion DF pattern
Operator nodes (mergeNode, groupByNode, functionNode) automatically spawn a paired DataFrameNode to their right when created. This companion DF:
- Has `data._companionOf = operatorNodeId` — marks it as auto-managed
- Is connected via a **dashed slate companion edge** (`data.isCompanionEdge: true`, stroke `#334155`, `strokeDasharray: '5 4'`)
- Gets its columns driven by result-DF sync (the operator's `computeNodeOutputAttributes`)
- Is **read-only** in the UI: no add/delete column, no type-cycle, no name edit
- Is **cascade-deleted** when its operator is deleted (via `deleteNode` and keyboard Delete)
- Stale `companionId` on the operator is cleared by a `useEffect` if companion is manually deleted
- Operators show `→●` / `→○` companion button; `→○` triggers `onCreateCompanion`

### Column Lineage Tracing
- Click `◎` on any column row in a DataFrameNode → opens **TracePanel** (right-side overlay)
- Click the same column again → closes trace panel
- **Escape key** closes trace mode (priority over other panels)
- **TracePanel** shows three sections:
  - `↑ origin` — upstream ancestor chain (oldest → parent of current)
  - `◉ here` — the node where trace was clicked
  - `↓ flows to` — branching downstream tree
- Each step shows node icon (per type), node label, column name, agg info, `← created here` marker
- **Click any step** → `fitView` to that node with animation
- **Canvas effects during trace**:
  - Current node: cyan glow `0 0 0 2px #06b6d4`
  - Other path nodes: blue outline `0 0 0 2px #1e4d8c`
  - Off-path nodes: 10% opacity
  - Path edges: animated cyan `#06b6d4`, 2.5px
  - Off-path edges: 4% opacity
- AttributeTrackerPanel is hidden while trace is active
- Tracing traverses **through companion DFs** — a companion DF looks for an incoming `df-in` edge and continues upstream through the operator

### Canvas Tabs (Stages)
- **Tab bar** at the bottom — add, rename (double-click), close tabs
- Each tab is an independent canvas stored under `canvasKey(tabId)` in localStorage
- First load migrates old single-canvas `STORAGE_KEY` into tab 1

### Canvas
- Pan + zoom; `minZoom: 0.05` / `maxZoom: 2`
- Right-click canvas → add menu + "⋈ Merge selected" (when 2 nodes selected)
- Right-click node → "Delete …"
- Select nodes + Delete → removes nodes + edges + cascade companion DFs

### Copy / Paste
- `Ctrl+C` / `Cmd+C` — copies selected nodes; `Ctrl+D` / `Cmd+D` — pastes with `+40px × pasteCount` offset
- Pasted operators have `companionId: undefined` stripped (no dangling reference to original's companion)

### Undo / Redo
- `Ctrl+Z` / `Cmd+Z` — undo; `Ctrl+Y` / `Ctrl+Shift+Z` — redo
- Also toolbar buttons ↩ / ↪
- Max 50 snapshots; refs-based (no re-renders)

### Auto-layout
- **⬦ Auto-arrange** toolbar button — runs dagre LR, then `fitView`

### Search (`Cmd+K`)
- Searches all node types via `_outputAttrs` pre-computed from `computeNodeOutputAttributes`
- Results: node name matches + `node › column` with type badge
- Arrow keys navigate, Escape closes

### Attribute Tracker (`Ctrl+Shift+F`)
- Floating panel — amber theme; `W=` exact match toggle
- Matched nodes glow amber, unmatched fade to 12%
- Attribute-level highlight within DataFrameNode rows
- **Hidden when trace mode is active** (trace takes visual priority)

### Column Edges
- Custom edge type `columnEdge` for column-level lineage
- `displayEdges` in App.jsx resolves column name from `sourceHandle` for all node types

### SQL Export / Import
- Export: walks graph → `SELECT … FROM … JOIN … WHERE … GROUP BY`
- Import: paste `SELECT` statement → auto-creates DataFrameNode with columns

### Keyboard Shortcuts
- `?` → ShortcutsModal
- `D` → add DataFrameNode, `F` → FilterNode, `E` → FunctionNode, `G` → GroupByNode, `C` → CommentNode
- `L` → auto-layout, `M` → merge 2 selected
- `Esc` → close trace panel first, then other panels

### Persistence
- `Ctrl+S` / `Ctrl+O` → save/load JSON file; localStorage per-tab
- Export PNG → `html-to-image`, 3× pixel ratio

---

## Architecture Notes

### Column / Attribute Data Model

Every column: `{ id: string, name: string, type: string }` where `type ∈ 'string' | 'int' | 'float' | 'date' | 'bool'`

| Node | Stored fields | Source of truth for output |
|---|---|---|
| DataFrameNode | `attributes[]` | `attributes` directly |
| FunctionNode | `inputs[]` (attrType), `outputs[]` (type) | `outputs` |
| GroupByNode | `inputs[]` (attrType), `groupByInputIds`, `aggregations[]` | keys from inputs + agg outputs via `inferAggType` |
| MergeNode | nothing — computed | union of left + right node outputs |
| FilterNode | nothing — computed | pass-through of upstream |
| RenameNode | `mappings[]` (from/to names) | mapped names with preserved types |
| TransformNode | `attributes[]` | `attributes` directly |
| ConcatNode | nothing — computed | union of all upstream |

### Companion DF storage

| Field | Location | Meaning |
|---|---|---|
| `data._companionOf` | DataFrameNode | ID of the operator that owns this companion |
| `data.companionId` | Operator node | ID of its companion DataFrameNode |
| `data.isCompanionEdge` | Edge | Marks the dashed operator→companion connection |

`COMPANION_TYPES = new Set(['mergeNode', 'groupByNode', 'functionNode'])` — checked in `addNodeOfType` and `deleteNode`.

`dataframeConfig.makeCompanion(id, companionOf, x, y, attributes, label)` — factory for companion DF nodes.

### Column Lineage Tracing — `nodeOutputAttrs.js`

```js
traceColumnUpstream(nodeId, colName, edges, nodes)
  → { nodeId, colName, nodeType, nodeLabel, upstream: chain | null, ...extras }
```

Extras per node type:
- `groupByNode` agg: `aggFunc`, `inputColName`
- `functionNode`: `createdHere: true`

**Critical**: `dataFrameNode` case is NOT terminal — it looks for an incoming `df-in → df-out` edge and traces through the upstream operator. This is what allows tracing through companion DFs:
```
source_df → [df-out] → mergeNode → [df-out] → companion_df → [df-out] → groupByNode → [df-out] → companion_df
```

```js
traceColumnDownstream(nodeId, colName, edges, nodes)
  → [{ nodeId, colName, nodeType, nodeLabel, downstream: [...] }]
```

Uses `_propagateCol(targetNode, colName, edges, nodes) → newColName | null`:
- `renameNode`: maps `from → to` (column name changes downstream)
- `groupByNode`: key passthrough or agg input → outputName
- `filterNode`, `concatNode`, `transformNode`: pass-through if column present in output
- `functionNode`: shown as endpoint (column consumed, not propagated by default)
- `dataFrameNode`, `mergeNode`: checks `computeNodeOutputAttributes` for presence

```js
flattenUpstream(step) → step[]   // [oldest … current]
```

### How trace affects rendering

In App.jsx:
1. `traceState: { nodeId, colName, nodeType, nodeLabel }` — what's being traced
2. `traceResult: { upstream, downstream }` — full trace tree
3. `tracePathNodeIds: Set<string>` — all node IDs on the path (upstream chain + downstream recursion)
4. `tracePathEdgeIds: Set<string>` — all edge IDs between path nodes
5. `trackedNodes` memo: if `tracePathNodeIds` set, applies cyan/blue/dim styling; otherwise falls through to keyword tracker logic
6. `displayEdges` memo: if `tracePathEdgeIds` set, animates path edges cyan and dims off-path to 4%
7. `onTraceColumn` is injected into every node's `data` via `trackedNodes` memo; DataFrameNode reads it from `data`

### `computeNodeOutputAttributes` — single source of truth

`src/utils/nodeOutputAttrs.js` exports:
```js
computeNodeOutputAttributes(node, edges, nodes) → { id, name, type }[]
getUpstreamAttrs(nodeId, edges, nodes, handleId?) → { id, name, type }[]
inferAggType(func, inputType) → string
traceColumnUpstream(nodeId, colName, edges, nodes) → step | null
traceColumnDownstream(nodeId, colName, edges, nodes) → step[]
flattenUpstream(step) → step[]
```

### How `nodesWithCallbacks` enriches nodes

| Node type | Injected field | Source |
|---|---|---|
| `functionNode`, `concatNode` | `connectedDFs` | edges with `targetHandle === 'df-in'` |
| `filterNode`, `renameNode`, `transformNode` | `connectedAttrs` | `getUpstreamAttrs(n.id, edges, nodes)` |
| `mergeNode` | `leftDF`, `rightDF` | `computeNodeOutputAttributes` of L/R source nodes |
| all nodes | `onTraceColumn`, `traceColName` | injected in App.jsx `trackedNodes` memo (after `nodesWithCallbacks`) |
| all nodes | all callbacks | `callbacks.current` ref via `attachCallbacks` |

**Ordering constraint**: `callbacks.current = { ... }` must be assigned AFTER all `useCallback` definitions that it references (ESLint no-use-before-define applies to `useCallback` in the same scope).

### Result-DF auto-sync

A `useEffect` in `useLineageState` runs on every `nodes`/`edges` change:
```js
const computed = computeNodeOutputAttributes(src, edges, nodes);
if (JSON.stringify(n.data.attributes) !== JSON.stringify(computed)) {
  // overwrite the DataFrameNode's attributes
}
```

Companion DFs are the primary consumers of this sync. Their columns are fully managed — manual edits would be overwritten.

### Node Registry pattern

Each node type: `src/nodes/<type>/` with `config.js`, `callbacks.js`, `index.jsx`.  
`src/nodes/registry.js` assembles: `nodeTypes`, `isValidConnection`, `getMinimapColor`, `getDagre*`, `ADDABLE_NODES`, `getNodeDisplayName`.

### Standard DF-level handles

| Handle | Type | Position | Purpose |
|---|---|---|---|
| `df-in` | target | top-left | Receives any `df-out` connection |
| `df-out` | source | top-right | Sends to any `df-in`, or to `left-in`/`right-in` |

MergeNode additionally has `left-in` (30% top) and `right-in` (70% top).

`isValidConnection` rules:
```
Column lineage:   *-source  →  *-target
Universal DF:     df-out    →  df-in
DF → Merge L:     df-out    →  left-in
DF → Merge R:     df-out    →  right-in
```

### Adding a new node type (the full recipe)
1. `src/nodes/<type>/config.js` — define colors, `make()`, `menu`, `connections`
2. `src/nodes/<type>/callbacks.js` — export `use<Type>Callbacks` hook
3. `src/nodes/<type>/index.jsx` — React component with `df-in`/`df-out` Handles at `top: 14`
4. One line in `registry.js`: `{ config: myConfig, component: MyNode }`
5. Import and compose callbacks in `useLineageState.js`
6. Add case to `computeNodeOutputAttributes` in `nodeOutputAttrs.js`
7. If node is an operator that produces output columns → add to `COMPANION_TYPES` in `useLineageState.js` to get automatic companion DF spawning
8. Add case to `traceColumnUpstream` and `_propagateCol` in `nodeOutputAttrs.js`

### Canvas Tabs storage layout
```
localStorage keys:
  lineage-tabs          → JSON array of { id, name }
  lineage-active-tab    → active tab id string
  lineage-canvas-{id}   → { nodes, edges } for each tab
  lineage-editor-state  → legacy single-canvas key (migrated to tab 1 on first load)
```

---

## What Failed / Dead Ends

### Tailwind v4 install
`npm install -D tailwindcss postcss autoprefixer` pulled Tailwind v4 which has no `tailwindcss` CLI binary. Fixed by pinning `tailwindcss@3`.

### `App.js` shadowing `App.jsx`
CRA scaffolded `App.js`. After creating `App.jsx`, the old file took priority. Fixed by deleting `App.js`, `App.css`, `logo.svg`.

### Port conflict
`npm start` hits port 3000. Must use `PORT=3001 npm start`.

### Attribute drag conflicting with node drag
Fix: `onMouseDown: e.stopPropagation()` on every draggable attribute row.

### `dataTransfer.getData` blocked during dragover
Browser blocks `.getData()` during drag. Fixed with `DragContext` ref set at `dragstart`.

### HTML5 drag for DF-level drop on FunctionNode
Abandoned; added `df-in` Handle to FunctionNode for standard handle-drag.

### TracePanel showing current node twice
`flattenUpstream(traceResult.upstream)` returns `[…ancestors, current]`. Was slicing incorrectly — current appeared both in the upstream chain AND in the "here" section. Fixed: `upstreamChain = fullChain.slice(0, -1)`, `currentStep = fullChain.at(-1)`.

### traceColumnUpstream stopping at companion DF
`dataFrameNode` case returned `upstream: null` always — companion DFs never traced through to their operator. Fixed: look for incoming `df-in → df-out` edge on the DF and recursively call `traceColumnUpstream` on the source operator.

### ESLint ordering issues in useLineageState and App.jsx
- `callbacks.current = { ..., onCreateCompanion }` was placed before the `useCallback` definition → moved after all callbacks
- `trackedNodes` useMemo referenced `traceState` / `tracePathNodeIds` / `onTraceColumn` before they were declared → moved the entire trace block before `trackedNodes` in App.jsx

---

## Next Things To Build

### Pending (uncommitted)
The trace bug fixes in `src/utils/nodeOutputAttrs.js` and `src/components/TracePanel.jsx` compiled successfully but were not committed. Commit:
```bash
git add src/utils/nodeOutputAttrs.js src/components/TracePanel.jsx
git commit -m "fix: trace upstream through companion/result DFs; fix duplicate node in TracePanel"
```

### Medium priority

**Validation layer**
Highlight problems: MergeNode with no key pairs, disconnected inputs, circular paths.

**Edge label tooltips**
Show source column name on hover for DF-level edges (column edges already show label via `ColumnEdge` custom type).

**FilterNode condition autocomplete — full upstream chain**
Currently `@column` autocomplete only suggests from directly connected `df-in` nodes. Could extend to walk the full upstream chain via `computeNodeOutputAttributes`.

### Lower priority

**Lineage path highlighting in Tracker**
When exact-match tracking, highlight not just matching nodes but the specific edges on the lineage path. Infrastructure (`traceColumnUpstream` / `traceColumnDownstream`) is ready.

**GroupByNode aggregation type override**
Manual type selector next to output name for cases where `inferAggType` inference is wrong.

**Trace from non-DataFrame nodes**
Currently `◎` trace button is only on DataFrameNode columns. Could add it to FunctionNode outputs, GroupByNode agg outputs, etc. — just call `onTraceColumn(nodeId, colName)` with the operator's nodeId.
