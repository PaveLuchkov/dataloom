import '../nodes/specs'; // register specs so collectIssues sees each spec.validate
import { collectIssues } from './validation';

const attr = (id, name, type = 'string', extra = {}) => ({ id, name, type, ...extra });
const df = (id, label, attributes, data = {}) => ({ id, type: 'dataFrameNode', position: { x: 0, y: 0 }, data: { label, attributes, ...data } });
const op = (id, type, label, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...data } });
const dfEdge = (s, t) => ({ id: `e-${s}-${t}`, source: s, target: t, sourceHandle: 'df-out', targetHandle: 'df-in' });
const edge = (s, sh, t, th) => ({ id: `e-${s}-${t}-${th}`, source: s, sourceHandle: sh, target: t, targetHandle: th });

const codes = (issues) => issues.map((i) => i.code).sort();

test('a clean graph produces no issues', () => {
  const a = df('A', 'a', [attr('a1', 'x', 'int')]);
  const m = op('M', 'mergeNode', 'm', { keyPairs: [{ left: 'x', right: 'x' }] });
  const b = df('B', 'b', [attr('b1', 'x', 'int')]);
  const edges = [edge('A', 'df-out', 'M', 'left-in'), edge('B', 'df-out', 'M', 'right-in')];
  expect(collectIssues([a, m, b], edges)).toEqual([]);
});

test('merge without join keys is an error; missing an input is a warning', () => {
  const m = op('M', 'mergeNode', 'm', { keyPairs: [] });
  expect(codes(collectIssues([m], []))).toEqual(['merge-missing-input', 'merge-no-keys']);
});

test('groupby with no keys or aggregations is an error', () => {
  const gb = op('GB', 'groupByNode', 'gb', { inputs: [{ id: 'g1', attrName: 'x', sourceNodeId: 'A' }], groupByInputIds: [], aggregations: [] });
  expect(codes(collectIssues([gb], []))).toContain('groupby-empty');
});

test('empty filter / rename / transform / function surface warnings', () => {
  const f = op('F', 'filterNode', 'f', { conditions: [{ id: 'c1', op: 'WHERE', expr: '' }] });
  const r = op('R', 'renameNode', 'r', { mappings: [{ id: 'm1', from: '', to: '' }] });
  const t = op('T', 'transformNode', 't', { ops: [] });
  const fn = op('FN', 'functionNode', 'fn', { outputs: [] });
  expect(codes(collectIssues([f, r, t, fn], []))).toEqual(
    ['filter-empty', 'function-no-outputs', 'rename-empty', 'transform-empty']
  );
});

test('broken columns and inputs are reported as errors', () => {
  const d = df('D', 'd', [attr('d1', 'x', 'int', { broken: true })]);
  const gb = op('GB', 'groupByNode', 'gb', {
    inputs: [{ id: 'g1', attrName: 'x', sourceNodeId: 'Z', broken: true }],
    groupByInputIds: ['g1'], aggregations: [],
  });
  const found = collectIssues([d, gb], []);
  expect(codes(found)).toEqual(expect.arrayContaining(['broken-column', 'broken-input']));
  expect(found.every((i) => i.severity === 'error' || i.severity === 'warning')).toBe(true);
});

test('a dependency cycle is flagged on the participating nodes', () => {
  const a = df('A', 'a', [attr('a1', 'x', 'int')]);
  const b = df('B', 'b', [attr('b1', 'x', 'int')]);
  const issues = collectIssues([a, b], [dfEdge('A', 'B'), dfEdge('B', 'A')]);
  expect(issues.some((i) => i.code === 'cycle' && i.nodeId === 'A')).toBe(true);
  expect(issues.some((i) => i.code === 'cycle' && i.nodeId === 'B')).toBe(true);
});

test('issues carry the node label for display', () => {
  const m = op('M', 'mergeNode', 'my_merge', { keyPairs: [] });
  expect(collectIssues([m], [])[0].nodeLabel).toBe('my_merge');
});
