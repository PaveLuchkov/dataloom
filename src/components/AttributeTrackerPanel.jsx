import React, { useRef, useEffect } from 'react';

export default function AttributeTrackerPanel({ query, matchCount, onQueryChange, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      className="absolute z-40 flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl"
      style={{
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1c1917',
        border: '1px solid #a16207',
        minWidth: 320,
        pointerEvents: 'all',
      }}
    >
      <span className="text-amber-500 select-none" style={{ fontSize: 14 }}>◎</span>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        placeholder="Отслеживать атрибут по имени…"
        className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-600"
        style={{ minWidth: 200 }}
      />

      {query.trim() && (
        <span
          className="text-xs px-2 py-0.5 rounded-full select-none flex-shrink-0 font-mono"
          style={{
            background: matchCount > 0 ? 'rgba(161,98,7,0.35)' : 'rgba(71,85,105,0.4)',
            color: matchCount > 0 ? '#fbbf24' : '#64748b',
          }}
        >
          {matchCount} {matchCount === 1 ? 'нода' : matchCount >= 2 && matchCount <= 4 ? 'ноды' : 'нод'}
        </span>
      )}

      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="text-slate-600 hover:text-slate-400 text-sm select-none"
          title="Очистить"
        >
          ×
        </button>
      )}

      <div className="w-px self-stretch" style={{ background: '#334155' }} />

      <button
        onClick={onClose}
        title="Выйти из режима отслеживания (Esc)"
        className="text-slate-600 hover:text-amber-400 text-xs select-none px-0.5 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
