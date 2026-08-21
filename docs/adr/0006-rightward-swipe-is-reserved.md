---
status: superseded by ADR-0012 (vertical paging mechanism only; the no-rightward-
swipe decision stands)
---

# Rightward swipe is deliberately left unassigned

Vertical swipes page between articles — plain scroll-snap, not a custom gesture.
Hide is a visible button, not a gesture (see below for why). No horizontal
gesture is wired to anything, and none should be added for rightward swipe.

iOS uses a rightward swipe from the left edge for back navigation and a leftward
swipe from the right edge for forward navigation. Open WebKit and W3C issues
confirm these cannot be reliably suppressed in an installed PWA: calling
`preventDefault()` on `touchstart` works in Safari 13.4 and later but behaves
inconsistently in standalone mode. Any rightward gesture therefore risks
navigating the reader out of the reel with no dependable fix available to us.

## History

The first version of this screen also read a leftward swipe as hide, edge-guarded
against the same iOS back-navigation zone. It was replaced with an explicit
button (top-right of the image) after both informal testing and general swipe-UX
guidance agreed: an undiscoverable gesture is worse than a visible tap target for
an action with real consequences, and it needs an equivalent path for anyone who
can't perform the gesture at all. Vertical paging stayed as plain scroll-snap
rather than a custom pointer handler for the same reason browsers do it better —
native momentum, native accessibility, no gesture math to get wrong.

## Consequences

- Do not add a swipe-right action. It will appear to work in development on
  desktop and Android and fail intermittently on iPhone.
- A future like or save action needs a different affordance (a button), not a
  free swipe direction — same reasoning as hide above.
- Hide stays a visible button with a toast undo, not a flick — both because it's
  irreversible-feeling and because a button is inherently discoverable and
  keyboard/switch-access reachable in a way a gesture isn't.
