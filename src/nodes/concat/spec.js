import * as engine from '../../utils/nodeOutputAttrs';
import config from './config';
import ConcatNode from './index';
import { useConcatCallbacks } from './callbacks';

// Concat (vertical stack) passes the union of upstream columns through unchanged.
// Lineage methods lifted verbatim from the concatNode cases in nodeOutputAttrs.js.

const concatSpec = {
  type: config.type,
  theme: 'concat',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: false,
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: ConcatNode,

  // Component lists the DataFrames feeding its df-in handle.
  inject: (node, edges, nodes) => ({
    connectedDFs: edges
      .filter((e) => e.target === node.id && e.targetHandle === 'df-in')
      .map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        return src ? { sourceNodeId: src.id, sourceNodeLabel: src.data.label } : null;
      })
      .filter(Boolean),
  }),

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

  toPandas: (node, ctx) => {
    const ups = ctx.upstreamVars(node, 'df-in');
    return `${ctx.var} = pd.concat([${ups.length ? ups.join(', ') : '<inputs>'}], ignore_index=True)`;
  },

  useCallbacks: () => useConcatCallbacks(),
};

export default concatSpec;
