// Validation / lint layer. Aggregates three sources of Issues:
//   1. Generic, cross-type checks (broken columns/inputs) that apply to any spec.
//   2. Each spec's own validate(node, edges, nodes) — type-specific rules.
//   3. Graph-level checks (dependency cycles).
// Returns a flat Issue[] with the node label attached for display.

import { getSpec } from '../nodes/specs';
import { computeNodeOutputAttributes } from './nodeOutputAttrs';

// Node ids that participate in a dataflow cycle (df-out → df-in/left-in/right-in).
function findCycleNodes(nodes, edges) {
  const adj = new Map();
  for (const e of edges) {
    if (e.sourceHandle !== 'df-out') continue;
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  }
  const inCycle = new Set();
  for (const start of adj.keys()) {
    const stack = [...(adj.get(start) || [])];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (cur === start) { inCycle.add(start); break; }
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const nxt of adj.get(cur) || []) stack.push(nxt);
    }
  }
  return inCycle;
}

export function collectIssues(nodes, edges) {
  const issues = [];
  const push = (node, severity, code, message) =>
    issues.push({ nodeId: node.id, nodeLabel: node.data?.label, severity, code, message });

  for (const node of nodes) {
    const spec = getSpec(node.type);
    if (!spec) continue;

    // Generic: broken columns / inputs (transient lineage breaks).
    const brokenCols = (node.data.attributes || []).filter((a) => a.broken);
    if (brokenCols.length) {
      push(node, 'error', 'broken-column',
        `${brokenCols.length} broken column${brokenCols.length > 1 ? 's' : ''}: ${brokenCols.map((a) => a.name).join(', ')}`);
    }
    const brokenInputs = (node.data.inputs || []).filter((i) => i.broken);
    if (brokenInputs.length) {
      push(node, 'error', 'broken-input',
        `${brokenInputs.length} broken input${brokenInputs.length > 1 ? 's' : ''}: ${brokenInputs.map((i) => i.attrName).join(', ')}`);
    }

    // Generic: an operator that needs a df-in source but has none wired.
    if (spec.requiresUpstream && !edges.some((e) => e.target === node.id && e.targetHandle === 'df-in')) {
      push(node, 'warning', 'not-connected', `${spec.menu?.label || 'Node'} has no input connected`);
    }

    // Generic: duplicate output column names collide downstream.
    const outNames = computeNodeOutputAttributes(node, edges, nodes).map((a) => a.name);
    const seen = new Set();
    const dupes = new Set();
    for (const name of outNames) { if (seen.has(name)) dupes.add(name); else seen.add(name); }
    if (dupes.size) {
      push(node, 'warning', 'duplicate-column',
        `Duplicate output column${dupes.size > 1 ? 's' : ''}: ${[...dupes].join(', ')}`);
    }

    // Per-type rules from the spec.
    if (spec.validate) {
      for (const issue of spec.validate(node, edges, nodes) || []) {
        issues.push({ nodeLabel: node.data?.label, ...issue });
      }
    }
  }

  // Graph-level: dependency cycles.
  for (const id of findCycleNodes(nodes, edges)) {
    const node = nodes.find((n) => n.id === id);
    if (node) push(node, 'error', 'cycle', 'Part of a dependency cycle');
  }

  return issues;
}
