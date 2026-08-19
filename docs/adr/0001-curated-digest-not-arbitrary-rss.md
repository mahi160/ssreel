---
status: superseded by ADR-0002 (delivery mechanism only; the no-arbitrary-RSS
decision stands)
---

# v1 reads the curated digest, not arbitrary RSS

ssreel presents news as full-screen swipeable cards, so every item needs an image
and a readable excerpt. Raw third-party RSS reliably provides neither, and many
Bangla outlets are Cloudflare/bot-gated or CORS-blocked — the sibling
`bangla-news-digest` project documents several feeds it had to drop for exactly
this reason, and that was a Node collector with no CORS restrictions at all. A
browser faces those walls plus CORS.

Rather than proxy and re-extract feeds in v1, ssreel consumes the digest's
published `runs.json` (served from GitHub Pages with `access-control-allow-origin: *`).
That manifest already carries headline, excerpt, image, source, author and
section per article — measured at 97% image and 100% excerpt coverage across 540
articles — which is exactly the shape the card UI needs, with no XML parsing, no
proxy and no server.

The cost is that "add any RSS URL" is not a v1 feature; ssreel is a reader for a
curated digest, not a general-purpose aggregator. Accepting arbitrary feeds is
deferred until there is a fetch proxy and a content-extraction step to make those
feeds look as good as the curated ones.

## Consequences

- No CORS proxy, XML parser or Readability pass ships in the client.
- The admin surface manages which sections and sources are *shown*, not which
  URLs are *fetched*.
- ssreel is coupled to the digest's manifest format; a breaking change upstream
  breaks ssreel.
