import EditableText from '../EditableText';
import StageBadge from '../StageBadge';
import type { NodeTheme } from '../../theme';

// The node header chrome, previously rebuilt in every component: an optional type
// icon, the (optionally editable) label, an optional companion badge, the stage
// pill, the </> code toggle, an optional companion →●/→○ button, and an optional
// "+" add button. Driven by props so each spec opts into the parts it needs.

interface NodeHeaderProps {
  nodeId: string;
  label: string;
  theme: NodeTheme;
  onLabelChange?: (id: string, val: string) => void; // omit => label is read-only
  icon?: string;
  iconColor?: string;
  labelPlaceholder?: string;
  borderColorClass?: string;
  stage?: any;
  onStageChange?: (id: string, stage: any) => void;
  codeOpen?: boolean;
  onToggleCode?: () => void;
  /** ⊙ marker shown on operator-output (companion) DataFrames */
  companionBadge?: boolean;
  /** →●/→○ button to create the result companion DF */
  companion?: { companionId?: string; onCreate: (id: string) => void };
  /** "+" add-column button (DataFrame) */
  onAdd?: (id: string) => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function NodeHeader({
  nodeId, label, theme, onLabelChange, icon, iconColor, labelPlaceholder,
  borderColorClass, stage, onStageChange, codeOpen, onToggleCode,
  companionBadge, companion, onAdd,
}: NodeHeaderProps) {
  return (
    <div
      className="px-3 py-2 border-b flex items-center gap-2 cursor-grab active:cursor-grabbing"
      style={{ background: theme.header, borderColor: theme.border }}
    >
      {icon && (
        <span className="font-bold select-none flex-shrink-0" style={{ color: iconColor || theme.handleFill, fontSize: 13 }}>
          {icon}
        </span>
      )}

      <EditableText
        value={label}
        onChange={onLabelChange ? (val: string) => onLabelChange(nodeId, val) : undefined}
        className="text-white font-semibold text-sm flex-1"
        placeholder={labelPlaceholder}
        borderColorClass={borderColorClass}
      />

      {companionBadge && (
        <span className="select-none flex-shrink-0" style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
          ⊙
        </span>
      )}

      {onStageChange && <StageBadge nodeId={nodeId} stage={stage} onStageChange={onStageChange} />}

      {onToggleCode && (
        <button
          onClick={(e) => { stop(e); onToggleCode(); }}
          onMouseDown={stop}
          title="Toggle code snippet"
          className="flex-shrink-0 select-none transition-opacity hover:opacity-100 font-mono"
          style={{ fontSize: 10, color: theme.handleFill, opacity: codeOpen ? 1 : 0.4 }}
        >
          {codeOpen ? '[/]' : '</>'}
        </button>
      )}

      {companion && (
        <button
          onClick={(e) => { stop(e); if (!companion.companionId) companion.onCreate(nodeId); }}
          onMouseDown={stop}
          title={companion.companionId ? 'Output companion exists' : 'Create output DataFrame'}
          className="flex-shrink-0 select-none text-xs font-mono transition-colors"
          style={{ color: companion.companionId ? theme.handleFill : '#475569' }}
        >
          {companion.companionId ? '→●' : '→○'}
        </button>
      )}

      {onAdd && (
        <button
          onClick={(e) => { stop(e); onAdd(nodeId); }}
          onMouseDown={stop}
          className="text-blue-300 hover:text-white text-xs font-bold leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-blue-700 transition-colors flex-shrink-0"
          title="Add attribute"
        >
          +
        </button>
      )}
    </div>
  );
}
