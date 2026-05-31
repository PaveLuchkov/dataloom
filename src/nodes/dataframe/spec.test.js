// Importing the specs barrel registers the DataFrame lineage methods, so the
// engine dispatches dataFrameNode through the spec here (whereas
// utils/nodeOutputAttrs.test.js, which does not import it, exercises the switch
// fallback — both must agree).
import '../specs';
import dataframeSpec from './spec';
import { getLineage } from '../lineageRegistry';
import { computeNodeOutputAttributes, traceColumnUpstream, flattenUpstream } from '../../utils/nodeOutputAttrs';

const attr = (id, name, type = 'string') => ({ id, name, type });
const df = (id, label, attributes) => ({ id, type: 'dataFrameNode', position: { x: 0, y: 0 }, data: { label, attributes } });
const op = (id, type, label, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...data } });
const dfEdge = (source, target) => ({ id: `e-${source}-${target}`, source, target, sourceHandle: 'df-out', targetHandle: 'df-in' });

test('importing specs registers the DataFrame lineage methods', () => {
  const ls = getLineage('dataFrameNode');
  expect(ls).toBeDefined();
  expect(typeof ls.outputs).toBe('function');
  expect(typeof ls.traceUpstream).toBe('function');
  expect(typeof ls.propagateDownstream).toBe('function');
});

test('spec methods behave like the original dataFrameNode cases', () => {
  const a = df('A', 'A', [attr('a1', 'x', 'int')]);
  expect(dataframeSpec.outputs(a)).toEqual([attr('a1', 'x', 'int')]);
  expect(dataframeSpec.propagateDownstream(a, 'x')).toBe('x');
  expect(dataframeSpec.propagateDownstream(a, 'nope')).toBeNull();
  expect(dataframeSpec.traceUpstream(a, 'x', [], [a])).toMatchObject({ nodeId: 'A', colName: 'x', upstream: null });
});

test('engine dispatches dataFrameNode through the spec', () => {
  const a = df('A', 'A', [attr('a1', 'x', 'int')]);
  // identity check: the engine result is exactly what the spec returns
  expect(computeNodeOutputAttributes(a, [], [a])).toBe(dataframeSpec.outputs(a));
});

test('spec (DF) interops with switch types (Filter) when tracing through a chain', () => {
  // A[df, spec] -> Filter[switch] -> R[df, spec]; trace must walk all three.
  const a = df('A', 'src', [attr('a1', 'x', 'int')]);
  const f = op('F', 'filterNode', 'f');
  const r = df('R', 'result', [attr('r1', 'x', 'int')]);
  const nodes = [a, f, r];
  const edges = [dfEdge('A', 'F'), dfEdge('F', 'R')];
  const chain = flattenUpstream(traceColumnUpstream('R', 'x', edges, nodes));
  expect(chain.map((s) => s.nodeId)).toEqual(['A', 'F', 'R']);
});
