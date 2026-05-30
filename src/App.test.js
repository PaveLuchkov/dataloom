import { render, screen } from '@testing-library/react';
import App from './App';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Smoke test: the toolbar renders. Buttons are now icon-only with tooltip
// labels (Tip), so we assert on the tooltip text rather than button captions.
test('renders toolbar tooltips', () => {
  render(<App />);
  expect(screen.getByText('Add DataFrame')).toBeInTheDocument();
  expect(screen.getByText('Save canvas')).toBeInTheDocument();
  expect(screen.getByText('Export PNG')).toBeInTheDocument();
});
