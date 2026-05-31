import { renderHook, act } from '@testing-library/react';
import '../nodes/specs'; // register migrated node specs with the lineage engine (mirrors src/index.jsx)
import { useLineageState } from './useLineageState';

// Pins the behaviors that Phase 6 moved off hardcoded node.type checks and onto
// the spec registry: generic paste-clone (spec.clone), companion auto-spawn
// (spec.companion), the mergeable selection set (spec.mergeable), and the
// scoped delete-break writes (code-review fix — operators don't get a fabricated
// empty `attributes` array).

beforeEach(() => localStorage.clear());

const attr = (id, name, type = 'string', extra = {}) => ({ id, name, type, ...extra });
const df = (id, label, attributes, dataExtra = {}) => ({
  id, type: 'dataFrameNode', position: { x: 0, y: 0 }, data: { label, attributes, ...dataExtra },
});
const op = (id, type, label, data = {}) => ({
  id, type, position: { x: 0, y: 0 }, data: { label, ...data },
});

const seed = (result, nodes, edges = []) =>
  act(() => { result.current.restoreState(nodes, edges); });
const byId = (result, id) => result.current.nodes.find((n) => n.id === id);
const press = (result, init) =>
  act(() => { result.current.onKeyDown({ target: { tagName: 'DIV' }, preventDefault() {}, ...init }); });

// ── Paste-clone (spec.clone) ─────────────────────────────────────────────────

test('paste clones a DataFrame with fresh attribute ids and no companionId', () => {
  const { result } = renderHook(() => useLineageState());
  seed(result, [{ ...df('A', 'src', [attr('a1', 'x', 'int'), attr('a2', 'y')], { companionId: 'ZZZ' }), selected: true }]);

  press(result, { ctrlKey: true, key: 'c' });
  press(result, { ctrlKey: true, key: 'd' });

  expect(result.current.nodes).toHaveLength(2);
  const clone = result.current.nodes.find((n) => n.id !== 'A');
  expect(clone.data.label).toBe('src');
  expect(clone.data.attributes.map((a) => a.name)).toEqual(['x', 'y']);
  // fresh ids, not shared with the original's handles
  expect(clone.data.attributes.map((a) => a.id)).not.toEqual(['a1', 'a2']);
  expect(clone.data.companionId).toBeUndefined();
});

test('paste clones GroupBy inputs and remaps groupByInputIds to the new ids', () => {
  const { result } = renderHook(() => useLineageState());
  const gb = op('GB', 'groupByNode', 'gb', {
    inputs: [{ id: 'g1', attrName: 'amt', attrType: 'float', sourceNodeId: 'A' }],
    groupByInputIds: ['g1'],
    aggregations: [{ id: 'agg1', inputId: 'g1', func: 'sum', outputName: 'total' }],
  });
  seed(result, [{ ...gb, selected: true }]);

  press(result, { ctrlKey: true, key: 'c' });
  press(result, { ctrlKey: true, key: 'd' });

  const clone = result.current.nodes.find((n) => n.id !== 'GB');
  const newInputId = clone.data.inputs[0].id;
  expect(newInputId).not.toBe('g1');
  expect(clone.data.groupByInputIds).toEqual([newInputId]);
  expect(clone.data.aggregations[0].inputId).toBe(newInputId);
});

// ── Companion auto-spawn (spec.companion) ────────────────────────────────────

test('adding a companion-producing operator (groupBy) auto-spawns a result DataFrame', () => {
  const { result } = renderHook(() => useLineageState());
  seed(result, []);
  act(() => { result.current.addNodeOfType('groupByNode', 100, 100); });

  const operator = result.current.nodes.find((n) => n.type === 'groupByNode');
  const companion = result.current.nodes.find((n) => n.data._companionOf === operator.id);
  expect(companion).toBeDefined();
  expect(operator.data.companionId).toBe(companion.id);
});

test('adding a non-companion node (filter) does not spawn a companion DataFrame', () => {
  const { result } = renderHook(() => useLineageState());
  seed(result, []);
  act(() => { result.current.addNodeOfType('filterNode', 100, 100); });

  expect(result.current.nodes).toHaveLength(1);
  expect(result.current.nodes[0].data.companionId).toBeUndefined();
});

// ── mergeable selection set (spec.mergeable) ─────────────────────────────────

test('selectedDFs includes DataFrame and Merge nodes but not other operators', () => {
  const { result } = renderHook(() => useLineageState());
  seed(result, [
    { ...df('A', 'a', []), selected: true },
    { ...op('M', 'mergeNode', 'm'), selected: true },
    { ...op('F', 'filterNode', 'f'), selected: true },
  ]);
  expect(result.current.selectedDFs.map((n) => n.id).sort()).toEqual(['A', 'M']);
});

// ── Delete-break scoping (code-review fix) ───────────────────────────────────

test('breaking a GroupBy input on delete does not fabricate an attributes array on it', () => {
  const { result } = renderHook(() => useLineageState());
  const a = { ...df('A', 'src', [attr('a1', 'amt', 'float')]), selected: true };
  const gb = op('GB', 'groupByNode', 'gb', {
    inputs: [{ id: 'g1', attrName: 'amt', attrType: 'float', sourceNodeId: 'A' }],
    groupByInputIds: [], aggregations: [],
  });
  seed(result, [a, gb], []);

  press(result, { key: 'Delete' });

  const node = byId(result, 'GB');
  expect(node.data.inputs.find((i) => i.id === 'g1').broken).toBe(true);
  // The operator never owned columns, so the delete pass must not add one.
  expect(node.data.attributes).toBeUndefined();
});
