import { useState, useCallback } from 'react';
import { useDrag } from '../../DragContext';
import { DRAG_TYPE } from '../../../constants';
import type { DragPayload } from './useDragSource';

// The "drop a column here" zone behavior shared by GroupBy and Function inputs
// (and the DataFrame node-level drop). Returns the dropOver flag for styling and
// the three drag handlers to spread onto the drop target. A drop whose payload
// originates from this same node is ignored.

export function useDropZone(nodeId: string, onDropPayload: (payload: DragPayload) => void) {
  const dragRef = useDrag();
  const [dropOver, setDropOver] = useState(false);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      if (dragRef.current?.sourceNodeId === nodeId) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setDropOver(true);
    },
    [nodeId, dragRef]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropOver(false);
      const raw = e.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;
      const payload: DragPayload = JSON.parse(raw);
      if (payload.sourceNodeId === nodeId) return;
      onDropPayload(payload);
    },
    [nodeId, onDropPayload]
  );

  return { dropOver, dragHandlers: { onDragOver, onDragLeave, onDrop } };
}
