import * as engine from '../../utils/nodeOutputAttrs';
import config from './config';
import FilterNode from './index';
import { useFilterCallbacks } from './callbacks';

// Filter passes all upstream columns through unchanged (row filtering only).
// Lineage methods lifted verbatim from the filterNode cases in nodeOutputAttrs.js.

const filterSpec = {
  type: config.type,
  theme: 'filter',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: false,
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: FilterNode,

  // Component needs the upstream column set for condition autocomplete.
  inject: (node, edges, nodes) => ({ connectedAttrs: engine.getUpstreamAttrs(node.id, edges, nodes) }),

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node, edges, nodes) => engine.getUpstreamAttrs(node.id, edges, nodes),

  traceUpstream: (node, colName, edges, nodes, visited) => {
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
    const conds = node.data.conditions || (node.data.condition ? [{ expr: node.data.condition }] : []);
    const hasExpr = conds.some((c) => (c.expr || '').trim());
    return hasExpr ? [] : [{ nodeId: node.id, severity: 'warning', code: 'filter-empty', message: 'Filter has no condition' }];
  },

  useCallbacks: ({ setNodes, pushHistory }) => useFilterCallbacks(setNodes, pushHistory),
};

export default filterSpec;
