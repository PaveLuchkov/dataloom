import React from 'react';

const NODE_ICON = {
  dataFrameNode: { symbol: '▣', color: '#60a5fa' },
  functionNode:  { symbol: 'ƒ',  color: '#4ade80' },
  mergeNode:     { symbol: '⋈', color: '#c084fc' },
  filterNode:    { symbol: 'σ',  color: '#fb923c' },
  groupByNode:   { symbol: '⊞', color: '#38bdf8' },
  renameNode:    { symbol: '⟲', color: '#818cf8' },
  concatNode:    { symbol: '∪',  color: '#a3e635' },
  transformNode: { symbol: '⊕', color: '#f472b6' },
  commentNode:   { symbol: '✎', color: '#fbbf24' },
};

const SEVERITY = {
  error:   { dot: '#ef4444', label: 'error' },
  warning: { dot: '#f59e0b', label: 'warning' },
};

function NodeIcon({ type }) {
  const icon = NODE_ICON[type] || { symbol: '▣', color: '#60a5fa' };
  return (
    <span className="font-mono font-bold flex-shrink-0 select-none" style={{ color: icon.color, fontSize: 10, width: 12 }}>
      {icon.symbol}
    </span>
  );
}

export default function ValidationPanel({ validation, nodes, onClose, onNavigate }) {
  const { issues, errors, warnings } = validation;

  // Group by node, preserving node order; errors before warnings within a node.
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const byNode = new Map();
  for (const issue of issues) {
    if (!byNode.has(issue.nodeId)) byNode.set(issue.nodeId, []);
    byNode.get(issue.nodeId).push(issue);
  }
  const groups = [...byNode.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
    .map(([nodeId, list]) => {
      const node = nodes.find((n) => n.id === nodeId);
      return {
        nodeId,
        nodeType: node?.type,
        nodeLabel: list[0].nodeLabel || node?.data?.label || nodeId,
        list: [...list].sort((x, y) => (x.severity === 'error' ? -1 : 1) - (y.severity === 'error' ? -1 : 1)),
      };
    });

  return (
    <div
      className="absolute z-40 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: 56, right: 16, width: 320, background: '#0c1929', border: '1px solid #164e63', pointerEvents: 'all' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: '#0f2744', borderColor: '#1e3a5f' }}>
        <span style={{ color: errors ? '#ef4444' : warnings ? '#f59e0b' : '#22c55e', fontSize: 13 }}>⚑</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-400 select-none">Problems</div>
          <div className="text-sm font-mono font-bold truncate" style={{ color: '#cbd5e1' }}>
            {errors} error{errors === 1 ? '' : 's'} · {warnings} warning{warnings === 1 ? '' : 's'}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-sm select-none flex-shrink-0">×</button>
      </div>

      <div className="py-1 overflow-y-auto" style={{ maxHeight: 480 }}>
        {groups.length === 0 && (
          <div className="px-3 py-6 text-center text-xs select-none" style={{ color: '#22c55e' }}>
            ✓ No problems detected
          </div>
        )}

        {groups.map((group) => (
          <div key={group.nodeId} className="py-0.5">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer rounded transition-colors hover:bg-white/5"
              onClick={() => onNavigate && onNavigate(group.nodeId)}
            >
              <NodeIcon type={group.nodeType} />
              <span className="text-xs flex-1 truncate font-semibold" style={{ color: '#94a3b8' }}>{group.nodeLabel}</span>
            </div>
            {group.list.map((issue, i) => (
              <div
                key={`${issue.code}-${i}`}
                className="flex items-start gap-1.5 pl-6 pr-2 py-0.5 cursor-pointer rounded transition-colors hover:bg-white/5"
                onClick={() => onNavigate && onNavigate(group.nodeId)}
              >
                <span
                  className="flex-shrink-0 select-none"
                  style={{ color: (SEVERITY[issue.severity] || SEVERITY.warning).dot, fontSize: 10, lineHeight: '16px' }}
                  title={(SEVERITY[issue.severity] || SEVERITY.warning).label}
                >
                  ●
                </span>
                <span className="text-xs" style={{ color: '#cbd5e1' }}>{issue.message}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
