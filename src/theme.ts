// Centralized design tokens. Today each nodes/<type>/config.js carries its own
// ad-hoc `colors` object with drifting key names (dataframe uses handleFill,
// merge uses handleLeft/handleRight). This is the single source of truth the
// schema-driven nodes read via `spec.theme`, plus the one home for the broken
// state styling that is currently copy-pasted across three node components.

import { ATTR_TYPES, ATTR_TYPE_META } from './constants';

export { ATTR_TYPES, ATTR_TYPE_META };

export type ThemeKey =
  | 'dataframe' | 'merge' | 'function' | 'filter'
  | 'groupby' | 'rename' | 'concat' | 'transform';

export interface NodeTheme {
  bg: string;
  header: string;
  border: string;
  handleFill: string;
  handleBorder: string;
  minimap: string;
  /** Merge draws two distinct input handles; falls back to handleFill otherwise. */
  handleLeft?: string;
  handleRight?: string;
}

export const THEMES: Record<ThemeKey, NodeTheme> = {
  dataframe: { bg: '#0f2744', header: '#1a3a5c', border: '#1e4d8c', handleFill: '#0d9488', handleBorder: '#042f2e', minimap: '#1a3a5c' },
  merge:     { bg: '#160d2e', header: '#2e1065', border: '#4c1d95', handleFill: '#7c3aed', handleBorder: '#2e1065', minimap: '#2e1065', handleLeft: '#7c3aed', handleRight: '#9333ea' },
  function:  { bg: '#052e16', header: '#14532d', border: '#166534', handleFill: '#10b981', handleBorder: '#052e16', minimap: '#052e16' },
  filter:    { bg: '#1c0902', header: '#431407', border: '#9a3412', handleFill: '#fb923c', handleBorder: '#1c0902', minimap: '#431407' },
  groupby:   { bg: '#031d2e', header: '#0c3148', border: '#164e63', handleFill: '#0ea5e9', handleBorder: '#031d2e', minimap: '#0c3148' },
  rename:    { bg: '#1a1040', header: '#2d1b6e', border: '#4f35b0', handleFill: '#818cf8', handleBorder: '#1a1040', minimap: '#2d1b6e' },
  concat:    { bg: '#1f0814', header: '#4c0519', border: '#9f1239', handleFill: '#fb7185', handleBorder: '#1f0814', minimap: '#4c0519' },
  transform: { bg: '#1c0e02', header: '#7c2d12', border: '#ea580c', handleFill: '#f97316', handleBorder: '#1c0e02', minimap: '#7c2d12' },
};

// The broken-column / broken-input visual treatment. Previously duplicated, with
// drift, across dataframe/function/groupby node components — now defined once.
export const BROKEN_META = {
  /** row background tint */
  rowBg: 'rgba(239,68,68,0.08)',
  /** the leading "!" marker + struck-through column name */
  marker: '#f87171',
  text: '#f87171',
  /** the target handle dot color for a broken input */
  handle: '#ef4444',
} as const;
