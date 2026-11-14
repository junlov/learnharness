/**
 * Phone drawer rules for the sidebar (the Android shell and narrow browser
 * tabs). Below PHONE_MAX_WIDTH the inline sidebar would take most of the
 * screen, so it becomes a full-width overlay (app/mobile.css) that starts
 * closed on every load and closes again when a destination is picked. Its
 * open state is transient there: the stored preference is neither read nor
 * written, so the wide-screen preference survives a visit at phone width.
 *
 * PHONE_MAX_WIDTH mirrors the breakpoint in app/mobile.css — keep in sync.
 */
export const PHONE_MAX_WIDTH = 768;
export const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH - 0.02}px)`;

/** Open state applied at mount. Wide screens: the stored choice, open on first run. */
export function initialSidebarOpen(stored: string | null, phone: boolean): boolean {
	if (phone) return false;
	return stored === null ? true : stored === "1";
}

/** The value to persist for a toggle that lands on `next`, or null when nothing is persisted. */
export function sidebarPreferenceToStore(next: boolean, phone: boolean): "0" | "1" | null {
	if (phone) return null;
	return next ? "1" : "0";
}

/** The phone-width media query, or null where the host has none (tests, very old WebViews): treated as wide. */
export function phoneWidthQuery(host: { matchMedia?: (query: string) => MediaQueryList }): MediaQueryList | null {
	return typeof host.matchMedia === "function" ? host.matchMedia(PHONE_QUERY) : null;
}
