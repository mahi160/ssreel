// Mirrors the `lg` breakpoint the two-pane layout switches on (see
// +page.svelte), so JS-side logic — like where dwell time should be
// counted — agrees with what CSS is actually showing.
const QUERY = '(min-width: 1024px)';

function isDesktopNow(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;
}

export const viewport = $state({ isDesktop: isDesktopNow() });

if (typeof matchMedia !== 'undefined') {
	matchMedia(QUERY).addEventListener('change', (e) => {
		viewport.isDesktop = e.matches;
	});
}
