import { useMemo } from 'react';
import { collectIssues } from '../utils/validation';

// Aggregates lint Issues for the current graph and indexes them by node so the
// canvas can show per-node badges and the problems panel can group them.
export function useValidation(nodes, edges) {
  return useMemo(() => {
    const issues = collectIssues(nodes, edges);
    const byNode = new Map();
    for (const issue of issues) {
      if (!byNode.has(issue.nodeId)) byNode.set(issue.nodeId, []);
      byNode.get(issue.nodeId).push(issue);
    }
    const errors = issues.filter((i) => i.severity === 'error').length;
    return { issues, byNode, errors, warnings: issues.length - errors };
  }, [nodes, edges]);
}
