// Single source of truth: "what columns does a node output?"
// Used by useLineageState to inject connectedAttrs, leftDF/rightDF,
// and to drive the result-DF auto-sync.
//
// Migration note: each function first asks the lineage registry whether the
// node type has a migrated spec; if so it delegates. Otherwise it falls through
// to the switch below. The recursion (getUpstreamAttrs, traceColumnUpstream,
// _propagateCol) re-enters these dispatchers, so spec and switch types interop.

import { getLineage } from '../nodes/lineageRegistry';

export function inferAggType(func, inputType) {
  if (func === 'count' || func === 'nunique') return 'int';
  if (func === 'mean') return 'float';
  if (func === 'sum') return (inputType === 'int' || inputType === 'float') ? inputType : 'float';
  // min, max, first, last — preserve source type
  return inputType || 'string';
}

export function computeNodeOutputAttributes(node, edges, nodes) {
  const ls = getLineage(node.type);
  if (ls?.outputs) return ls.outputs(node, edges, nodes);

  switch (node.type) {
    case 'dataFrameNode':
      return node.data.attributes || [];

    case 'functionNode': {
      const ownOutputs = (node.data.outputs || []).map((o) => ({
        id: o.id, name: o.name, type: o.type || 'string',
      }));
      if (!node.data.extendMode) return ownOutputs;
      const sourceAttrs = getUpstreamAttrs(node.id, edges, nodes);
      const ownNames = new Set(ownOutputs.map((o) => o.name));
      return [...sourceAttrs.filter((a) => !ownNames.has(a.name)), ...ownOutputs];
    }

    default:
      return [];
  }
}

// Deduplicated union of output attributes from all nodes connected via df-in
// (or a specific handle) to nodeId.
export function getUpstreamAttrs(nodeId, edges, nodes, handleId = 'df-in') {
  const seen = new Map();
  for (const e of edges) {
    if (e.target !== nodeId || e.targetHandle !== handleId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (!src) continue;
    for (const attr of computeNodeOutputAttributes(src, edges, nodes)) {
      if (!seen.has(attr.name)) seen.set(attr.name, attr);
    }
  }
  return [...seen.values()];
}

// ── Column Lineage Tracing ─────────────────────────────────────────────────
//
// traceColumnUpstream: walks the graph backwards from (nodeId, colName)
// Returns a linked chain: { nodeId, colName, nodeType, nodeLabel, upstream, ...extras } | null
//
// extras per node type:
//   groupByNode agg: aggFunc, inputColName
//   functionNode:    createdHere: true

export function traceColumnUpstream(nodeId, colName, edges, nodes) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const ls = getLineage(node.type);
  if (ls?.traceUpstream) return ls.traceUpstream(node, colName, edges, nodes);

  switch (node.type) {
    case 'dataFrameNode': {
      if (!(node.data.attributes || []).some((a) => a.name === colName)) return null;
      const step = { nodeId, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
      // If this DF is the output of an operator (companion or manual result DF),
      // trace back through the incoming df-in edge instead of stopping here.
      const inEdge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'df-in' && e.sourceHandle === 'df-out'
      );
      if (inEdge) {
        const src = nodes.find((n) => n.id === inEdge.source);
        if (src) step.upstream = traceColumnUpstream(src.id, colName, edges, nodes);
      }
      return step;
    }

    case 'functionNode': {
      const output = (node.data.outputs || []).find((o) => o.name === colName);
      if (output) {
        const step = { nodeId, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
        if (output.fromInputId) {
          const inp = (node.data.inputs || []).find((i) => i.id === output.fromInputId);
          if (inp) step.upstream = traceColumnUpstream(inp.sourceNodeId, inp.attrName, edges, nodes);
          return step;
        }
        return { ...step, createdHere: true };
      }
      // extend mode: pass-through column from source DF
      if (node.data.extendMode) {
        const step = { nodeId, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
        for (const e of edges.filter((e) => e.target === nodeId && e.targetHandle === 'df-in')) {
          const r = traceColumnUpstream(e.source, colName, edges, nodes);
          if (r) { step.upstream = r; break; }
        }
        return step.upstream ? step : null;
      }
      return null;
    }

    default:
      return null;
  }
}

// traceColumnDownstream: walks the graph forward from (nodeId, colName)
// Returns array of branches (can fan out at concat/merge forks):
//   [{ nodeId, colName, nodeType, nodeLabel, downstream: [...] }]

export function traceColumnDownstream(nodeId, colName, edges, nodes) {
  const results = [];
  // Follow all df-out edges from this node
  const outEdges = edges.filter((e) => e.source === nodeId && e.sourceHandle === 'df-out');

  for (const e of outEdges) {
    const target = nodes.find((n) => n.id === e.target);
    if (!target) continue;
    const propagated = _propagateCol(target, colName, edges, nodes);
    if (propagated === null) continue;
    results.push({
      nodeId: target.id,
      colName: propagated,
      nodeType: target.type,
      nodeLabel: target.data.label,
      downstream: traceColumnDownstream(target.id, propagated, edges, nodes),
    });
  }
  return results;
}

function _propagateCol(targetNode, colName, edges, nodes) {
  const ls = getLineage(targetNode.type);
  if (ls?.propagateDownstream) return ls.propagateDownstream(targetNode, colName, edges, nodes);

  switch (targetNode.type) {
    case 'dataFrameNode':
      return (targetNode.data.attributes || []).some((a) => a.name === colName) ? colName : null;

    case 'functionNode':
      return computeNodeOutputAttributes(targetNode, edges, nodes).some((a) => a.name === colName) ? colName : null;

    default:
      return null;
  }
}

// Flattens the upstream chain into an ordered array [oldest → newest].
export function flattenUpstream(step) {
  const path = [];
  let cur = step;
  while (cur) { path.unshift(cur); cur = cur.upstream; }
  return path;
}
