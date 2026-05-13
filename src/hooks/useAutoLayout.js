import dagre from 'dagre';

const NODE_WIDTH = { dataFrameNode: 220, mergeNode: 380, functionNode: 380 };

function nodeHeight(node) {
  if (node.type === 'dataFrameNode') {
    return 42 + Math.max(1, node.data.attributes?.length || 0) * 28 + 16;
  }
  if (node.type === 'mergeNode') return 200;
  if (node.type === 'functionNode') {
    const rows = Math.max(node.data.inputs?.length || 0, node.data.outputs?.length || 0, 3);
    return 60 + rows * 24;
  }
  return 100;
}

export function useAutoLayout() {
  const applyLayout = (nodes, edges) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 80, marginx: 40, marginy: 40 });

    for (const node of nodes) {
      const w = NODE_WIDTH[node.type] || 220;
      const h = nodeHeight(node);
      g.setNode(node.id, { width: w, height: h });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    return nodes.map((node) => {
      const { x, y } = g.node(node.id);
      const w = NODE_WIDTH[node.type] || 220;
      const h = nodeHeight(node);
      return { ...node, position: { x: x - w / 2, y: y - h / 2 } };
    });
  };

  return { applyLayout };
}
