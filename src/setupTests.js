// jest-dom adds custom matchers for asserting on DOM nodes
// (e.g. expect(el).toHaveTextContent(/react/i)).
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Compatibility shim: existing tests call jest.fn(); map the `jest` global to
// Vitest's `vi` so they run unchanged under the new runner.
globalThis.jest = vi;
