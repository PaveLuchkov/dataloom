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
8118272  Add copy/paste nodes (Ctrl+C / Ctrl+D)
0a56e88  Restructure node registry + add Filter, GroupBy, Comment nodes
533b86f  Update handoff.md: document undo/redo, column types, auto-layout, search
158eece  Add Cmd+K search modal
23e1947  Add dagre auto-layout (⬦ Auto-arrange button)
15bc8fc  Add column data types with colored badges
a3994ba  Add undo/redo history stack (Ctrl+Z / Ctrl+Y)
0a2cf8a  Add test suite: 22 tests across App, EditableText, ContextMenu, useLineagePersistence
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
│   │   ├── config.js             ← colors, dagreWidth/Height, make(), menu, connections
│   │   └── callbacks.js          ← useDataFrameCallbacks(setNodes, setEdges, pushHistory)
│   ├── merge/
│   │   ├── index.jsx             ← MergeNode component
│   │   ├── config.js
│   │   └── callbacks.js          ← useMergeCallbacks(setNodes, pushHistory)
│   ├── function/
│   │   ├── index.jsx             ← FunctionNode component
│   │   ├── config.js
│   │   └── callbacks.js          ← useFunctionCallbacks(setNodes, setEdges, pushHistory)
│   ├── filter/
│   │   ├── index.jsx             ← FilterNode component
│   │   ├── config.js             ← amber/orange colors; connections: df-out↔filter-in, filter-out↔df-in
│   │   └── callbacks.js          ← useFilterCallbacks(setNodes, pushHistory)
│   ├── groupby/
│   │   ├── index.jsx             ← GroupByNode component
│   │   ├── config.js             ← sky/cyan colors; connections: [] (column-level handles only)
│   │   └── callbacks.js          ← useGroupByCallbacks(setNodes, setEdges, pushHistory)
│   └── comment/
│       ├── index.jsx             ← CommentNode component
│       ├── config.js             ← NOTE_PALETTE (5 sticky-note colors); no connections
│       └── callbacks.js          ← useCommentCallbacks(setNodes, pushHistory)
├── utils/
│   └── uid.js                    ← shared ID counter (Date.now() seed)
├── components/
│   ├── ContextMenu.jsx           ← reads ADDABLE_NODES from registry; node label from getNodeDisplayName
│   ├── DragContext.jsx           ← React Context with useRef for drag state (no re-renders)
│   ├── EditableText.jsx          ← shared inline-edit component (double-click to edit)
│   ├── NodeErrorBoundary.jsx     ← class component; isolates node render crashes
│   └── SearchModal.jsx           ← Cmd+K search overlay
├── hooks/
│   ├── useAutoLayout.js          ← dagre LR layout; sizes come from registry
│   ├── useContextMenu.js         ← menu state + onPaneContextMenu / onNodeContextMenu
│   ├── useLineagePersistence.js  ← save / load localStorage, export PNG
│   └── useLineageState.js        ← state + history; composes per-type callback hooks;
│                                    addNodeOfType(type, x, y) uses registry config.make();
│                                    clipboard/pasteCount refs for copy-paste
├── constants.js                  ← DRAG_TYPE, STORAGE_KEY, JOIN_TYPES, JOIN_ACTIVE_STYLES,
│                                    ATTR_TYPES, ATTR_TYPE_META  (no per-node colors/sizes)
├── App.jsx                       ← UI shell: imports nodeTypes/isValidConnection/getMinimapColor
│                                    from registry; passes addableNodes to Toolbar + ContextMenu
└── Toolbar.jsx                   ← add-node buttons rendered from ADDABLE_NODES
```

---

## Feature Inventory

### DataFrameNode
- Double-click title or any column name → inline edit (Enter/Escape)
- `+` button in header → add column
- Hover column → `×` appears → delete column (also removes connected edges)
- Hover column → grip icon `⠿` → **drag within same node** to reorder
  - Blue insert-line indicator shows drop position
- **Drag column onto a different DataFrame** → column is copied there + lineage edge created automatically; type is preserved
- Per-column handles: left dot (target) + right dot (source) for manual edge drawing
- Two teal square handles at top corners:
  - `df-in` (top-left) — receives connection from MergeNode output
  - `df-out` (top-right) — sends connection to MergeNode / FilterNode / GroupByNode input
- **Type badge** (`str`/`int`/`flt`/`dat`/`bool`) before each column name — click to cycle type; colored per type

### FunctionNode
- Drop columns from any node onto the Inputs panel → creates input entry + edge
- Add/delete/rename output columns
- Outputs are draggable → can link to other nodes
- Inputs grouped by source node label

### MergeNode
- Created by: select exactly 2 DataFrames → toolbar **⋈ Merge** button (or right-click canvas)
- Auto-wires: left DF → L input, right DF → R input, out → new `result_df`
- Join type toggle: `inner` / `left` / `right` / `outer` (color-coded)
- Key pairs editor: add/remove `left_col = right_col` pairs with dropdowns
- Auto-shows output columns from both connected DFs (draggable to link downstream)

### FilterNode (amber/orange)
- DF-level handles: `filter-in` (left) ← from `df-out`; `filter-out` (right) → to `df-in`
- Header: editable label
- Body: single WHERE condition text field (debounced, monospace)
- Edge color from `filter-out`: orange (`#f97316`)

### GroupByNode (sky/cyan)
- **Column-level handles** — no DF-level connection; works like FunctionNode
- **Left panel (Inputs)**: drop zone; drag columns from any node → creates input entry + cyan edge
  - Inputs grouped by source node label
  - Toggle button `⊞` / `○` per input to mark it as a group-by key
  - `×` to delete input (also removes from keys and any aggregations referencing it)
- **Right panel (Outputs)**:
  - *Group by* section: inputs marked as keys appear here, each with a draggable source handle
  - *Aggregations* section: rows of (column dropdown, function, output name), each with source handle
  - Agg functions: `sum` / `mean` / `count` / `min` / `max` / `first` / `last`
- `cloneNodeData` in `useLineageState` remaps inputs + groupByInputIds + aggregation.inputId on paste

### CommentNode (sticky note)
- No handles — pure canvas decoration
- Color picker bar: 5 palette options (yellow / pink / green / blue / purple)
- Body: `<textarea>` with debounced `onCommentTextChange`
- Background IS the note color (light pastels on dark canvas)
- No callbacks for history on text change (avoids spamming history while typing)

### Canvas
- Pan + zoom (React Flow built-in)
- Drag nodes from header area
- Right-click canvas → per-registry add menu + "⋈ Merge selected DFs" (when 2 DFs selected)
- Right-click node → "Delete …"
- Select nodes + Delete key → removes nodes and their edges
- Click edge + Delete → removes edge
- `isValidConnection` is assembled from registry: column `-source → -target` (global rule) + per-node `connections` arrays

### Copy / Paste
- `Ctrl+C` / `Cmd+C` — copies all selected nodes into a `clipboard` ref; resets paste counter
- `Ctrl+D` / `Cmd+D` — pastes clipboard with offset `+40px × pasteCount`; pasted nodes become selected, originals deselect
- Internal IDs remapped on paste via `cloneNodeData()` so handles don't collide:
  - DataFrameNode → attribute IDs
  - FunctionNode → input + output IDs
  - GroupByNode → input IDs, groupByInputIds, aggregation IDs + inputId refs

### Undo / Redo
- `Ctrl+Z` / `Cmd+Z` — undo last mutation
- `Ctrl+Y` / `Ctrl+Shift+Z` — redo
- Also exposed as ↩ / ↪ toolbar buttons
- History stack lives in `useLineageState` (max 50 snapshots, refs-based — no re-renders)
- Every mutation pushes a snapshot beforehand
- Load / restoreState clears both stacks

### Auto-layout
- **⬦ Auto-arrange** toolbar button — runs dagre LR layout, then `fitView`
- `useAutoLayout.js` pulls node sizes from `getDagreWidth` / `getDagreHeight` in registry
- Result goes through `restoreState`, so it is itself undoable

### Search (`Cmd+K`)
- `Cmd+K` / `Ctrl+K` opens a search modal
- Searches node labels and column names (DataFrameNode attributes, FunctionNode inputs/outputs)
- Results show type icon, node name; column matches show `node › column` with type badge
- Click result (or Enter on selected item) → `fitView` to that node with animation
- Arrow keys navigate results, Escape closes

### Persistence
- Save / Load buttons → `localStorage` key `lineage-editor-state`
- Saves full `{ nodes, edges }` — all positions, types, data, edges
- First load with no saved state → demo graph: `raw_orders`, `raw_customers`, `orders_enriched`

### Export
- Export PNG → `html-to-image` renders React Flow viewport, downloads `lineage.png`

---

## Architecture Notes

### Node Registry pattern
Each node type lives in `src/nodes/<type>/` with three files:

| File | Purpose |
|---|---|
| `index.jsx` | React component |
| `config.js` | Static config: `type`, `colors`, `minimapColor`, `dagreWidth`, `dagreHeight(node)`, `make(x, y, dataOverrides?)`, `menu?`, `connections` |
| `callbacks.js` | `use<Type>Callbacks(setNodes, setEdges?, pushHistory)` hook |

`src/nodes/registry.js` assembles everything:
- `nodeTypes` — ReactFlow map (each component wrapped in `NodeErrorBoundary`)
- `isValidConnection` — column-level pattern + explicit rules from `config.connections`
- `getMinimapColor(node)` — reads `config.minimapColor`
- `getDagreWidth(type)` / `getDagreHeight(node)` — reads `config.dagreWidth/Height`
- `ADDABLE_NODES` — configs that have a `menu` field (mergeNode has none)
- `getNodeDisplayName(type)` — reads `config.menu.label`

### Adding a new node type (the full recipe)
1. Create `src/nodes/<type>/config.js` — define colors, `make()`, `menu`, `connections`
2. Create `src/nodes/<type>/callbacks.js` — export `use<Type>Callbacks` hook
3. Create `src/nodes/<type>/index.jsx` — the React component
4. Add **one line** to `registry.js`: `{ config: myConfig, component: MyNode }`
5. Import and compose the callbacks hook in `useLineageState.js`

`nodeTypes`, `isValidConnection`, `ADDABLE_NODES`, `getDagre*`, `getMinimapColor` all update automatically from step 4.

### Callback pattern
All node mutation callbacks are split into per-type hooks and composed in `useLineageState`:

```js
const dfCbs = useDataFrameCallbacks(setNodes, setEdges, pushHistory);
const mgCbs = useMergeCallbacks(setNodes, pushHistory);
const fnCbs = useFunctionCallbacks(setNodes, setEdges, pushHistory);
const ftCbs = useFilterCallbacks(setNodes, pushHistory);
const gbCbs = useGroupByCallbacks(setNodes, setEdges, pushHistory);
const cmCbs = useCommentCallbacks(setNodes, pushHistory);
callbacks.current = { ...dfCbs, ...mgCbs, ...fnCbs, ...ftCbs, ...gbCbs, ...cmCbs };
```

Injected into every node's `data` via `attachCallbacks()` + a `callbacks.current` ref
(avoids stale closures without recreating node objects on every render).

`onLabelChange` from `useDataFrameCallbacks` is reused by all node types that need label editing
(FunctionNode, FilterNode, GroupByNode) — they all do the same `data.label` update.

### Undo/Redo pattern
`history` and `future` are plain refs (not state) holding `{ nodes, edges }` snapshots.
`nodesRef`/`edgesRef` mirror current state synchronously so snapshots can be taken
before functional `setNodes`/`setEdges` updates are applied.

### Copy/Paste pattern
`clipboard` ref stores an array of node objects at copy time.
`pasteCount` ref tracks how many times the current clipboard has been pasted (for offset accumulation).
`cloneNodeData(type, data)` — module-level helper in `useLineageState.js` — remaps internal IDs per node type so pasted nodes don't share handle IDs with originals.

### Drag system
All drag flows share the HTML5 `draggable` API + `DragContext` ref:

| Drag type | Source | Destination | Effect |
|---|---|---|---|
| Reorder | attribute row | same DataFrame | reorder via `onReorderAttributes` |
| Lineage | attribute row | different DataFrame | copy column + edge |
| Function input | attribute row | FunctionNode input panel | add input entry + edge |
| GroupBy input | attribute row | GroupByNode input panel | add input entry + cyan edge |
| Merge output | MergeNode output row | any node | lineage edge |
| GroupBy output | group-by key or agg row | any node | lineage edge |

`DragContext` read happens synchronously in event handlers — no re-renders triggered.

### `isValidConnection` rules
```
Column lineage:   *-source   →  *-target        (global, all nodes)
DF → Merge:       df-out     →  left-in / right-in
Merge → DF:       out        →  df-in
DF → Filter:      df-out     →  filter-in
Filter → DF:      filter-out →  df-in
```
GroupByNode uses only column-level handles (no DF-level rules).
CommentNode has no handles.

### Operator edge colors
| Source handle | Color |
|---|---|
| `df-out` | purple `#7c3aed` |
| `out` (Merge) | purple `#7c3aed` |
| `filter-out` | orange `#f97316` |
| GroupBy edges | cyan `#0ea5e9` (set at drop time in `onGroupByInputDrop`) |
| column lineage | default (React Flow gray) |

---

## What Failed / Dead Ends

### Tailwind v4 install
`npm install -D tailwindcss postcss autoprefixer` pulled Tailwind v4 which has
no `tailwindcss` CLI binary — `npx tailwindcss init -p` silently failed. Fixed by pinning `tailwindcss@3`.

### `App.js` shadowing `App.jsx`
CRA scaffolded `App.js`. After creating `App.jsx`, the old file took priority.
Fixed by deleting `App.js`, `App.css`, and `logo.svg`.

### Port conflict
`npm start` hits port 3000 which was already occupied. Must use `PORT=3001 npm start`.

### Attribute drag conflicting with node drag
First attempt used only `e.stopPropagation()` on `dragstart`. React Flow still
captured the mousedown and moved the node. Fix: `onMouseDown: e.stopPropagation()`
on every draggable attribute row.

### `dataTransfer.getData` blocked during dragover
Tried to read payload during `onDragOver` to decide reorder vs. lineage.
Browser blocks `.getData()` during drag (only available on `drop`).
Fixed with the `DragContext` ref set at `dragstart`.

---

## Next Things To Build

### Medium priority

**Export to SQL**
Walk nodes/edges, generate:
```sql
SELECT l.order_id, r.name
FROM raw_orders l
INNER JOIN raw_customers r ON l.customer_id = r.customer_id
```
Start with MergeNode → `JOIN`, DataFrameNode → `FROM`.
Lives in `useLineagePersistence`, copy to clipboard or download `.sql`.

### Lower priority

**Import from schema**
Upload JSON or CSV → auto-create DataFrameNode(s) with columns pre-filled.

**Validation layer**
Highlight problems: MergeNode with no key pairs, disconnected inputs, circular paths.

**Multiple canvases / tabs**
Each tab saves to its own `localStorage` key.

**Edge label tooltips**
Show source column name on hover — use `<EdgeLabelRenderer>` overlay.
