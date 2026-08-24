// Scroll-linked scale/fade for the card stack (ADR-0015). GSAP here only
// *reads* the native scroll position via ScrollTrigger's scrub and sets
// transform/opacity — it never intercepts touch or drives the scroll itself.
// That's the distinction from ADR-0012/0013's reverted Draggable-based swipe:
// CSS scroll-snap still owns paging and momentum end to end; this just
// decorates it, so a card eases from 0.92 scale / 70% opacity up to full
// size as it settles into the active slot, and back down as it leaves —
// the "stack" depth cue that the old 92dvh peek was a crude stand-in for.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

// How far from the viewport (in viewport-heights) a card's motion stays
// live. A full day's reel can be 100+ articles; keeping every one of them
// scrubbing on every scroll tick is needless overhead and was the likely
// cause of jittery paging — only cards actually near the action get one.
const NEAR_MARGIN = '150% 0px';

export function stackMotion(node: HTMLElement) {
	// prefers-reduced-motion: the reel still pages fine with no visual effect.
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	if (!registered) {
		gsap.registerPlugin(ScrollTrigger);
		registered = true;
	}

	// `node` (a plain wrapper ArticleCard renders inside the real snap
	// target) is what actually scales/fades. `outer` — the snap target
	// itself — stays untransformed: browsers factor a transformed element's
	// rendered box into scroll-snap math, and scaling the snap target
	// directly made native snapping visibly jittery, fighting the very thing
	// ADR-0013 already established browsers do better than any JS could.
	const outer = node.parentElement!;
	const scroller = outer.closest<HTMLElement>('[data-reel-scroller]') ?? outer.parentElement!;

	let active: { settle: gsap.core.Tween; leave: gsap.core.Tween } | undefined;

	function start() {
		if (active) return;
		const top = outer.offsetTop;
		const h = outer.offsetHeight;
		// Pixel scroll positions, not rect-based "top"/"bottom" keywords —
		// those read live getBoundingClientRect(), which `node`'s own scale
		// would corrupt mid-animation. offsetTop/offsetHeight, read from the
		// untransformed `outer`, are plain layout values scale never touches.
		const settle = gsap.fromTo(
			node,
			{ scale: 0.92, opacity: 0.7 },
			{
				scale: 1,
				opacity: 1,
				ease: 'none',
				scrollTrigger: { scroller, start: top - h, end: top, scrub: true }
			}
		);
		// fromTo, not to() — a plain .to() captures its implicit "from" value
		// at creation time, and settle's fromTo above has already set scale
		// to 0.92 by then, which degenerates this into a 0.92→0.92 no-op that
		// renders on every scrub tick and stomps settle's output.
		const leave = gsap.fromTo(
			node,
			{ scale: 1, opacity: 1 },
			{
				scale: 0.92,
				opacity: 0.7,
				ease: 'none',
				scrollTrigger: { scroller, start: top, end: top + h, scrub: true }
			}
		);
		active = { settle, leave };
	}

	function stop() {
		if (!active) return;
		active.settle.scrollTrigger?.kill();
		active.leave.scrollTrigger?.kill();
		active.settle.kill();
		active.leave.kill();
		gsap.set(node, { clearProps: 'transform,opacity' });
		active = undefined;
	}

	const observer = new IntersectionObserver(
		([entry]) => (entry.isIntersecting ? start() : stop()),
		{ root: scroller, rootMargin: NEAR_MARGIN }
	);
	observer.observe(outer);

	return {
		destroy() {
			observer.disconnect();
			stop();
		}
	};
}
