import * as engine from '../../utils/nodeOutputAttrs';
import { uid } from '../../utils/uid';
import config from './config';
import TransformNode from './index';
import { useTransformCallbacks } from './callbacks';

// Transform applies a list of `ops` to upstream columns: astype overrides a
// column's type, drop_column removes one, add_column introduces a new one; all
// others pass through. Lineage lifted verbatim from the transformNode cases.

const transformSpec = {
  type: config.type,
  theme: 'transform',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: true,
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: TransformNode,

  // Component needs the upstream column set for op column pickers.
  inject: (node, edges, nodes) => ({ connectedAttrs: engine.getUpstreamAttrs(node.id, edges, nodes) }),
  // Paste: fresh ids for each op row.
  clone: (data) => ({ ...data, ops: (data.ops || []).map((o) => ({ ...o, id: uid() })) }),

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node, edges, nodes) => {
    const upstream = engine.getUpstreamAttrs(node.id, edges, nodes);
    const typeOverrides = new Map();
    const droppedCols = new Set();
    const addedCols = [];
    for (const op of (node.data.ops || [])) {
      if (op.type === 'astype' && op.args?.col && op.args?.type_val) typeOverrides.set(op.args.col, op.args.type_val);
      if (op.type === 'drop_column' && op.args?.col) droppedCols.add(op.args.col);
      if (op.type === 'add_column' && op.args?.col) addedCols.push({ id: op.id, name: op.args.col, type: op.args.type_val || 'string' });
    }
    const upstreamNames = new Set(upstream.map((a) => a.name));
    return [
      ...upstream
        .filter((a) => !droppedCols.has(a.name))
        .map((a) => typeOverrides.has(a.name) ? { ...a, type: typeOverrides.get(a.name) } : a),
      ...addedCols.filter((a) => !upstreamNames.has(a.name)),
    ];
  },

  traceUpstream: (node, colName, edges, nodes, visited) => {
    const ops = node.data.ops || [];
    if (ops.some((op) => op.type === 'drop_column' && op.args?.col === colName)) return null;
    if (ops.some((op) => op.type === 'add_column' && op.args?.col === colName)) {
      return { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null, createdHere: true };
    }
    const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
    for (const e of edges.filter((e) => e.target === node.id && e.targetHandle === 'df-in')) {
      const r = engine.traceColumnUpstream(e.source, colName, edges, nodes, visited);
      if (r) { step.upstream = r; break; }
    }
    return step;
  },

  propagateDownstream: (node, colName, edges, nodes) =>
    engine.computeNodeOutputAttributes(node, edges, nodes).some((a) => a.name === colName) ? colName : null,

  validate: (node) => {
    const ops = (node.data.ops || []).filter((o) => o.type);
    return ops.length ? [] : [{ nodeId: node.id, severity: 'warning', code: 'transform-empty', message: 'Transform has no operations' }];
  },

  useCallbacks: ({ setNodes, pushHistory }) => useTransformCallbacks(setNodes, pushHistory),
};

export default transformSpec;
