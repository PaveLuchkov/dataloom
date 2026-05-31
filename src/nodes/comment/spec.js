import config from './config';
import CommentNode from './index';
import { useCommentCallbacks } from './callbacks';

// Comment is a sticky note: no columns, no lineage, no companion. It exists in
// the spec registry purely so its callbacks compose with the rest and it shares
// the generic add/paste/delete machinery. It intentionally omits the lineage
// methods (outputs/traceUpstream/propagateDownstream) — the engine treats a type
// with no registered lineage as producing no columns.

const commentSpec = {
  type: config.type,
  minimapColor: config.minimapColor,
  dagre: { width: config.dagreWidth, height: config.dagreHeight },
  make: config.make,
  companion: false,
  connect: { acceptsColumns: false, dfLevel: config.connections },
  menu: config.menu,
  component: CommentNode,

  useCallbacks: ({ setNodes, pushHistory }) => useCommentCallbacks(setNodes, pushHistory),
};

export default commentSpec;
