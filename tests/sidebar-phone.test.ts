import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";
import { PHONE_MAX_WIDTH, PHONE_QUERY, initialSidebarOpen, phoneWidthQuery, sidebarPreferenceToStore } from "../components/sidebar-phone.ts";

/**
 * Phone drawer (the Android shell, mobile/): below the breakpoint the
 * sidebar starts closed and its open state is transient; wide screens keep
 * the stored-preference behavior unchanged.
 */

describe("sidebar phone drawer rules", () => {
	it("wide screens: stored preference, open on first run", () => {
		assert.equal(initialSidebarOpen(null, false), true);
		assert.equal(initialSidebarOpen("1", false), true);
		assert.equal(initialSidebarOpen("0", false), false);
	});

	it("phone width: always starts closed, whatever is stored", () => {
		assert.equal(initialSidebarOpen(null, true), false);
		assert.equal(initialSidebarOpen("1", true), false);
		assert.equal(initialSidebarOpen("0", true), false);
	});

	it("phone toggles never overwrite the wide-screen preference", () => {
		assert.equal(sidebarPreferenceToStore(true, true), null);
		assert.equal(sidebarPreferenceToStore(false, true), null);
		assert.equal(sidebarPreferenceToStore(true, false), "1");
		assert.equal(sidebarPreferenceToStore(false, false), "0");
	});

	it("a host without matchMedia is treated as wide", () => {
		assert.equal(phoneWidthQuery({}), null);
		const seen: string[] = [];
		const query = { matches: true } as MediaQueryList;
		assert.equal(phoneWidthQuery({ matchMedia: (q) => (seen.push(q), query) }), query);
		assert.deepEqual(seen, [PHONE_QUERY]);
	});

	it("the stylesheet and the component share one breakpoint", () => {
		const css = readFileSync(new URL("../app/mobile.css", import.meta.url), "utf8");
		const queries = [...css.matchAll(/@media\s*(\([^)]*\))/g)].map((m) => m[1]);
		assert.deepEqual(queries, [PHONE_QUERY]);
		assert.equal(PHONE_QUERY, `(max-width: ${PHONE_MAX_WIDTH - 0.02}px)`);
	});
});

describe("Android shell launcher — server address rules", () => {
	const source = readFileSync(new URL("../mobile/www/launcher.js", import.meta.url), "utf8");
	const window: { lhLauncher?: { normalize: (input: unknown) => { origin?: string; error?: string } } } = {};
	vm.runInNewContext(source, { window, URL });
	const normalize = window.lhLauncher!.normalize;

	it("accepts a Tailscale HTTPS name and reduces it to its origin", () => {
		assert.equal(normalize("https://box.tail1234.ts.net").origin, "https://box.tail1234.ts.net");
		assert.equal(normalize("  box.tail1234.ts.net/chat/new  ").origin, "https://box.tail1234.ts.net");
		assert.equal(normalize("https://BOX.tail1234.ts.net:8443/").origin, "https://box.tail1234.ts.net:8443");
	});

	it("refuses plain http, other hosts, credentials and look-alikes", () => {
		for (const bad of [
			"",
			"http://box.tail1234.ts.net",
			"https://example.com",
			"https://100.101.102.103",
			"https://user:pw@box.tail1234.ts.net",
			"https://ts.net.example.com",
			"https://evilts.net",
			"javascript://box.tail1234.ts.net",
		]) {
			const result = normalize(bad);
			assert.equal(result.origin, undefined, bad);
			assert.ok(result.error, bad);
		}
	});

	it("the app keeps only *.ts.net inside the WebView", () => {
		const config = JSON.parse(readFileSync(new URL("../mobile/capacitor.config.json", import.meta.url), "utf8"));
		assert.deepEqual(config.server.allowNavigation, ["*.ts.net"]);
		assert.equal(config.server.errorPath, "unreachable.html");
		assert.equal(config.appId, "com.junlov.learnharness");
	});
});
