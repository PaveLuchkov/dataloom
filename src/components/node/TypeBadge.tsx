import { ATTR_TYPE_META } from '../../theme';

// The little str/int/flt/dat/bool pill. Previously redefined locally in DataFrame
// and GroupBy (with drifting margins). When `onClick` is supplied the badge is
// interactive (DataFrame cycles the column type); otherwise it is display-only.

interface TypeBadgeProps {
  type?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function TypeBadge({ type = 'string', onClick }: TypeBadgeProps) {
  const meta = ATTR_TYPE_META[type] || ATTR_TYPE_META.string;
  return (
    <span
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      title={onClick ? `Type: ${type} — click to change` : `Type: ${type}`}
      className={`mr-1.5 rounded select-none flex-shrink-0 transition-opacity ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        fontSize: 9,
        lineHeight: '14px',
        padding: '0 4px',
        color: meta.color,
        background: meta.bg,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {meta.abbr}
    </span>
  );
}
