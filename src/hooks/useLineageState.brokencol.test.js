import { renderHook, act } from '@testing-library/react';
import '../nodes/specs'; // register migrated node specs with the lineage engine (mirrors src/index.jsx)
import { useLineageState } from './useLineageState';

// Pins the broken-column / auto-heal / companion behavior that Phase 6 will
// rewrite. Drives the hook through its public surface: restoreState() to seed a
// graph, onKeyDown(Delete) to trigger deletion, and result.current.nodes to read
// the outcome after the coupled effects settle.

beforeEach(() => localStorage.clear());

const attr = (id, name, type = 'string', extra = {}) => ({ id, name, type, ...extra });
const df = (id, label, attributes, dataExtra = {}) => ({
  id, type: 'dataFrameNode', position: { x: 0, y: 0 }, data: { label, attributes, ...dataExtra },
});
const op = (id, type, label, data = {}) => ({
  id, type, position: { x: 0, y: 0 }, data: { label, ...data },
});
const dfEdge = (source, target, extra = {}) => ({
  id: `e-${source}-${target}`, source, target, sourceHandle: 'df-out', targetHandle: 'df-in', ...extra,
});
const colEdge = (source, srcAttrId, target, tgtAttrId) => ({
  id: `c-${source}-${target}`, source, sourceHandle: `${srcAttrId}-source`, target, targetHandle: `${tgtAttrId}-target`,
});

const pressDelete = (result) =>
  act(() => {
    result.current.onKeyDown({ key: 'Delete', target: { tagName: 'DIV' }, preventDefault() {} });
  });

const seed = (result, nodes, edges) =>
  act(() => { result.current.restoreState(nodes, edges); });

const byId = (result, id) => result.current.nodes.find((n) => n.id === id);

test('deleting an operator marks ALL columns of its df-out target DF broken', () => {
  const { result } = renderHook(() => useLineageState());
  const f = { ...op('F', 'filterNode', 'f'), selected: true };
  const r = df('R', 'result', [attr('r1', 'a', 'int'), attr('r2', 'b')]);
  seed(result, [f, r], [dfEdge('F', 'R')]);

  pressDelete(result);

  expect(byId(result, 'F')).toBeUndefined();           // operator removed
  const target = byId(result, 'R');
  expect(target).toBeDefined();                          // target DF survives
  expect(target.data.attributes.every((a) => a.broken === true)).toBe(true);
});

test('deleting a source DF breaks only the specific downstream attrs wired by column edges', () => {
  const { result } = renderHook(() => useLineageState());
  const a = { ...df('A', 'src', [attr('a1', 'x', 'int')]), selected: true };
  const r = df('R', 'result', [attr('r1', 'x', 'int'), attr('r2', 'untouched')]);
  seed(result, [a, r], [colEdge('A', 'a1', 'R', 'r1')]);

  pressDelete(result);

  const target = byId(result, 'R');
  expect(target.data.attributes.find((a) => a.id === 'r1').broken).toBe(true);
  expect(target.data.attributes.find((a) => a.id === 'r2').broken).toBeFalsy();
});

test('deleting a node breaks GroupBy/Function inputs that referenced it', () => {
  const { result } = renderHook(() => useLineageState());
  const a = { ...df('A', 'src', [attr('a1', 'amt', 'float')]), selected: true };
  const gb = op('GB', 'groupByNode', 'gb', {
    inputs: [{ id: 'g1', attrName: 'amt', attrType: 'float', sourceNodeId: 'A' }],
    groupByInputIds: [], aggregations: [],
  });
  seed(result, [a, gb], []);

  pressDelete(result);

  const input = byId(result, 'GB').data.inputs.find((i) => i.id === 'g1');
  expect(input.broken).toBe(true);
});

test('deleting an operator orphans its companion DF: columns broken, _companionOf cleared, DF kept', () => {
  const { result } = renderHook(() => useLineageState());
  const f = { ...op('F', 'filterNode', 'f', { companionId: 'C' }), selected: true };
  const companion = df('C', 'output', [attr('c1', 'a', 'int')], { _companionOf: 'F' });
  seed(result, [f, companion], [{ ...dfEdge('F', 'C'), data: { isCompanionEdge: true } }]);

  pressDelete(result);

  const c = byId(result, 'C');
  expect(c).toBeDefined();
  expect(c.data._companionOf).toBeUndefined();
  expect(c.data.attributes.every((a) => a.broken === true)).toBe(true);
});

test('auto-heal: a broken column whose name reappears upstream is restored with the live type', () => {
  const { result } = renderHook(() => useLineageState());
  // A(x:int) -> Filter F -> R, where R.x is currently broken. The effect should heal it.
  const a = df('A', 'src', [attr('a1', 'x', 'int')]);
  const f = op('F', 'filterNode', 'f');
  const r = df('R', 'result', [attr('r1', 'x', 'string', { broken: true })]);
  seed(result, [a, f, r], [dfEdge('A', 'F'), dfEdge('F', 'R')]);

  const healed = byId(result, 'R').data.attributes.find((a) => a.name === 'x');
  expect(healed.broken).toBe(false);
  expect(healed.type).toBe('int'); // type updated from live upstream
});

test('auto-heal does not fire when no upstream provides the column', () => {
  const { result } = renderHook(() => useLineageState());
  const r = df('R', 'result', [attr('r1', 'x', 'int', { broken: true })]);
  seed(result, [r], []);
  expect(byId(result, 'R').data.attributes[0].broken).toBe(true);
});
