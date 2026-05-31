import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import AttrRow from './AttrRow';
import { useTrackedAttr } from './hooks/useTrackedAttr';

// Port renders a ReactFlow <Handle>, which needs the flow store. Stub it so the
// row can be unit-tested in isolation.
vi.mock('reactflow', () => ({
  Handle: ({ id }) => <div data-testid={`handle-${id}`} />,
  Position: { Left: 'left', Right: 'right' },
}));

const attr = (over = {}) => ({ id: 'a1', name: 'amount', type: 'int', ...over });

describe('AttrRow — healthy column', () => {
  test('renders the name and an interactive type badge', () => {
    const onTypeCycle = vi.fn();
    render(<AttrRow attr={attr()} onTypeCycle={onTypeCycle} />);
    expect(screen.getByText('amount')).toBeInTheDocument();
    fireEvent.click(screen.getByText('int'));
    expect(onTypeCycle).toHaveBeenCalledTimes(1);
  });

  test('shows the trace button only when onTrace is provided', () => {
    const { rerender } = render(<AttrRow attr={attr()} />);
    expect(screen.queryByText('◎')).toBeNull();
    rerender(<AttrRow attr={attr()} onTrace={vi.fn()} />);
    expect(screen.getByText('◎')).toBeInTheDocument();
  });

  test('delete button is hover-revealed (opacity-0) by default', () => {
    render(<AttrRow attr={attr()} onDelete={vi.fn()} />);
    expect(screen.getByText('×').className).toContain('opacity-0');
  });
});

describe('AttrRow — broken column', () => {
  const broken = attr({ broken: true });

  test('shows the "!" marker and strikes through the name', () => {
    render(<AttrRow attr={broken} />);
    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('amount').className).toContain('line-through');
  });

  test('hides the trace button and locks the type badge', () => {
    const onTypeCycle = vi.fn();
    render(<AttrRow attr={broken} onTrace={vi.fn()} onTypeCycle={onTypeCycle} />);
    expect(screen.queryByText('◎')).toBeNull();
    fireEvent.click(screen.getByText('int'));
    expect(onTypeCycle).not.toHaveBeenCalled();
  });

  test('delete button is always visible and works even on a companion DF', () => {
    const onDelete = vi.fn();
    render(<AttrRow attr={broken} readOnly onDelete={onDelete} />);
    const del = screen.getByText('×');
    expect(del.className).toContain('opacity-100');
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('AttrRow — readOnly (companion) healthy column', () => {
  test('hides the delete button when not broken', () => {
    render(<AttrRow attr={attr()} readOnly onDelete={vi.fn()} />);
    expect(screen.queryByText('×')).toBeNull();
  });
});

describe('useTrackedAttr', () => {
  test('substring match by default; exact match in wholeWord mode', () => {
    const { result: sub } = renderHook(() => useTrackedAttr({ query: 'amt' }));
    expect(sub.current('amt_total')).toBe(true);
    expect(sub.current('other')).toBe(false);

    const { result: whole } = renderHook(() => useTrackedAttr({ query: 'amt', wholeWord: true }));
    expect(whole.current('amt')).toBe(true);
    expect(whole.current('amt_total')).toBe(false);
  });

  test('no query → never tracked', () => {
    const { result } = renderHook(() => useTrackedAttr(undefined));
    expect(result.current('anything')).toBe(false);
  });
});
