import * as engine from '../../utils/nodeOutputAttrs';
import { uid } from '../../utils/uid';
import config from './config';
import RenameNode from './index';
import { useRenameCallbacks } from './callbacks';

// Rename remaps upstream column names via its `mappings` (from→to); unmapped
// columns pass through. Lineage lifted verbatim from the renameNode cases.

const renameSpec = {
  type: config.type,
  theme: 'rename',
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: true,
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu,
  header: { editableLabel: true, code: true },
  component: RenameNode,

  // Component needs the upstream column set to populate the from/to dropdowns.
  inject: (node, edges, nodes) => ({ connectedAttrs: engine.getUpstreamAttrs(node.id, edges, nodes) }),
  // Paste: fresh ids for each mapping row.
  clone: (data) => ({ ...data, mappings: (data.mappings || []).map((m) => ({ ...m, id: uid() })) }),

  // ── Lineage ────────────────────────────────────────────────────────────────
  outputs: (node, edges, nodes) => {
    const upstream = engine.getUpstreamAttrs(node.id, edges, nodes);
    const renamedMap = new Map(
      (node.data.mappings || []).filter((m) => m.from && m.to).map((m) => [m.from, m])
    );
    return upstream.map((attr) => {
      const mapping = renamedMap.get(attr.name);
      return mapping ? { id: mapping.id, name: mapping.to, type: attr.type } : attr;
    });
  },

  traceUpstream: (node, colName, edges, nodes, visited) => {
    // A renamed column traces upstream with its original name; otherwise pass-through.
    const mapping = (node.data.mappings || []).find((m) => m.from && m.to && m.to === colName);
    const sourceColName = mapping ? mapping.from : colName;
    const step = { nodeId: node.id, colName, nodeType: node.type, nodeLabel: node.data.label, upstream: null };
    for (const e of edges.filter((e) => e.target === node.id && e.targetHandle === 'df-in')) {
      const r = engine.traceColumnUpstream(e.source, sourceColName, edges, nodes, visited);
      if (r) { step.upstream = r; break; }
    }
    // Pass-through column: only valid if found upstream; renamed column: always valid.
    if (!mapping && !step.upstream) return null;
    return step;
  },

  propagateDownstream: (node, colName, edges, nodes) => {
    const mapping = (node.data.mappings || []).find((m) => m.from === colName);
    if (mapping?.to) return mapping.to;
    return engine.computeNodeOutputAttributes(node, edges, nodes).some((a) => a.name === colName) ? colName : null;
  },

  validate: (node) => {
    const valid = (node.data.mappings || []).some((m) => m.from && m.to);
    return valid ? [] : [{ nodeId: node.id, severity: 'warning', code: 'rename-empty', message: 'Rename has no from→to mappings' }];
  },

  toPandas: (node, ctx) => {
    const up = ctx.upstreamVars(node, 'df-in')[0] || '<source>';
    const pairs = (node.data.mappings || []).filter((m) => m.from && m.to).map((m) => `'${m.from}': '${m.to}'`);
    return pairs.length ? `${ctx.var} = ${up}.rename(columns={${pairs.join(', ')}})` : `${ctx.var} = ${up}`;
  },

  useCallbacks: ({ setNodes, pushHistory }) => useRenameCallbacks(setNodes, pushHistory),
};

export default renameSpec;
