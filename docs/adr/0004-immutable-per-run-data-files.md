# Article data ships as immutable per-run files behind a small index

Each build publishes one JSON file per run plus a small `index.json` listing the
runs in the window. A client reads the index, compares it against what it already
holds, and fetches only the run files it is missing.

The obvious alternative — a single `articles.json` rebuilt every run — was
rejected on measured numbers. Articles cost roughly 190KB gzipped per run once
bodies are included, so a seven-day window is about 5.3MB. A whole-file scheme
forces every client to re-download that entire window each time any run is added,
four times a day, on mobile connections. Conditional requests do not help an
active reader, because every new run invalidates the whole file. With per-run
files a daily reader transfers one run.

Because a run's contents never change after it is collected, run files are
immutable and can be cached indefinitely by both the HTTP layer and the service
worker. This also makes the retention window a pure configuration number rather
than a performance trade-off: widening it costs returning readers nothing, since
they still only fetch what they lack. The window is currently seven days.

## Consequences

- Run files must genuinely never be rewritten. Correcting a run means publishing
  a new one, not editing an old one.
- A new install has to backfill the window; it fetches the newest run first so
  the reel is usable immediately, and fills older runs in the background.
- Clients need a stable run id, and articles need stable ids to dedupe across
  runs.
- A run file holds every section, so muting a section filters display only — it
  never skips a download. Splitting runs per section to avoid fetching muted
  content would multiply the file count, fragment caching, and make unmuting lossy
  once older runs have been pruned. Do not "optimise" this.
