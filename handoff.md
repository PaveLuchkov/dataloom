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
3cd47a2  track whole word and highlight it
61ea86f  Вопрос для шорткатов
1ac30b6  Шорткаты + тулбар обновленный
a12f6a2  screenshot fix
0ecee5b  Возможность писать атрибуты в ноде условия через @
1c430e3  стадии (canvas tabs)
4ff0c6b  Больше зум
1783bdb  расширяющееся окно для ноды условия
e8b76db  Add multi-condition WHERE builder to FilterNode
c6370fc  Drag And drop самих фреймов на всем уровне
93f72ba  SQL Export + drag f
84b2c0f  Add SQL SELECT parser and import modal
8118272  Add copy/paste nodes (Ctrl+C / Ctrl+D)
0a56e88  Restructure node registry + add Filter, GroupBy, Comment nodes
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
│   │   ├── config.js             ← amber/orange colors; connections: [] (universal rule)
│   │   └── callbacks.js          ← useFilterCallbacks(setNodes, pushHistory)
│   ├── groupby/
│   │   ├── index.jsx             ← GroupByNode component
│   │   ├── config.js             ← sky/cyan colors; connections: [] (universal rule)
│   │   └── callbacks.js          ← useGroupByCallbacks(setNodes, setEdges, pushHistory)
│   └── comment/
│       ├── index.jsx             ← CommentNode component
│       ├── config.js             ← NOTE_PALETTE (5 sticky-note colors); no connections
│       └── callbacks.js          ← useCommentCallbacks(setNodes, pushHistory)
├── utils/
│   └── uid.js                    ← shared ID counter (Date.now() seed)
├── components/
│   ├── AttributeTrackerPanel.jsx ← Track overlay (Ctrl+Shift+F): input + suggestions dropdown
│   ├── ContextMenu.jsx           ← reads ADDABLE_NODES from registry; node label from getNodeDisplayName
│   ├── DragContext.jsx           ← React Context with useRef for drag state (no re-renders)
│   ├── EditableText.jsx          ← shared inline-edit component (double-click to edit)
│   ├── HighlightedConditionInput.jsx ← textarea with @column syntax highlighting + autocomplete
│   ├── NodeErrorBoundary.jsx     ← class component; isolates node render crashes
│   ├── SearchModal.jsx           ← Cmd+K search overlay
│   ├── ShortcutsModal.jsx        ← ? keyboard shortcuts reference overlay
│   ├── SqlExportModal.jsx        ← modal showing generated SQL with copy button
│   ├── SqlImportModal.jsx        ← modal to paste SQL SELECT → auto-create DataFrameNode
│   └── TabBar.jsx                ← canvas tabs bar (add, rename, close, switch)
├── hooks/
│   ├── useAutoLayout.js          ← dagre LR layout; sizes come from registry
│   ├── useCanvasTabs.js          ← multi-canvas tab state; each tab saved to its own localStorage key
│   ├── useContextMenu.js         ← menu state + onPaneContextMenu / onNodeContextMenu
│   ├── useLineagePersistence.js  ← save / load localStorage, export PNG
│   └── useLineageState.js        ← state + history; composes per-type callback hooks;
│                                    addNodeOfType(type, x, y) uses registry config.make();
│                                    clipboard/pasteCount refs for copy-paste;
│                                    connectedDFs derived from edges for FunctionNode;
│                                    result-DF column sync via useEffect
├── constants.js                  ← DRAG_TYPE, STORAGE_KEY, TABS_KEY, ACTIVE_TAB_KEY, canvasKey(),
│                                    JOIN_TYPES, JOIN_ACTIVE_STYLES,
│                                    ATTR_TYPES, ATTR_TYPE_META  (no per-node colors/sizes)
├── App.jsx                       ← UI shell: imports nodeTypes/isValidConnection/getMinimapColor
│                                    from registry; passes addableNodes to Toolbar + ContextMenu;
│                                    owns tracker state (trackerQuery, trackerWholeWord);
│                                    injects trackerHighlight into node.data via trackedNodes memo
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
  - `df-in` (top-left) — receives any `df-out` connection
  - `df-out` (top-right) — sends to any node's `df-in`, or to `left-in`/`right-in` on MergeNode
- **Type badge** (`str`/`int`/`flt`/`dat`/`bool`) before each column name — click to cycle type; colored per type

### FunctionNode
- Drop columns from any node onto the Inputs panel → creates input entry + edge
- **Drag `df-out` handle from any node → `df-in` on FunctionNode** → adds the whole DataFrame as a named input group with no columns; additional column drops from that same DF appear within the group
- `connectedDFs` is derived live from edges (not stored in node data): any node whose `df-out → df-in` edge targets this function shows up as a group header even if no individual columns are dropped
- Add/delete/rename output columns
- Outputs are draggable → can link to other nodes
- Two square handles at top corners:
  - `df-in` (top-left) — receives DF-level connections
  - `df-out` (top-right) — sends DF-level output downstream

### MergeNode
- Created by: select exactly 2 nodes (any mix of DataFrameNode / MergeNode) → toolbar **⋈ Merge** button (or right-click canvas)
- Auto-wires: left node `df-out → left-in`, right node `df-out → right-in`; **no result_df is auto-created** — user manually connects `df-out` to wherever the output goes
- Join type toggle: `inner` / `left` / `right` / `outer` (color-coded)
- Key pairs editor: add/remove `left_col = right_col` pairs with dropdowns
- Auto-shows output columns from both connected DFs (draggable to link downstream)
- **Chained merges**: selecting a MergeNode + another node as sources works the same way
- Square handle: `df-out` (top-right) — purple, source for downstream connections

### FilterNode (amber/orange)
- Square handles at top corners: `df-in` (left) ← from any `df-out`; `df-out` (right) → to any `df-in`
- Header: editable label
- **Multi-condition WHERE builder**:
  - First row is always `where` (non-clickable badge)
  - `+ and` / `+ or` buttons add new condition rows
  - Each added row has a clickable `and`/`or` badge — click to toggle between AND and OR
  - `×` removes a row (available when more than one condition exists)
  - Each expression field is a **`HighlightedConditionInput`** — auto-resizing textarea with:
    - `@column_name` syntax: highlights `@mentions` with amber backdrop as you type
    - Dropdown autocomplete triggered by `@`: suggests column names from upstream connected DFs
    - Inputs debounced 400 ms before saving
- **Backward compat**: old saves with a single `condition` string are read as one WHERE row

### GroupByNode (sky/cyan)
- Square handles at top corners: `df-in` (top-left), `df-out` (top-right) — universal DF-level connections
- **Left panel (Inputs)**: drop zone; drag columns from any node → creates input entry + cyan edge
  - Inputs grouped by source node label
  - Toggle button `⊞` / `○` per input to mark it as a group-by key
  - `×` to delete input (also removes from keys and any aggregations referencing it)
- **Right panel (Outputs)**:
  - *Group by* section: inputs marked as keys appear here, each with a draggable source handle
  - *Aggregations* section: rows of (column dropdown, function, output name), each with source handle
  - Agg functions: `sum` / `nunique` / `mean` / `count` / `min` / `max` / `first` / `last`
- `cloneNodeData` in `useLineageState` remaps inputs + groupByInputIds + aggregation.inputId on paste

### CommentNode (sticky note)
- No handles — pure canvas decoration
- Color picker bar: 5 palette options (yellow / pink / green / blue / purple)
- Body: `<textarea>` with debounced `onCommentTextChange`
- Background IS the note color (light pastels on dark canvas)
- No callbacks for history on text change (avoids spamming history while typing)

### Result-DF column sync
Any `dataFrameNode` connected to a `mergeNode`'s `df-out` handle has its attributes **automatically driven** by the merge output:
- Implemented as a `useEffect` in `useLineageState` watching `nodes` + `edges`
- Columns = `leftDF.attributes + rightDF.attributes`, deduplicated by name (left takes priority)
- Chained merges resolve across 2 render cycles: first render updates result_df1, second render sees updated attrs and updates result_df2
- Comparison via `JSON.stringify` prevents infinite re-render loop
- The result DF's manual edits to columns are overwritten — it is treated as schema-derived

### Canvas Tabs (Stages)
- **Tab bar** at the bottom of the screen — add, rename (double-click), close tabs
- Each tab is an independent canvas with its own nodes/edges stored under `canvasKey(tabId)` in localStorage
- First load migrates the old single-canvas `STORAGE_KEY` data into tab 1 automatically
- `useCanvasTabs` hook manages tab list (`TABS_KEY`) and active tab (`ACTIVE_TAB_KEY`) in localStorage
- Switching tabs unmounts current ReactFlow and mounts the new one (full state swap via `key` prop)

### Canvas
- Pan + zoom (React Flow built-in); `minZoom: 0.05` / `maxZoom: 2`
- Drag nodes from header area
- Right-click canvas → per-registry add menu + "⋈ Merge selected" (when 2 nodes selected)
- Right-click node → "Delete …"
- Select nodes + Delete key → removes nodes and their edges
- Click edge + Delete → removes edge
- `isValidConnection` assembled from registry: column `-source → -target` (global) + `df-out → df-in` (universal DF-level) + per-node `connections` arrays

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
- **`W=` toggle** — exact match mode: only returns results where the full name equals the query (no partial matches like `column_1` when searching `column`)

### Attribute Tracker (`Ctrl+Shift+F`)
- Floating panel below toolbar — amber theme
- Type a column name → all nodes containing that attribute glow amber (`box-shadow`); unmatched nodes fade to 12% opacity; unmatched edges fade to 6%
- **Suggestions dropdown**: shows up to 12 matching attribute names from all nodes, sorted by frequency; arrow keys + Enter to select; click to commit
- **Match count badge**: shows how many nodes contain the attribute
- **`W=` toggle** — exact match mode (same as Search)
- **Attribute-level highlight in nodes**: matched attribute rows inside each node get amber background + bold amber text — works in DataFrameNode columns, FunctionNode inputs and outputs
- `trackerHighlight: { query, wholeWord }` is injected into `node.data` via the `trackedNodes` memo in App.jsx; nodes read it directly
- Closing the panel resets query, wholeWord, and all highlight styles

### SQL Export
- Toolbar button → generates SQL and opens `SqlExportModal` with syntax-highlighted output + copy button
- Walks nodes/edges to produce `SELECT … FROM … JOIN … WHERE … GROUP BY` chains
- Covers MergeNode → `JOIN`, FilterNode → `WHERE`, GroupByNode → `GROUP BY`

### SQL Import
- Toolbar button → opens `SqlImportModal`; paste a `SELECT` statement → parses column names and table name → auto-creates a DataFrameNode with columns pre-filled

### Keyboard Shortcuts Reference
- `?` key → opens `ShortcutsModal` overlay listing all keyboard shortcuts
- Also accessible via `?` icon button in toolbar

### Persistence
- Save / Load buttons → `localStorage` per-tab key via `canvasKey(tabId)`
- Saves full `{ nodes, edges }` — all positions, types, data, edges
- First load with no saved state → demo graph: `raw_orders`, `raw_customers`, `orders_enriched`

### Export
- Export PNG → `html-to-image` renders React Flow viewport, downloads `lineage.png`
- `pixelRatio: 3` — output is 3× the canvas pixel dimensions for sharp text and lines

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
- `isValidConnection` — column-level pattern + `df-out → df-in` universal rule + explicit rules from `config.connections`
- `getMinimapColor(node)` — reads `config.minimapColor`
- `getDagreWidth(type)` / `getDagreHeight(node)` — reads `config.dagreWidth/Height`
- `ADDABLE_NODES` — configs that have a `menu` field (mergeNode has none)
- `getNodeDisplayName(type)` — reads `config.menu.label`

### Standard DF-level handles
Every non-Comment node has two square handles at the header row:

| Handle | Type | Position | Purpose |
|---|---|---|---|
| `df-in` | target | top-left | Receives any `df-out` connection |
| `df-out` | source | top-right | Sends to any `df-in`, or to `left-in`/`right-in` |

Additionally MergeNode has `left-in` (30% from top) and `right-in` (70% from top) as specific inputs for the L/R DataFrames.

`isValidConnection` rules:
```
Column lineage:   *-source  →  *-target       (global, all nodes)
Universal DF:     df-out    →  df-in          (global, all node pairs)
DF → Merge L:     df-out    →  left-in
DF → Merge R:     df-out    →  right-in
```

All edges from `df-out` are purple `#7c3aed`. Column lineage edges use React Flow default gray. GroupBy column input edges are cyan `#0ea5e9` (set at drop time).

### Adding a new node type (the full recipe)
1. Create `src/nodes/<type>/config.js` — define colors, `make()`, `menu`, `connections`
2. Create `src/nodes/<type>/callbacks.js` — export `use<Type>Callbacks` hook
3. Create `src/nodes/<type>/index.jsx` — the React component; add `df-in`/`df-out` Handles at `top: 14` if the node participates in DF-level flow
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

### Attribute Tracker highlight injection
The tracker doesn't use React Context or a separate state system. Instead, `App.jsx` has a `trackedNodes` memo that:
1. Applies opacity / box-shadow styles to matched/unmatched nodes
2. Injects `data.trackerHighlight = { query, wholeWord }` into matched node data (null for unmatched / when tracker is closed)

Node components (DataFrameNode, FunctionNode) read `data.trackerHighlight` directly and apply bold + amber styling to matching attribute rows. This keeps highlight logic co-located with rendering without adding global state.

### FunctionNode `connectedDFs` derivation
FunctionNode does not store which DFs are connected in its `data`. Instead, `nodesWithCallbacks`
in `useLineageState` computes `connectedDFs` live from edges:

```js
// For each functionNode:
const connectedDFs = edges
  .filter((e) => e.target === n.id && e.targetHandle === 'df-in')
  .map((e) => { const src = nodes.find(nd => nd.id === e.source); return src ? { sourceNodeId, sourceNodeLabel } : null; })
  .filter(Boolean);
```

This means deleting the `df-out → df-in` edge automatically removes the group from the Inputs panel
without any extra callback. Individual column inputs (from column drags) are still stored in `data.inputs`
and grouped under the same `sourceNodeId` key.

### Canvas Tabs storage layout
```
localStorage keys:
  lineage-tabs          → JSON array of { id, name }
  lineage-active-tab    → active tab id string
  lineage-canvas-{id}   → { nodes, edges } for each tab
  lineage-editor-state  → legacy single-canvas key (migrated to tab 1 on first load)
```

`useCanvasTabs` handles load/save/switch. App.jsx uses the active tab's canvas key for all
persistence operations. The ReactFlow instance is re-keyed on tab switch (`key={activeTabId}`)
to fully unmount/remount, which avoids stale internal ReactFlow state.

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

DF-level connections (e.g. DataFrame → FunctionNode, MergeNode → FilterNode) use React Flow's
native handle drag, not the HTML5 DragContext system.

`DragContext` read happens synchronously in event handlers — no re-renders triggered.

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

### HTML5 drag on node header for DF-level drop
Attempted to make the DataFrameNode header `draggable` with a separate `DRAG_TYPE_DF` so the
whole frame could be dropped onto FunctionNode. Two problems: (1) React Flow 11 uses `pointerdown`
not `mousedown`, so `stopPropagation` on mousedown didn't block node movement; (2) `nodrag` class
prevents RF dragging but confusingly disables the header as a node-move handle.
**Resolution**: abandoned HTML5 approach entirely; instead added a `df-in` React Flow Handle to
FunctionNode so the standard handle-drag mechanism is used — consistent with all other DF connections.

---

## Next Things To Build

### Lower priority

**Validation layer**
Highlight problems: MergeNode with no key pairs, disconnected inputs, circular paths.

**Edge label tooltips**
Show source column name on hover — use `<EdgeLabelRenderer>` overlay.

**FilterNode condition autocomplete**
Currently `@column` autocomplete only suggests columns from nodes connected via `df-in`.
Could extend to also suggest from nodes connected anywhere upstream in the lineage chain.
