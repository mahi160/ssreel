# Record dwell duration in v1, before anything consumes it

Every article carries a local record of its state (unread, read or hidden), when
that state last changed, and how long the reader actually spent on the card.
Nothing in v1 reads the dwell figure or the timestamp. Both are stored anyway.

The planned personalised ranking needs a history of what the reader engaged with,
and dwell time is a stronger signal than an explicit like, because readers rarely
press explicit controls. This data cannot be reconstructed after the fact: if v1
ships without it, ranking begins from nothing on its first day regardless of how
long v1 was in use. The timestamp is separately required for conflict resolution
once state syncs between devices, and is equally impossible to backfill.

This is a deliberate exception to not building for speculative needs. The cost is
a few bytes per article in local storage; the thing being bought is history,
which is the one input that cannot be added later.

## Consequences

- Do not remove these fields on the grounds that nothing reads them. That is the
  point.
- All of it stays on the device in v1. Nothing is transmitted anywhere.
- Dwell is measured against the same threshold that marks an article read, so the
  two cannot drift apart.
