# The reel's vertical paging moves from scroll-snap to a GSAP drag-and-inertia swipe

ADR-0006 chose plain CSS scroll-snap for vertical paging over a custom pointer
handler, on the reasoning that browsers do momentum and accessibility better
than hand-rolled gesture code. In practice scroll-snap's paging reads as
choppy — not a smooth 60fps card-to-card motion, closer to a hard jump between
snap points — and does not deliver the "native app" feel the reel is meant to
have. That specific reasoning is now overturned: the reel's container is
driven by GSAP's Draggable with `type: 'scroll'` and `inertia: true` (free
since 2025), which drags the container's own `scrollTop` with real inertia
and a custom snap function, instead of CSS scroll-snap's instant jump.

GSAP was picked over Motion because Draggable's `type: 'scroll'` mode is a
combo purpose-built for drag-with-inertia-and-snap-points on a scrollable
container; Motion's drag API does not pair inertia with snap targets as
directly. `Observer` (also considered) isn't used: `type: 'scroll'` already
owns pointer/touch handling and inertia on its own, so a separate
gesture-direction layer on top would be redundant.

Each card is 92dvh instead of a full 100dvh, so the next card's top edge
always peeks below the current one — a constant visual cue, not a
state-toggling height. A height that grew only for the "active" card was
considered and rejected: it would change every scrolled-past sibling's
offset continuously as the reader pages through, fighting the very scroll
positions Draggable's snap function depends on, for a purely decorative cue.

ADR-0006's other conclusion — no gesture is ever wired to a rightward swipe,
because iOS's edge-swipe-back cannot be reliably suppressed — is unaffected
and still stands. This ADR only replaces _how_ vertical paging is driven, not
horizontal gesture policy.

## Consequences

- The container stays a genuine scrollable element (`overflow-y-auto`, real
  `scrollTop`) with Draggable layered on top of it, not a from-scratch
  transform-based card stack — native keyboard scrolling and a screen
  reader's own swipe gestures (e.g. VoiceOver) keep working because the
  underlying scroll mechanism never changed, only what drives it.
- `prefers-reduced-motion: reduce` skips Draggable entirely and keeps plain
  CSS scroll-snap (checked once per mount, not live-watched) — required, not
  optional, as the accessibility floor.
- Desktop's keyboard up/down paging in `DesktopPane.svelte` is untouched —
  this ADR is about the mobile `Reel`'s touch paging only.
- GSAP becomes a runtime dependency of the client bundle, the first animation
  library ssreel ships (`tw-animate-css` remains for simple CSS transitions
  elsewhere; it does not overlap with this).
- Any future change to swipe feel (snap threshold, inertia decay) is a
  Draggable config, not a CSS scroll-snap property, so tuning moves from CSS
  into JS.
- The stack peek is a fixed 92dvh card height, not tied to which card is
  active/reading — accepted as a simpler, lower-risk cue than a height that
  changes with focus.
