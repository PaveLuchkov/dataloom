import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from './ContextMenu';

const paneMenu = { x: 100, y: 200, type: 'pane', flowX: 100, flowY: 200 };
const nodeMenu = { x: 50, y: 60, type: 'node', nodeId: 'n1', nodeType: 'dataFrameNode' };

// The menu renders one entry per addableNodes item as "{icon} Add {label} here".
const addableNodes = [
  { type: 'dataFrameNode', label: 'DataFrame', icon: '+' },
  { type: 'functionNode', label: 'Function', icon: 'ƒ' },
];

test('renders nothing when menu is null', () => {
  const { container } = render(<ContextMenu menu={null} />);
  expect(container.firstChild).toBeNull();
});

test('shows pane options for each addable node', () => {
  render(<ContextMenu menu={paneMenu} addableNodes={addableNodes} onAddNode={jest.fn()} canMerge={false} />);
  expect(screen.getByText(/Add DataFrame/)).toBeInTheDocument();
  expect(screen.getByText(/Add Function/)).toBeInTheDocument();
});

test('hides merge option when canMerge is false', () => {
  render(<ContextMenu menu={paneMenu} addableNodes={addableNodes} canMerge={false} />);
  expect(screen.queryByText(/Merge selected/)).toBeNull();
});

test('shows merge option when canMerge is true', () => {
  render(<ContextMenu menu={paneMenu} addableNodes={addableNodes} canMerge={true} onMerge={jest.fn()} />);
  expect(screen.getByText(/Merge selected/)).toBeInTheDocument();
});

test('calls onAddNode with the node type when clicked', () => {
  const onAddNode = jest.fn();
  render(<ContextMenu menu={paneMenu} addableNodes={addableNodes} onAddNode={onAddNode} canMerge={false} />);
  fireEvent.click(screen.getByText(/Add DataFrame/));
  expect(onAddNode).toHaveBeenCalledWith('dataFrameNode');
});

test('shows delete with the DataFrame display name', () => {
  render(<ContextMenu menu={nodeMenu} onDelete={jest.fn()} />);
  expect(screen.getByText('Delete DataFrame')).toBeInTheDocument();
});

// NOTE: mergeNode has no `menu` in its config, so getNodeDisplayName falls back
// to the raw type string — hence "Delete mergeNode". Pinned as current behavior.
test('falls back to the raw type name for a node without a menu label', () => {
  render(<ContextMenu menu={{ ...nodeMenu, nodeType: 'mergeNode' }} onDelete={jest.fn()} />);
  expect(screen.getByText('Delete mergeNode')).toBeInTheDocument();
});

test('calls onDelete when the delete button is clicked', () => {
  const onDelete = jest.fn();
  render(<ContextMenu menu={nodeMenu} onDelete={onDelete} />);
  fireEvent.click(screen.getByText('Delete DataFrame'));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
