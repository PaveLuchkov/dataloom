// Lightweight, React-free registry that lets the lineage engine
// (utils/nodeOutputAttrs.js) dispatch a node type's column logic to its spec
// instead of a hardcoded switch case. Specs register here (via nodes/specs.js)
// as they are migrated; unregistered types fall back to the engine's switch, so
// the migration is incremental and the engine never imports React/components.

const lineageByType = new Map();

export function registerLineage(type, methods) {
  lineageByType.set(type, methods);
}

export function getLineage(type) {
  return lineageByType.get(type);
}
