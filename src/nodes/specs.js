// The node-type registry: one NodeSpec per type. This module is the single list
// of node types — importing it registers each spec's lineage methods with the
// engine (src/utils/nodeOutputAttrs.js dispatches through them) and exposes the
// specs to useLineageState for generic callback composition, paste-clone,
// companion spawning, derived-prop injection, and the schema-sync/auto-heal
// effects. Adding a node type = add one spec file + one entry here.

import { registerLineage } from './lineageRegistry';
import dataframeSpec from './dataframe/spec';
import filterSpec from './filter/spec';
import concatSpec from './concat/spec';
import renameSpec from './rename/spec';
import transformSpec from './transform/spec';
import mergeSpec from './merge/spec';
import groupbySpec from './groupby/spec';
import functionSpec from './function/spec';
import commentSpec from './comment/spec';

export const SPECS = {
  [dataframeSpec.type]: dataframeSpec,
  [filterSpec.type]: filterSpec,
  [concatSpec.type]: concatSpec,
  [renameSpec.type]: renameSpec,
  [transformSpec.type]: transformSpec,
  [mergeSpec.type]: mergeSpec,
  [groupbySpec.type]: groupbySpec,
  [functionSpec.type]: functionSpec,
  [commentSpec.type]: commentSpec,
};

// Stable-ordered list for iterating specs in React (hook order must not change).
export const SPEC_LIST = Object.values(SPECS);

export function getSpec(type) {
  return SPECS[type];
}

for (const spec of SPEC_LIST) {
  if (spec.outputs || spec.traceUpstream || spec.propagateDownstream) {
    registerLineage(spec.type, {
      outputs: spec.outputs,
      traceUpstream: spec.traceUpstream,
      propagateDownstream: spec.propagateDownstream,
    });
  }
}
