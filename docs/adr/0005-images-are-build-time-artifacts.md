# Images are resized at build time and served same-origin

Cards are image-led, and measurement showed images dominate everything else:
524 images in a day averaging 230KB each, against roughly 760KB of article JSON.
Hotlinking publisher CDNs meant about 120MB of traffic to swipe through one day
of news, no images at all when offline, and every card disclosing the reader's IP
and referrer to eight different publishers.

The collector therefore fetches each image once during the build, resizes it to
card dimensions in a modern format, and emits it into the deployed site. Images
are served same-origin, so the service worker can precache them and the offline
reel keeps working, while payload drops roughly sixfold.

Service-worker runtime caching was rejected because it only caches images after
they are displayed, and by then the article has been read and left the reel. The
images that need to be available offline are exactly the unread ones, which
view-time caching can never have.

## Consequences

- Images must never be committed to git. At this volume that is several
  gigabytes of permanent history per year, against GitHub's repository limits.
  They are build artifacts.
- The deploy is a complete static site with no incremental upload, so every build
  must materialise every image in the retention window, not just the newest run.
  Where those images are kept between builds is settled by ADR-0010: the CI cache
  is only a fast path, with durable copies stored as release assets, because a CI
  cache alone is not durable enough to be load-bearing.
- Publishers no longer receive traffic or referrer data from readers, and their
  images are re-hosted. This is a deliberate choice, and a larger one than
  hotlinking.
- Image fetching must tolerate failure. A dead image URL cannot fail a build; the
  card falls back to a text-only layout.
