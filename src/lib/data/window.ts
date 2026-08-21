// How far back published runs are kept (ADR-0004), collector-only.
export const WINDOW_DAYS = 1;

// How long a device keeps what it has already synced before evicting it
// (ADR-0011). Deliberately longer than, and independent of, WINDOW_DAYS —
// a reader's own history outlives what the collector currently publishes.
export const RETENTION_DAYS = 3;
