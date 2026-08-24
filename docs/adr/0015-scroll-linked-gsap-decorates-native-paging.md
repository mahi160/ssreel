
# GSAP comes back, but only to decorate scroll-snap, never to drive it

ADR-0012 tried GSAP `Draggable(type: 'scroll', inertia: true)` in place of
native scroll-snap paging; ADR-0013 reverted it because a hand-rolled drag
couldn't match native touch/momentum scrolling, and removed GSAP entirely.
That verdict stands — nothing here touches touch handling, scroll physics,
or paging. CSS scroll-snap still owns all of that, unchanged.

What's new is `stackMotion.ts`: a `use:` action, one per card, that reads
the reel's native scroll position via GSAP ScrollTrigger's `scrub` mode and
sets `scale`/`opacity` on the card as it enters and leaves — 0.92 scale /
70% opacity at the edges, easing to 1/100% exactly at rest. ScrollTrigger in
scrub mode is a passive scroll listener plus a `transform`/`opacity` write;
it never calls `preventDefault`, never touches the scroller's own scroll
handling, and runs on the compositor same as the `will-change: transform`
paging ADR-0013 already relies on. This replaces the 92dvh "peek" (ADR-0012)
— a crude, low-effort stand-in for "there's a stack here" — with an actual
depth cue, and cards go back to full 100dvh.

Two non-obvious bugs surfaced building this, worth recording so nobody
reintroduces them:

- ScrollTrigger's `"top bottom"` / `"top top"` keyword positions read the
  trigger element's live `getBoundingClientRect()`. Since this animation
  shrinks that same element via `scale`, using keyword positions measured a
  moving target and threw off the range. Fixed by computing plain numeric
  scroll offsets once from `offsetTop`/`offsetHeight` (layout properties,
  untouched by `transform`) instead.
- The "leave" tween must be `gsap.fromTo()`, not `gsap.to()`. A plain `.to()`
  captures its implicit start value at creation time; since both tweens are
  created synchronously and "settle" (a `fromTo`) has already applied its
  `0.92` starting value by then, `.to()` degenerated into a `0.92 → 0.92`
  no-op that rendered on every scrub tick and stomped the settle tween's
  output regardless of scroll position.

## Consequences

- GSAP (`gsap` + `gsap/ScrollTrigger`) is a dependency again — this time
  earning its bundle cost with a real, requested effect, not replacing
  something that already worked.
- `prefers-reduced-motion: reduce` skips the action entirely; the reel pages
  identically, just without the scale/fade.
- Any future card-adjacent animation should default to this same pattern —
  GSAP reading scroll/state to decorate, native browser behavior driving
  input — not reach for `Draggable` or anything that intercepts touch again.
