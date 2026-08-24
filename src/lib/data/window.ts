// How far back published runs are kept (ADR-0004), collector-only.
export const WINDOW_DAYS = 1;

// How long a device keeps what it has already synced before evicting it
// (ADR-0011, value revised by ADR-0014). Independent of WINDOW_DAYS even
// though currently equal to it — the reel should look like the last 24h
// of the wire, not a multi-day archive.
export const RETENTION_DAYS = 1;
