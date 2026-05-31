import '../nodes/specs'; // register specs so generatePandas can dispatch toPandas
import { generatePandas } from './exportPandas';

const attr = (id, name, type = 'string') => ({ id, name, type });
const df = (id, label, attributes, data = {}) => ({ id, type: 'dataFrameNode', position: { x: 0, y: 0 }, data: { label, attributes, ...data } });
const op = (id, type, label, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...data } });
const dfEdge = (s, sh, t, th) => ({ id: `e-${s}-${t}-${th}`, source: s, sourceHandle: sh, target: t, targetHandle: th });

test('emits an import header and a source-table declaration', () => {
  const a = df('A', 'raw_orders', [attr('a1', 'id', 'int'), attr('a2', 'amount', 'float')]);
  const code = generatePandas([a], []);
  expect(code).toMatch(/^import pandas as pd/);
  expect(code).toContain("raw_orders = pd.DataFrame(columns=['id', 'amount'])");
});

test('a filter → companion chain emits a topologically ordered query', () => {
  const a = df('A', 'orders', [attr('a1', 'amount', 'float')]);
  const f = op('F', 'filterNode', 'big', { companionId: 'C', conditions: [{ id: 'c1', op: 'WHERE', expr: '@amount > 100' }] });
  const c = df('C', 'big_orders', [attr('c1', 'amount', 'float')], { _companionOf: 'F' });
  const edges = [
    dfEdge('A', 'df-out', 'F', 'df-in'),
    dfEdge('F', 'df-out', 'C', 'df-in'), // companion edge
  ];
  const code = generatePandas([a, f, c], edges);
  // source before filter
  expect(code.indexOf('orders = pd.DataFrame')).toBeLessThan(code.indexOf('.query('));
  expect(code).toContain('big = orders.query("(amount > 100)")');
  // companion DF is aliased to the operator var, not re-emitted
  expect(code).not.toContain('big_orders =');
});

test('merge emits pd.merge with left_on/right_on from key pairs', () => {
  const l = df('L', 'left', [attr('l1', 'k')]);
  const r = df('R', 'right', [attr('r1', 'k')]);
  const m = op('M', 'mergeNode', 'joined', { joinType: 'left', keyPairs: [{ left: 'k', right: 'k' }] });
  const edges = [dfEdge('L', 'df-out', 'M', 'left-in'), dfEdge('R', 'df-out', 'M', 'right-in')];
  const code = generatePandas([l, r, m], edges);
  expect(code).toContain("joined = pd.merge(left, right, how='left', left_on=['k'], right_on=['k'])");
});

test('groupby emits a named aggregation', () => {
  const a = df('A', 'sales', [attr('a1', 'region'), attr('a2', 'amt', 'float')]);
  const gb = op('GB', 'groupByNode', 'by_region', {
    inputs: [
      { id: 'g1', attrName: 'region', attrType: 'string', sourceNodeId: 'A' },
      { id: 'g2', attrName: 'amt', attrType: 'float', sourceNodeId: 'A' },
    ],
    groupByInputIds: ['g1'],
    aggregations: [{ id: 'agg1', inputId: 'g2', func: 'sum', outputName: 'total' }],
  });
  const code = generatePandas([a, gb], []);
  expect(code).toContain("by_region = sales.groupby(['region'], as_index=False).agg(total=('amt', 'sum'))");
});

test("a node's own code field overrides its generated snippet", () => {
  const a = df('A', 'src', [attr('a1', 'x')], { code: 'src = pd.read_csv("data.csv")' });
  const code = generatePandas([a], []);
  expect(code).toContain('src = pd.read_csv("data.csv")');
  expect(code).not.toContain('pd.DataFrame(columns');
});

test('duplicate labels get unique variable names', () => {
  const a = df('A', 'df', [attr('a1', 'x')]);
  const b = df('B', 'df', [attr('b1', 'y')]);
  const code = generatePandas([a, b], []);
  expect(code).toContain('df = pd.DataFrame');
  expect(code).toContain('df_1 = pd.DataFrame');
});
