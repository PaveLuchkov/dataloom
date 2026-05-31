import * as engine from '../../utils/nodeOutputAttrs';
import { uid } from '../../utils/uid';
import config from './config';
import DataFrameNode from './index';
import { useDataFrameCallbacks } from './callbacks';

// First node type migrated to the NodeSpec contract. The lineage methods are
// lifted verbatim from the dataFrameNode cases in utils/nodeOutputAttrs.js; the
// characterization suite guards the move. traceUpstream re-enters the engine's
// recursive traceColumnUpstream so it interops with the other types.

const dataframeSpec = {
  type: config.type,
  theme: 'dataframe',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  makeCompanion: config.makeCompanion,
  companion: false,
  ownsColumns: true, // stores its columns explicitly (vs operators that compute them)
  mergeable: true, // can be selected (with another) to spawn a Merge
  connect: { acceptsColumns: true, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: DataFrameNode,

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node) => node.data.attributes || [],

  traceUpstream: (node, colName, edges, nodes, visited) => {
    const thisAttr = (node.data.attributes || []).find((a) => a.name === colName);
    if (!thisAttr) return null;
    const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };

    // 1) Explicit per-column wire (a column dragged from another node onto this
    // one). The source handle encodes the upstream attr id; resolve its name and
    // trace from there.
    const colEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === `${thisAttr.id}-target` && e.sourceHandle?.endsWith('-source')
    );
    if (colEdge) {
      const src = nodes.find((n) => n.id === colEdge.source);
      if (src) {
        const srcAttrId = colEdge.sourceHandle.slice(0, -'-source'.length);
        const srcAttr = engine.computeNodeOutputAttributes(src, edges, nodes).find((a) => a.id === srcAttrId);
        step.upstream = engine.traceColumnUpstream(src.id, srcAttr ? srcAttr.name : colName, edges, nodes, visited);
      }
      return step;
    }

    // 2) A result/companion DF traces back through its incoming df-in edge.
    const inEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'df-in' && e.sourceHandle === 'df-out'
    );
    if (inEdge) {
      const src = nodes.find((n) => n.id === inEdge.source);
      if (src) step.upstream = engine.traceColumnUpstream(src.id, colName, edges, nodes, visited);
    }
    return step;
  },

  propagateDownstream: (node, colName) =>
    (node.data.attributes || []).some((a) => a.name === colName) ? colName : null,

  // ── State capabilities ───────────────────────────────────────────────────
  // Paste: give every column a fresh id so the clone doesn't share handles.
  clone: (data) => ({ ...data, attributes: (data.attributes || []).map((a) => ({ ...a, id: uid() })) }),

  // Auto-heal: a broken column whose name reappears upstream is restored with
  // the live type. Returns updated data, or null when nothing changed.
  healBroken: (node, edges, nodes) => {
    if (!(node.data.attributes || []).some((a) => a.broken)) return null;
    const upstreamAttrs = engine.getUpstreamAttrs(node.id, edges, nodes);
    if (!upstreamAttrs.length) return null;
    const byName = new Map(upstreamAttrs.map((a) => [a.name, a]));
    let changed = false;
    const healed = (node.data.attributes || []).map((a) => {
      if (!a.broken || !byName.has(a.name)) return a;
      changed = true;
      return { ...a, broken: false, type: byName.get(a.name).type };
    });
    return changed ? { ...node.data, attributes: healed } : null;
  },

  useCallbacks: ({ setNodes, setEdges, pushHistory }) =>
    useDataFrameCallbacks(setNodes, setEdges, pushHistory),
};

export default dataframeSpec;
