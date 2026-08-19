# RSS with full text is the e-ink channel; no OPDS or EPUB

E-ink support (KOReader) initially suggested keeping the digest's OPDS catalogue
and per-edition EPUB generation. KOReader's built-in NewsDownloader plugin
already consumes RSS and Atom directly and builds EPUBs on the device, so a
per-article feed covers the e-ink use case without the app publishing a single
EPUB or OPDS document.

The feed therefore carries the full extracted body in `<content:encoded>`
alongside the short excerpt in `<description>`. The collector already extracts up
to `MAX_ARTICLE_CHARS` of clean article text and currently discards everything
past the 400-character excerpt; publishing it means KOReader can run with
`download_full_article=false` and never refetch. That matters because on-device
refetching is slow and battery-hungry on e-ink, and several source outlets are
Cloudflare or bot-gated — the collector's own source list documents feeds dropped
for exactly that reason.

Each `<item>` links to the publisher's original URL rather than to a page on our
own site, so the feed stays valid with no browsable UI to point at.

## Consequences

- No `jszip`, no `epub.ts`, no OPDS route, no archived run pages.
- `feed.xml` grows roughly an order of magnitude versus an excerpt-only feed; it
  is bounded by the retention window, not by total history.
- Republishing several thousand characters of each publisher's text is a larger
  copyright surface than a short excerpt. Accepted deliberately.
