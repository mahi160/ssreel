// Shared between the client (src/lib/data/sync.ts, db.ts) and the service
// worker, which cache/evict the same immutable run files and images
// (ADR-0009). Kept in its own file since the service worker can't import
// anything that pulls in DOM-only code.
export const IMMUTABLE_CACHE = 'ssreel-immutable';
export const DATA_CACHE = 'ssreel-data';
