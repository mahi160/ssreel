# Build and deploy pipeline, and where images live between builds

GitHub Actions runs the collector on a four-times-daily schedule and deploys the
result to Cloudflare Pages with Wrangler. Cloudflare's own git integration cannot
do this, because the build needs to run the collector with secrets and with access
to cached image artifacts before the site is generated.

Resized images are stored as one compressed tarball per run, attached to a GitHub
release. The Actions cache sits in front of that as a fast path. This split exists
because the Actions cache alone is not durable enough to be load-bearing: it is
evicted after seven days without access or when the repository exceeds 10GB, which
is precisely the retention window, so eviction would force a refetch of the entire
window from publishers — and any image that had since 404'd would be lost for good.
With release assets as the durable copy, a cache miss costs a few large downloads
instead.

Release assets were chosen over an orphan git branch because they are entirely
outside git history, so there is no repository growth and no periodic
force-truncation ritual. R2 was rejected only because it requires a payment method
on file even though the usage is comfortably inside the free allowance; the
pipeline stays on GitHub alone.

Images are pruned on the same window as articles. A new device can only sync runs
that are still published, and devices that already synced older runs hold those
images in Cache Storage, so pruning cannot strand a reader.

Resizing uses the tooling already present on the runner. No container is
introduced: `ubuntu-latest` ships ImageMagick, and `sharp` bundles prebuilt libvips
with no system dependencies.

## Consequences

- Images are stored as binary WebP, never base64. Base64 inflates by a third and
  compression only claws back the alphabet redundancy, so it costs bytes for no
  benefit, and git stores binary blobs natively.
- Image bytes must never be inlined into run JSON. That would break delta sync,
  lazy loading, the browser image cache, and the cache split in ADR-0009.
- Deploys are a single Wrangler upload of a fully built site, so every build
  materialises the whole window's images into the output.
- Dedup state is committed back to the repository by CI.
- Scheduled runs need a concurrency guard so two collections cannot overlap.
