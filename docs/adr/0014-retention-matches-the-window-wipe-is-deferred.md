
# Retention shrinks to match the window; wiping stale runs is deferred until it's safe

ADR-0011 set on-device retention to three days, deliberately longer than the
one-day publish window, so a reader's history outlived what the collector
still served. In practice nobody wants three-day-old local news lying around
once the next run lands: the reel should look like the last 24 hours of the
wire, no more. `RETENTION_DAYS` drops from 3 to 1, so a device keeps roughly
the last four runs and nothing older. Eviction stays uniform by publish time,
unread/read/hidden alike — same mechanism (`pruneRunsBefore` / `evictRun`) as
ADR-0011 established, just a shorter cutoff.

The one new problem this creates: `sync()` used to prune on every call,
including ones that happen while someone is mid-article. Evicting the very
run they're reading out from under them is worse than a stale reel. `sync()`
gains a `{ prune }` option (default `true`, unchanged for the common case);
callers that fire mid-session — the `online` listener, a foreground check on
`visibilitychange` — pass `prune: false`, so the fetch/store still happens
immediately (the run is safely on the device, just not yet surfaced) but
nothing gets evicted out from under the screen. The reader sees a "Jump to
latest" pill instead. Only tapping it, the app regaining visibility after
being backgrounded, or the manual refresh button actually prunes and snaps
the reel to the top.

## Consequences

- Two moments update the in-memory reel automatically: initial load (nothing
  to disrupt yet) and an explicit "jump to latest" (pill tap, manual refresh,
  or the app becoming visible again after a run arrived while it was
  backgrounded). A run landing while the app is open and visible never
  auto-inserts above the reader; it waits for one of those moments.
- `pruneStale()` is exported from `sync.ts` for the pill/refresh path to call
  directly, without re-fetching the index.
- CONTEXT.md's Retention definition no longer says "longer than the Window" —
  the two constants stay independently configured, for the same reasons
  ADR-0011 gave, but currently carry the same value.
