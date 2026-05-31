// Registry of node types migrated to the NodeSpec contract. Importing this
// module registers each spec's lineage methods so the engine dispatches to them.
// Imported once for its side effect at app startup (src/index.jsx); grows by one
// entry per migrated type until the legacy switch/config layers can be removed.

import { registerLineage } from './lineageRegistry';
import dataframeSpec from './dataframe/spec';
import filterSpec from './filter/spec';
import concatSpec from './concat/spec';
import renameSpec from './rename/spec';
import transformSpec from './transform/spec';
import mergeSpec from './merge/spec';
import groupbySpec from './groupby/spec';

export const SPECS = {
  [dataframeSpec.type]: dataframeSpec,
  [filterSpec.type]: filterSpec,
  [concatSpec.type]: concatSpec,
  [renameSpec.type]: renameSpec,
  [transformSpec.type]: transformSpec,
  [mergeSpec.type]: mergeSpec,
  [groupbySpec.type]: groupbySpec,
};

for (const spec of Object.values(SPECS)) {
  registerLineage(spec.type, {
    outputs: spec.outputs,
    traceUpstream: spec.traceUpstream,
    propagateDownstream: spec.propagateDownstream,
  });
}
