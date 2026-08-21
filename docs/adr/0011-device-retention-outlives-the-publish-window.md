# Device retention is decoupled from the publish window, and evicts uniformly

ADR-0004 and ADR-0009 both describe devices as keeping whatever they've
already synced, forever, regardless of the publish window. The code never
actually matched that: `sync.ts` already calls `pruneRunsBefore(cutoff)` on
every sync, evicting IndexedDB articles and their cached images
(`evictRun`) once `publishedAt` is older than `WINDOW_DAYS` — the _same_
constant the collector uses to prune its own published output. The
"devices keep everything" claim was already stale docs, not the shape of
the code.

The publish window is shrinking to one day (the collector will only ever
serve the last day of runs, images and feed entries). Rather than shrink
the device to match, its retention becomes a second, independent constant —
three days — so a reader's own history outlives what the server currently
publishes. `sync.ts`'s cutoff switches from `WINDOW_DAYS` to a new
`RETENTION_DAYS`; the collector's `WINDOW_DAYS` stays collector-only.

Eviction stays uniform by publish time, not state-aware: an unread article a
reader never reached is purged at the same three-day mark as a read or
hidden one. Kept as-is because it needs no per-state query, and a
three-day-old unread article is functionally the same "stale news" the
shorter publish window already treats it as.

## Consequences

- `CONTEXT.md`'s Window definition no longer claims devices keep everything
  regardless; Retention is the on-device term, and `WINDOW_DAYS` /
  `RETENTION_DAYS` are configured and reasoned about separately even though
  the eviction _mechanism_ (`pruneRunsBefore` / `evictRun`) doesn't change.
- Once an article passes three days on-device it cannot be recovered — the
  collector only ever publishes one day, so there is no re-sync path back to
  it.
- An article the reader never opened can now silently leave their reel after
  three days, with nothing to distinguish that from having read it — true
  today too, just at seven days instead of three.
