import { useCallback } from 'react';
import { useDrag } from '../../DragContext';
import { DRAG_TYPE } from '../../../constants';

// Starting a column drag (to copy a column / wire lineage) was copy-pasted as
// onAttrDragStart / onOutputDragStart across DataFrame, GroupBy and Function.

export interface DragPayload {
  sourceNodeId: string;
  attrId: string;
  attrName: string;
  attrType: string;
  sourceNodeLabel?: string;
}

export function useDragSource(nodeId: string, label?: string) {
  const dragRef = useDrag();

  const startDrag = useCallback(
    (e: React.DragEvent, item: { attrId: string; attrName: string; attrType: string }) => {
      e.stopPropagation();
      const drag: DragPayload = { sourceNodeId: nodeId, sourceNodeLabel: label, ...item };
      dragRef.current = drag;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag));
    },
    [nodeId, label, dragRef]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, [dragRef]);

  return { startDrag, endDrag };
}
