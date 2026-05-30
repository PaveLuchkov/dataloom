import { renderHook, act } from '@testing-library/react';
import { useLineagePersistence } from './useLineagePersistence';

// Exercises the full share-link path: deflate → URL-safe base64 → inflate.
// encodeState/decodeState are module-private, so we round-trip through the
// public copyShareUrl → loadFromUrlHash surface, the way the app actually uses it.

const NODES = [
  {
    id: '1', type: 'dataFrameNode', position: { x: 12, y: 34 },
    data: { label: 'orders', attributes: [{ id: 'a1', name: 'order_id', type: 'int' }] },
  },
];
const EDGES = [{ id: 'e1', source: '1', sourceHandle: 'df-out', target: '2', targetHandle: 'df-in' }];

beforeEach(() => {
  window.location.hash = '';
});

test('share URL round-trips nodes and edges intact', () => {
  let captured;
  Object.assign(navigator, { clipboard: { writeText: (t) => { captured = t; return Promise.resolve(); } } });

  const restoreState = jest.fn();
  const showToast = jest.fn();

  const { result: writer } = renderHook(() =>
    useLineagePersistence({ nodes: NODES, edges: EDGES, restoreState, showToast })
  );
  act(() => { writer.current.copyShareUrl(); });

  expect(captured).toContain('#');
  const hash = captured.split('#')[1];
  expect(hash.length).toBeGreaterThan(0);

  // Simulate a fresh session opening the link.
  window.location.hash = `#${hash}`;
  const { result: reader } = renderHook(() =>
    useLineagePersistence({ nodes: [], edges: [], restoreState, showToast })
  );
  let ok;
  act(() => { ok = reader.current.loadFromUrlHash(); });

  expect(ok).toBe(true);
  expect(restoreState).toHaveBeenCalledWith(NODES, EDGES);
});

test('loadFromUrlHash returns false and warns on a corrupt hash', () => {
  const restoreState = jest.fn();
  const showToast = jest.fn();
  window.location.hash = '#not-valid-base64-deflate';
  const { result } = renderHook(() =>
    useLineagePersistence({ nodes: [], edges: [], restoreState, showToast })
  );
  let ok;
  act(() => { ok = result.current.loadFromUrlHash(); });
  expect(ok).toBe(false);
  expect(restoreState).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith('Invalid share link');
});

test('loadFromUrlHash is a no-op when there is no hash', () => {
  const restoreState = jest.fn();
  const { result } = renderHook(() =>
    useLineagePersistence({ nodes: [], edges: [], restoreState, showToast: jest.fn() })
  );
  let ok;
  act(() => { ok = result.current.loadFromUrlHash(); });
  expect(ok).toBe(false);
  expect(restoreState).not.toHaveBeenCalled();
});
