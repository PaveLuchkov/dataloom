import React from 'react';
import EditableText from '../EditableText';
import Port from './Port';
import TypeBadge from './TypeBadge';
import { BROKEN_META } from '../../theme';
import type { Attr } from '../../nodes/types';

// A DataFrame column row: target/source dots, leading marker, type badge,
// editable name, and trace/delete actions. The broken-state treatment (red tint,
// "!" marker, strikethrough, always-visible ×, locked editing) lives here only —
// it was previously copy-pasted into dataframe/function/groupby with drift.
//
// Reorder/copy drag is owned by the parent and passed through via `rowHandlers`,
// because the insert-index logic is specific to the DataFrame node.

interface AttrRowProps {
  attr: Attr;
  tracked?: boolean;
  tracing?: boolean;
  /** companion DF: name + type are read-only, no manual delete (unless broken) */
  readOnly?: boolean;
  draggable?: boolean;
  rowHandlers?: React.HTMLAttributes<HTMLDivElement>;
  onTypeCycle?: () => void;
  onRename?: (val: string) => void;
  onTrace?: () => void;
  onDelete?: () => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function AttrRow({
  attr, tracked, tracing, readOnly, draggable, rowHandlers,
  onTypeCycle, onRename, onTrace, onDelete,
}: AttrRowProps) {
  const broken = !!attr.broken;
  const locked = readOnly || broken;

  const background = broken
    ? BROKEN_META.rowBg
    : tracing ? 'rgba(6,182,212,0.12)' : tracked ? 'rgba(245,158,11,0.08)' : undefined;

  const nameClass = broken
    ? 'text-red-400 text-xs flex-1 line-through'
    : tracing ? 'text-cyan-300 text-xs flex-1 font-bold'
    : tracked ? 'text-amber-300 text-xs flex-1 font-bold'
    : 'text-blue-100 text-xs flex-1';

  return (
    <div
      draggable={draggable}
      {...rowHandlers}
      className="relative flex items-center group hover:bg-blue-900/30 transition-colors cursor-grab active:cursor-grabbing"
      style={{ paddingLeft: 14, paddingRight: 14, minHeight: 28, background }}
    >
      <Port type="target" side="left" id={`${attr.id}-target`} />

      {broken
        ? <span className="mr-1.5 text-xs select-none flex-shrink-0" style={{ color: BROKEN_META.marker }}>!</span>
        : <span className="text-blue-600 mr-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity select-none">⠿</span>}

      <TypeBadge type={attr.type || 'string'} onClick={locked ? undefined : (e) => { e.stopPropagation(); onTypeCycle?.(); }} />

      <EditableText
        value={attr.name}
        onChange={locked ? undefined : onRename}
        className={nameClass}
        placeholder="column"
      />

      {onTrace && !broken && (
        <button
          onClick={(e) => { stop(e); onTrace(); }}
          onMouseDown={stop}
          title={`Trace: ${attr.name}`}
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center"
          style={{ color: tracing ? '#06b6d4' : '#475569', fontSize: 10 }}
        >
          ◎
        </button>
      )}

      {(!readOnly || broken) && (
        <button
          onClick={(e) => { stop(e); onDelete?.(); }}
          onMouseDown={stop}
          className={`ml-1 text-red-400 hover:text-red-300 text-xs w-4 h-4 flex items-center justify-center transition-opacity ${broken ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          title={broken ? 'Remove broken column' : 'Delete attribute'}
        >
          ×
        </button>
      )}

      <Port type="source" side="right" id={`${attr.id}-source`} />
    </div>
  );
}
