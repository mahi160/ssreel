# Cache strategy follows mutability, and sync caches images explicitly

Because article data is baked into each deploy, new articles only reach readers
through a new deploy — while a service worker's purpose is to serve copies of a
previous one. Caching is therefore split strictly by whether a thing can change.

The application shell is precached and versioned per build. `index.json` is
network-first with a cache fallback, so a reader online always learns about new
runs and news can never silently go stale. Run files and images are immutable by
ADR-0004 and ADR-0007, so they are cache-first and never revalidated.

Nothing else is precached. Precaching everything the framework reports as static
would pull the whole retention window — several megabytes of JSON plus tens of
megabytes of images — on first install, including runs the reader may never open.

Offline images need explicit handling. Article text reaches IndexedDB during sync
and is therefore offline automatically, but images are never in IndexedDB; they
exist only in an HTTP cache. Sync consequently fetches a run's images into a cache
bucket immediately after storing its JSON. Offline behaviour is then exactly
"whatever has synced is fully readable, images included", which is predictable
enough to explain to a reader.

## Consequences

- Sync writes to two stores, IndexedDB and Cache Storage, and both must be pruned
  together when a run leaves the window.
- `index.json` must never be given far-future cache headers.
- A reader who has never been online has nothing, by design. There is no bundled
  seed content.
- The refresh control is defined by this design: re-fetch the index, sync anything
  new, then move to the first unread article.
