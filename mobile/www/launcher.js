// First-launch screen for the LearnHarness Android shell.
// Stores one server address and opens it. Only HTTPS addresses on a
// Tailscale name (*.ts.net) are accepted: the WebView stays inside the app
// for those hosts only (capacitor.config.json → server.allowNavigation),
// and the microphone needs a secure page.
(function () {
	"use strict";
	var KEY = "lh:server-url";

	/** Returns { origin } or { error }. Exposed for tests via window.lhLauncher. */
	function normalize(input) {
		var text = String(input || "").trim();
		if (!text) return { error: "Enter your server address." };
		if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = "https://" + text;
		var url;
		try {
			url = new URL(text);
		} catch (e) {
			return { error: "That is not a valid address." };
		}
		if (url.protocol !== "https:") return { error: "The address must start with https://" };
		if (url.username || url.password) return { error: "The address must not contain a user name or password." };
		var host = url.hostname.toLowerCase();
		if (!host.endsWith(".ts.net") || host === ".ts.net") {
			return { error: "Use your Tailscale name, for example https://my-computer.my-tailnet.ts.net" };
		}
		return { origin: url.origin };
	}

	function saved() {
		try {
			var result = normalize(localStorage.getItem(KEY));
			return result.origin || null;
		} catch (e) {
			return null;
		}
	}

	function open(origin) {
		window.location.replace(origin + "/");
	}

	function start() {
		var mode = document.body.getAttribute("data-mode"); // "launch" | "unreachable"
		var current = saved();
		if (mode === "launch" && current) {
			open(current);
			return;
		}
		var form = document.getElementById("form");
		var field = document.getElementById("address");
		var error = document.getElementById("error");
		var notice = document.getElementById("notice");
		if (current) field.value = current;
		if (mode === "unreachable" && current) {
			notice.textContent = "Could not load " + current + ". Check that Tailscale is connected on this phone and that the server is running, then try again.";
			notice.hidden = false;
		}
		document.body.removeAttribute("data-loading");
		form.addEventListener("submit", function (event) {
			event.preventDefault();
			var result = normalize(field.value);
			if (result.error) {
				error.textContent = result.error;
				error.hidden = false;
				return;
			}
			try {
				localStorage.setItem(KEY, result.origin);
			} catch (e) {
				// Storage unavailable: still open it; the address is asked again next launch.
			}
			open(result.origin);
		});
	}

	window.lhLauncher = { normalize: normalize };
	if (typeof document !== "undefined") {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
		else start();
	}
})();
