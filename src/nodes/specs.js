// Registry of node types migrated to the NodeSpec contract. Importing this
// module registers each spec's lineage methods so the engine dispatches to them.
// Imported once for its side effect at app startup (src/index.jsx); grows by one
// entry per migrated type until the legacy switch/config layers can be removed.

import { registerLineage } from './lineageRegistry';
import dataframeSpec from './dataframe/spec';

export const SPECS = {
  [dataframeSpec.type]: dataframeSpec,
};

for (const spec of Object.values(SPECS)) {
  registerLineage(spec.type, {
    outputs: spec.outputs,
    traceUpstream: spec.traceUpstream,
    propagateDownstream: spec.propagateDownstream,
  });
}
