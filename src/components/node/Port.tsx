import { Handle, Position } from 'reactflow';

// Unifies the styled ReactFlow <Handle> geometry that was hand-written at every
// call site. Two variants:
//   'node'   — the square df-in/df-out handle pinned at top:14
//   'column' — the per-row dot at vertical center (left target / right source)
// Omit fill/border on a column port to get the bare default-styled dot that the
// DataFrame columns use; pass them for the colored GroupBy/Function input dots.

interface PortProps {
  type: 'source' | 'target';
  side: 'left' | 'right';
  id: string;
  variant?: 'node' | 'column';
  fill?: string;
  border?: string;
}

const SIDE = { left: Position.Left, right: Position.Right } as const;

export default function Port({ type, side, id, variant = 'column', fill, border }: PortProps) {
  if (variant === 'node') {
    return (
      <Handle
        type={type}
        id={id}
        position={SIDE[side]}
        style={{ top: 14, background: fill, border: `2px solid ${border}`, width: 8, height: 8, borderRadius: 2 }}
      />
    );
  }

  const style: React.CSSProperties = {
    [side]: -5,
    top: '50%',
    transform: 'translateY(-50%)',
    position: 'absolute',
  };
  if (fill) {
    style.background = fill;
    style.border = `2px solid ${border}`;
    style.width = 8;
    style.height = 8;
  }
  return <Handle type={type} id={id} position={SIDE[side]} style={style} />;
}
