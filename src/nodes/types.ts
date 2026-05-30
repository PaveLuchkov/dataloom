// The NodeSpec contract — the single unit of change for the editor.
//
// Today a node type's knowledge is smeared across three layers: the triple
// switch(node.type) in utils/nodeOutputAttrs.js, the per-type hooks + coupled
// effects in hooks/useLineageState.js, and the bespoke markup in
// nodes/<type>/index.jsx. A NodeSpec collapses all of that into one module per
// type, consumed by a generic engine. Adding or changing a node = editing one
// spec; the registry just lists them.
//
// The lineage methods (outputs / traceUpstream / propagateDownstream) mirror the
// three cases in utils/nodeOutputAttrs.js exactly, so specs can be filled in by
// lifting each existing case verbatim — the characterization suite in
// utils/nodeOutputAttrs.test.js guards the move.

import type { ComponentType } from 'react';
import type { Node, Edge } from 'reactflow';
import type { ThemeKey } from '../theme';

export type AttrType = 'string' | 'int' | 'float' | 'date' | 'bool';

/** A DataFrame column. `broken` is a transient render-only flag (source lost). */
export interface Attr {
  id: string;
  name: string;
  type: AttrType;
  broken?: boolean;
}

/** A GroupBy/Function input row: a column dragged in from an upstream node. */
export interface NodeInput {
  id: string;
  attrName: string;
  attrType: AttrType;
  sourceNodeId: string;
  sourceNodeLabel?: string;
  sourceAttrId?: string;
  broken?: boolean;
}

/** One link in an upstream lineage chain (see traceColumnUpstream). */
export interface TraceStep {
  nodeId: string;
  colName: string;
  nodeType: string;
  nodeLabel: string;
  upstream: TraceStep | null;
  /** column originates at this node (Function own-output / Transform add_column) */
  createdHere?: boolean;
  /** GroupBy aggregation extras */
  aggFunc?: string;
  inputColName?: string;
}

/** A forward (downstream) lineage branch (see traceColumnDownstream). */
export interface DownstreamBranch {
  nodeId: string;
  colName: string;
  nodeType: string;
  nodeLabel: string;
  downstream: DownstreamBranch[];
}

/** A validation/lint problem surfaced for a node (Phase 7). */
export interface Issue {
  nodeId: string;
  severity: 'error' | 'warning';
  message: string;
}

export type RFNode<D = any> = Node<D>;

/** Context handed to a spec's useCallbacks hook (mirrors useLineageState wiring). */
export interface CallbackCtx {
  setNodes: (updater: (nodes: RFNode[]) => RFNode[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  pushHistory: () => void;
}

/** Declarative connection rules; the generic isValidConnection reads these. */
export interface ConnectRules {
  /** accept column-level lineage edges (`*-source` → `*-target`) */
  acceptsColumns?: boolean;
  /** node-level handle pairs, e.g. [['df-out', 'left-in']] */
  dfLevel?: [src: string, tgt: string][];
}

/** Header chrome the shared NodeHeader renders. */
export interface HeaderSpec {
  icon?: string;
  editableLabel?: boolean;
  code?: boolean;
  companion?: boolean;
}

export interface NodeSpec<D = any> {
  /** ReactFlow node type key, e.g. 'dataFrameNode' */
  type: string;
  theme: ThemeKey;
  minimapColor: string;
  dagre: { width: number; height: (node: RFNode<D>) => number };

  /** factory for a fresh node at (x, y) */
  make: (x: number, y: number, overrides?: Partial<D>) => RFNode<D>;
  /** deep-clone data with fresh internal ids (replaces cloneNodeData switch) */
  clone?: (data: D) => D;
  /** operator types that auto-spawn a result DataFrame (replaces COMPANION_TYPES) */
  companion?: boolean;

  connect: ConnectRules;
  /** context-menu entry; omit to exclude from the add menu (e.g. mergeNode) */
  menu?: { label: string; icon?: string; btnClass?: string };
  header?: HeaderSpec;

  // ── Lineage engine (the three switch-cases, now per-spec) ─────────────────
  outputs: (node: RFNode<D>, edges: Edge[], nodes: RFNode[]) => Attr[];
  traceUpstream: (node: RFNode<D>, colName: string, edges: Edge[], nodes: RFNode[]) => TraceStep | null;
  /** returns the (possibly renamed) column name as it exits this node, or null */
  propagateDownstream: (node: RFNode<D>, colName: string, edges: Edge[], nodes: RFNode[]) => string | null;

  /** per-type frame callbacks injected onto node.data */
  useCallbacks: (ctx: CallbackCtx) => Record<string, (...args: any[]) => void>;
  /** React component rendering the node body (built on shared primitives) */
  component: ComponentType<{ id: string; data: D }>;

  // ── Optional data-science hooks (Phase 7) ─────────────────────────────────
  toPandas?: (node: RFNode<D>, ctx: { inputVar?: string }) => string;
  validate?: (node: RFNode<D>, edges: Edge[], nodes: RFNode[]) => Issue[];
}
