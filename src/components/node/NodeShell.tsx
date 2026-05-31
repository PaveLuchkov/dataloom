import React from 'react';
import NodeCodeBlock from '../NodeCodeBlock';
import Port from './Port';
import type { NodeTheme } from '../../theme';

// The outer node frame: rounded bg/border, the df-in/df-out node handles, an
// optional external-drop highlight, and the collapsible code block. Each node
// component wraps its body in <NodeShell> instead of re-declaring this chrome.

interface NodeShellProps {
  nodeId: string;
  theme: NodeTheme;
  minWidth?: number;
  /** blue ring shown while a column is dragged over (DataFrame drop-to-add) */
  dragOver?: boolean;
  showIn?: boolean;
  showOut?: boolean;
  containerHandlers?: React.HTMLAttributes<HTMLDivElement>;
  code?: string;
  codeOpen?: boolean;
  onCodeChange?: (id: string, code: string) => void;
  children: React.ReactNode;
}

export default function NodeShell({
  nodeId, theme, minWidth = 200, dragOver, showIn = true, showOut = true,
  containerHandlers, code, codeOpen, onCodeChange, children,
}: NodeShellProps) {
  return (
    <div
      className="rounded-lg overflow-visible shadow-xl transition-all"
      style={{
        background: theme.bg,
        minWidth,
        border: dragOver ? '2px solid #60a5fa' : `1px solid ${theme.border}`,
        boxShadow: dragOver ? '0 0 0 3px rgba(96,165,250,0.25)' : undefined,
      }}
      onContextMenu={(e) => e.stopPropagation()}
      {...containerHandlers}
    >
      {showIn && <Port variant="node" type="target" side="left" id="df-in" fill={theme.handleFill} border={theme.handleBorder} />}
      {showOut && <Port variant="node" type="source" side="right" id="df-out" fill={theme.handleFill} border={theme.handleBorder} />}

      {children}

      {codeOpen && (
        <NodeCodeBlock nodeId={nodeId} code={code} onCodeChange={onCodeChange} borderColor={theme.border} />
      )}
    </div>
  );
}
