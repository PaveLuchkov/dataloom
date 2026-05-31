// Best-effort pandas codegen. Like the lineage engine, this is spec-driven: each
// node type implements spec.toPandas(node, ctx) and this walker topologically
// orders the graph (over df-out edges), assigns a variable name per node, and
// stitches the snippets into a runnable-ish script. Because the canvas models
// column lineage (not full execution), the output is a faithful scaffold the
// analyst fills in — a node's own `code` field, when set, overrides its snippet.

import { getSpec } from '../nodes/specs';

function sanitizeIdent(label, fallback = 'df') {
  let s = (label || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `_${s}`;
  return s;
}

// Assign a unique python identifier to each non-companion node; companion result
// DFs alias their operator's variable (they denote the same DataFrame).
function buildVarMap(nodes) {
  const varOf = new Map();
  const used = new Map();
  const assign = (node) => {
    let base = sanitizeIdent(node.data?.label);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    varOf.set(node.id, n === 0 ? base : `${base}_${n}`);
  };
  for (const node of nodes) {
    if (node.type === 'commentNode') continue;
    if (node.data?._companionOf) continue; // aliased below
    assign(node);
  }
  for (const node of nodes) {
    if (node.data?._companionOf && varOf.has(node.data._companionOf)) {
      varOf.set(node.id, varOf.get(node.data._companionOf));
    }
  }
  return varOf;
}

// Topological order over dataflow edges (any df-out source handle). Falls back to
// input order for nodes in a cycle so codegen still terminates.
function topoOrder(nodes, edges) {
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (e.sourceHandle !== 'df-out') continue;
    if (!adj.has(e.source) || !indeg.has(e.target)) continue;
    adj.get(e.source).push(e.target);
    indeg.set(e.target, indeg.get(e.target) + 1);
  }
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const order = [];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const t of adj.get(id) || []) {
      indeg.set(t, indeg.get(t) - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }
  // Any nodes left (cycles) — append in original order so nothing is dropped.
  for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);
  return order;
}

export function generatePandas(nodes, edges) {
  const varOf = buildVarMap(nodes);
  const order = topoOrder(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const ctx = {
    varOf: (id) => varOf.get(id),
    nodes,
    edges,
    // Variable names of nodes wired into `handle` of `node`, in edge order.
    upstreamVars: (node, handle = 'df-in') =>
      edges
        .filter((e) => e.target === node.id && e.targetHandle === handle)
        .map((e) => varOf.get(e.source))
        .filter(Boolean),
  };

  const blocks = [];
  for (const id of order) {
    const node = byId.get(id);
    if (!node) continue;
    const spec = getSpec(node.type);
    if (!spec) continue;

    // A companion result DF is just the operator's output under another name.
    if (node.data?._companionOf) continue;

    let snippet;
    if (node.data?.code && node.data.code.trim()) {
      snippet = `# ${varOf.get(id) || node.data.label}\n${node.data.code.trim()}`;
    } else if (spec.toPandas) {
      snippet = spec.toPandas(node, { ...ctx, var: varOf.get(id) });
    }
    if (snippet && snippet.trim()) blocks.push(snippet.trim());
  }

  const body = blocks.length ? blocks.join('\n\n') : '# (empty canvas)';
  return `import pandas as pd\n\n${body}\n`;
}
