# Rightward swipe is deliberately left unassigned

Vertical swipes page between articles, a tap expands the body, and a leftward
swipe hides an article. Rightward swipe does nothing, on purpose.

iOS uses a rightward swipe from the left edge for back navigation and a leftward
swipe from the right edge for forward navigation. Open WebKit and W3C issues
confirm these cannot be reliably suppressed in an installed PWA: calling
`preventDefault()` on `touchstart` works in Safari 13.4 and later but behaves
inconsistently in standalone mode. A leftward swipe beginning mid-screen is
therefore safe, while any rightward gesture risks navigating the reader out of the
reel with no dependable fix available to us.

Horizontal gestures are additionally only recognised when they begin outside a
narrow gutter at each edge, so an edge-initiated drag is never interpreted as a
hide.

## Consequences

- Do not add a swipe-right action. It will appear to work in development on
  desktop and Android and fail intermittently on iPhone.
- A future like or save action needs a different affordance, not the free
  direction.
- Because hide is a fast irreversible flick, it requires a visible undo.
