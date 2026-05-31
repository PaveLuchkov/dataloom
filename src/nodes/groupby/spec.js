import * as engine from '../../utils/nodeOutputAttrs';
import { uid } from '../../utils/uid';
import config from './config';
import GroupByNode from './index';
import { useGroupByCallbacks } from './callbacks';

// GroupBy outputs its group-by key columns plus one column per aggregation
// (typed via inferAggType). Inputs are pulled in at the column level (each input
// records its sourceNodeId/attrName). Lineage lifted verbatim from the groupByNode cases.

const groupbySpec = {
  type: config.type,
  theme: 'groupby',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: true,
  connect: { acceptsColumns: true, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: GroupByNode,

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node) => {
    const inputs = node.data.inputs || [];
    const keys = (node.data.groupByInputIds || [])
      .map((gid) => inputs.find((i) => i.id === gid))
      .filter(Boolean)
      .map((i) => ({ id: i.id, name: i.attrName, type: i.attrType || 'string' }));
    const aggs = (node.data.aggregations || [])
      .filter((a) => a.outputName)
      .map((a) => {
        const inp = inputs.find((i) => i.id === a.inputId);
        return { id: a.id, name: a.outputName, type: engine.inferAggType(a.func, inp?.attrType) };
      });
    return [...keys, ...aggs];
  },

  traceUpstream: (node, colName, edges, nodes) => {
    const inputs = node.data.inputs || [];
    const groupByInputIds = node.data.groupByInputIds || [];
    const keyInp = inputs.find((i) => groupByInputIds.includes(i.id) && i.attrName === colName);
    if (keyInp) {
      const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
      step.upstream = engine.traceColumnUpstream(keyInp.sourceNodeId, colName, edges, nodes);
      return step;
    }
    const agg = (node.data.aggregations || []).find((a) => a.outputName === colName);
    if (agg) {
      const inp = inputs.find((i) => i.id === agg.inputId);
      const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, aggFunc: agg.func, inputColName: inp?.attrName, upstream: null };
      if (inp) step.upstream = engine.traceColumnUpstream(inp.sourceNodeId, inp.attrName, edges, nodes);
      return step;
    }
    return null;
  },

  propagateDownstream: (node, colName) => {
    const inputs = node.data.inputs || [];
    const inp = inputs.find((i) => i.attrName === colName);
    if (inp && (node.data.groupByInputIds || []).includes(inp.id)) return colName;
    const agg = (node.data.aggregations || []).find((a) => {
      const si = inputs.find((i) => i.id === a.inputId);
      return si?.attrName === colName;
    });
    return agg?.outputName || null;
  },

  // ── State capabilities ───────────────────────────────────────────────────
  // Paste: new ids for every input, remapped through groupByInputIds and aggs.
  clone: (data) => {
    const idMap = new Map();
    const inputs = (data.inputs || []).map((inp) => { const nid = uid(); idMap.set(inp.id, nid); return { ...inp, id: nid }; });
    return {
      ...data,
      inputs,
      groupByInputIds: (data.groupByInputIds || []).map((id) => idMap.get(id) ?? id),
      aggregations: (data.aggregations || []).map((a) => ({ ...a, id: uid(), inputId: idMap.get(a.inputId) ?? a.inputId })),
    };
  },

  // Inputs freeze attrType at drag time; refresh from live upstream on graph change.
  refreshData: (node, edges, nodes) => {
    let changed = false;
    const inputs = (node.data.inputs || []).map((inp) => {
      const srcNode = nodes.find((s) => s.id === inp.sourceNodeId);
      if (!srcNode) return inp;
      const liveAttr = engine.computeNodeOutputAttributes(srcNode, edges, nodes).find((a) => a.name === inp.attrName);
      if (!liveAttr || liveAttr.type === inp.attrType) return inp;
      changed = true;
      return { ...inp, attrType: liveAttr.type };
    });
    return changed ? { ...node.data, inputs } : null;
  },

  useCallbacks: ({ setNodes, setEdges, pushHistory }) => useGroupByCallbacks(setNodes, setEdges, pushHistory),
};

export default groupbySpec;
