import * as engine from '../../utils/nodeOutputAttrs';
import config from './config';
import MergeNode from './index';
import { useMergeCallbacks } from './callbacks';

// Merge joins a left and right input (left-in / right-in handles). Output is the
// left columns followed by the right columns whose names don't collide with left.
// Lineage lifted verbatim from the mergeNode cases in nodeOutputAttrs.js.

const mergeSpec = {
  type: config.type,
  theme: 'merge',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: true,
  mergeable: true, // a Merge result can itself feed another Merge
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu, // merge has no menu entry (created via 2-DF selection)
  header: { editableLabel: true, code: true },
  component: MergeNode,

  // Component renders the left/right input schemas for key-pair pickers.
  inject: (node, edges, nodes) => {
    const leftEdge  = edges.find((e) => e.target === node.id && e.targetHandle === 'left-in');
    const rightEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'right-in');
    const leftNode  = leftEdge  ? nodes.find((n) => n.id === leftEdge.source)  : null;
    const rightNode = rightEdge ? nodes.find((n) => n.id === rightEdge.source) : null;
    return {
      leftDF:  leftNode  ? { id: leftNode.id,  label: leftNode.data.label,  attributes: engine.computeNodeOutputAttributes(leftNode,  edges, nodes) } : null,
      rightDF: rightNode ? { id: rightNode.id, label: rightNode.data.label, attributes: engine.computeNodeOutputAttributes(rightNode, edges, nodes) } : null,
    };
  },

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node, edges, nodes) => {
    const leftEdge  = edges.find((e) => e.target === node.id && e.targetHandle === 'left-in');
    const rightEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'right-in');
    const leftNode  = leftEdge  ? nodes.find((n) => n.id === leftEdge.source)  : null;
    const rightNode = rightEdge ? nodes.find((n) => n.id === rightEdge.source) : null;
    const lAttrs = leftNode  ? engine.computeNodeOutputAttributes(leftNode,  edges, nodes) : [];
    const rAttrs = rightNode ? engine.computeNodeOutputAttributes(rightNode, edges, nodes) : [];
    const seen = new Set(lAttrs.map((a) => a.name));
    return [...lAttrs, ...rAttrs.filter((a) => !seen.has(a.name))];
  },

  traceUpstream: (node, colName, edges, nodes, visited) => {
    const leftEdge  = edges.find((e) => e.target === node.id && e.targetHandle === 'left-in');
    const rightEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'right-in');
    const leftNode  = leftEdge  ? nodes.find((n) => n.id === leftEdge.source)  : null;
    const rightNode = rightEdge ? nodes.find((n) => n.id === rightEdge.source) : null;
    const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
    if (leftNode && engine.computeNodeOutputAttributes(leftNode, edges, nodes).some((a) => a.name === colName)) {
      step.upstream = engine.traceColumnUpstream(leftNode.id, colName, edges, nodes, visited);
      return step;
    }
    if (rightNode && engine.computeNodeOutputAttributes(rightNode, edges, nodes).some((a) => a.name === colName)) {
      step.upstream = engine.traceColumnUpstream(rightNode.id, colName, edges, nodes, visited);
      return step;
    }
    return step;
  },

  propagateDownstream: (node, colName, edges, nodes) =>
    engine.computeNodeOutputAttributes(node, edges, nodes).some((a) => a.name === colName) ? colName : null,

  validate: (node, edges, nodes) => {
    const issues = [];
    const leftEdge  = edges.find((e) => e.target === node.id && e.targetHandle === 'left-in');
    const rightEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'right-in');
    if (!leftEdge || !rightEdge) {
      issues.push({ nodeId: node.id, severity: 'warning', code: 'merge-missing-input', message: 'Merge is missing a left or right input' });
    }
    const pairs = (node.data.keyPairs || []).filter((p) => p.left && p.right);
    if (!(node.data.keyPairs || []).length) {
      issues.push({ nodeId: node.id, severity: 'error', code: 'merge-no-keys', message: 'Merge has no join key pairs' });
    }
    // Join-key type mismatch: pandas would coerce/empty-join silently.
    const leftNode  = leftEdge  ? nodes.find((n) => n.id === leftEdge.source)  : null;
    const rightNode = rightEdge ? nodes.find((n) => n.id === rightEdge.source) : null;
    if (leftNode && rightNode) {
      const lAttrs = engine.computeNodeOutputAttributes(leftNode, edges, nodes);
      const rAttrs = engine.computeNodeOutputAttributes(rightNode, edges, nodes);
      for (const p of pairs) {
        const lt = lAttrs.find((a) => a.name === p.left)?.type;
        const rt = rAttrs.find((a) => a.name === p.right)?.type;
        if (lt && rt && lt !== rt) {
          issues.push({ nodeId: node.id, severity: 'warning', code: 'merge-key-type-mismatch', message: `Join key ${p.left}/${p.right} types differ (${lt} vs ${rt})` });
        }
      }
    }
    return issues;
  },

  toPandas: (node, ctx) => {
    const left  = ctx.upstreamVars(node, 'left-in')[0]  || '<left>';
    const right = ctx.upstreamVars(node, 'right-in')[0] || '<right>';
    const how = node.data.joinType || 'inner';
    const pairs = (node.data.keyPairs || []).filter((p) => p.left && p.right);
    if (!pairs.length) return `${ctx.var} = pd.merge(${left}, ${right}, how='${how}')  # TODO: join keys`;
    const lon = pairs.map((p) => `'${p.left}'`).join(', ');
    const ron = pairs.map((p) => `'${p.right}'`).join(', ');
    return `${ctx.var} = pd.merge(${left}, ${right}, how='${how}', left_on=[${lon}], right_on=[${ron}])`;
  },

  useCallbacks: ({ setNodes, pushHistory }) => useMergeCallbacks(setNodes, pushHistory),
};

export default mergeSpec;
