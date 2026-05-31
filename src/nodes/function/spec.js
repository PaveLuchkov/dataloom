import * as engine from '../../utils/nodeOutputAttrs';
import config from './config';
import FunctionNode from './index';
import { useFunctionCallbacks } from './callbacks';

// Function declares its own output columns; each output may derive from an input
// (fromInputId) or be created here. In extend mode it also passes through any
// upstream column it doesn't redefine. Lineage lifted verbatim from the
// functionNode cases in nodeOutputAttrs.js — extend mode is the capability that
// Phase 7's "expand Function" will grow on top of this spec.

const functionSpec = {
  type: config.type,
  theme: 'function',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: true,
  connect: { acceptsColumns: true, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: FunctionNode,

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node, edges, nodes) => {
    const ownOutputs = (node.data.outputs || []).map((o) => ({
      id: o.id, name: o.name, type: o.type || 'string',
    }));
    if (!node.data.extendMode) return ownOutputs;
    const sourceAttrs = engine.getUpstreamAttrs(node.id, edges, nodes);
    const ownNames = new Set(ownOutputs.map((o) => o.name));
    return [...sourceAttrs.filter((a) => !ownNames.has(a.name)), ...ownOutputs];
  },

  traceUpstream: (node, colName, edges, nodes) => {
    const output = (node.data.outputs || []).find((o) => o.name === colName);
    if (output) {
      const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
      if (output.fromInputId) {
        const inp = (node.data.inputs || []).find((i) => i.id === output.fromInputId);
        if (inp) step.upstream = engine.traceColumnUpstream(inp.sourceNodeId, inp.attrName, edges, nodes);
        return step;
      }
      return { ...step, createdHere: true };
    }
    // extend mode: pass-through column from source DF
    if (node.data.extendMode) {
      const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
      for (const e of edges.filter((e) => e.target === node.id && e.targetHandle === 'df-in')) {
        const r = engine.traceColumnUpstream(e.source, colName, edges, nodes);
        if (r) { step.upstream = r; break; }
      }
      return step.upstream ? step : null;
    }
    return null;
  },

  propagateDownstream: (node, colName, edges, nodes) =>
    engine.computeNodeOutputAttributes(node, edges, nodes).some((a) => a.name === colName) ? colName : null,

  useCallbacks: ({ setNodes, setEdges, pushHistory }) => useFunctionCallbacks(setNodes, setEdges, pushHistory),
};

export default functionSpec;
