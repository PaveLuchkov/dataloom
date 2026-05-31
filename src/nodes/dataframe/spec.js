import * as engine from '../../utils/nodeOutputAttrs';
import config from './config';
import DataFrameNode from './index';
import { useDataFrameCallbacks } from './callbacks';

// First node type migrated to the NodeSpec contract. The lineage methods are
// lifted verbatim from the dataFrameNode cases in utils/nodeOutputAttrs.js; the
// characterization suite guards the move. traceUpstream re-enters the engine's
// recursive traceColumnUpstream so it interops with not-yet-migrated types.

const dataframeSpec = {
  type: config.type,
  theme: 'dataframe',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  makeCompanion: config.makeCompanion,
  companion: false,
  connect: { acceptsColumns: true, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: DataFrameNode,

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node) => node.data.attributes || [],

  traceUpstream: (node, colName, edges, nodes) => {
    if (!(node.data.attributes || []).some((a) => a.name === colName)) return null;
    const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
    // A result/companion DF traces back through its incoming df-in edge.
    const inEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'df-in' && e.sourceHandle === 'df-out'
    );
    if (inEdge) {
      const src = nodes.find((n) => n.id === inEdge.source);
      if (src) step.upstream = engine.traceColumnUpstream(src.id, colName, edges, nodes);
    }
    return step;
  },

  propagateDownstream: (node, colName) =>
    (node.data.attributes || []).some((a) => a.name === colName) ? colName : null,

  useCallbacks: ({ setNodes, setEdges, pushHistory }) =>
    useDataFrameCallbacks(setNodes, setEdges, pushHistory),
};

export default dataframeSpec;
