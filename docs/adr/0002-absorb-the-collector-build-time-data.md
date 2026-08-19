# Absorb the collector into ssreel; data is baked at build time

ADR-0001 had ssreel fetch the sibling `bangla-news-digest` manifest over CORS at
runtime. Instead, ssreel absorbs a stripped-down version of that collector and
the digest project is deprecated. The collector keeps only fetching, extraction,
dedup and classification — no web UI, no email, no AI.

The schedule stays on GitHub Actions, four times a day, because that is where the
collector's dependencies actually run: `jsdom` and `@mozilla/readability` need
Node internals, and Cloudflare Pages has no cron triggers at all (they are a
Workers-only feature). Running the collector on Cloudflare would mean migrating
off Pages, rewriting extraction on a Workers-compatible DOM, and replacing
`state.json` with D1 or KV — a large rewrite of the riskiest code to gain nothing
the free GitHub Actions runner does not already provide.

Each scheduled run collects, commits its state, and triggers a Cloudflare Pages
deploy. Pages serves a purely static app with the collected data baked into the
build, so the client makes no cross-origin request for content and needs no
proxy.

## Consequences

- ssreel is one repo containing both a Node-only build-time collector and a
  static client. Collector code must never be imported into client bundles.
- Publishing new articles requires a deploy. Content freshness is bounded by the
  build cadence, not by any client polling.
- Dedup state (`state.json`) is committed by CI, so the repo's history carries
  content state, not just code.
- `bangla-news-digest` is deprecated once ssreel's collector reaches parity.
