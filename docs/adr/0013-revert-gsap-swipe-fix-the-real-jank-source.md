# Revert the GSAP swipe; the choppiness was misdiagnosed

ADR-0012 replaced the reel's CSS scroll-snap paging with a GSAP
`Draggable(type: 'scroll', inertia: true)` drag, on the theory that
scroll-snap's own paging was the source of the reported choppiness. In
practice the custom drag felt worse, not better — a flick's velocity-projected
end value didn't reliably land on the very next card, and no amount of
clamping/tuning got it to feel like the native paging it replaced. ADR-0012
is reverted; the reel is back to plain CSS scroll-snap.

The original diagnosis was wrong. Scroll-snap itself is not what a browser
does badly — native touch/momentum scrolling, tuned by the platform over
years, is close to impossible for a generic drag library to out-perform by
bolting inertia onto a scrollable div. The far more likely cause of the
original jank is `backdrop-filter: blur`, used on the card's overlay panel
and hide button: a blurred layer has to recomposite every frame anything
behind it moves, which is exactly what happens continuously while a card is
paging. That's removed — the overlay panel is now a solid `bg-card`, the
hide button a solid `bg-black/40` — and each card gets `will-change:
transform` so paging promotes it to its own compositor layer instead of
repainting siblings.

## Consequences

- GSAP is removed as a dependency; it shipped nothing worth keeping and cost
  real bundle size for a worse result.
- ADR-0006 is fully back in force, its "browsers do momentum/accessibility
  better than hand-rolled gesture code" reasoning applying to vertical
  paging again, not just the rightward-swipe policy.
- The 92dvh peek from ADR-0012 is kept — it's a plain CSS sizing choice, was
  never the problem, and works the same under scroll-snap.
- If paging still doesn't feel smooth after this, the next thing to profile
  is paint/layout cost of the image and text panel themselves, not the
  paging mechanism — reaching for a JS drag library again should not be the
  first move.
