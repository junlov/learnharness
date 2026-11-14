# Android app (self-hosted)

The Android app in [`mobile/`](../mobile/) is a thin shell: it opens the LearnHarness server running on **your own computer** and shows the same web UI, laid out for a phone. Nothing runs on the phone itself. Sessions, the graph, settings and keys stay on the server.

This is a fork addition, not an upstream release. It targets one person using their own server over [Tailscale](https://tailscale.com); it adds no login and is not meant for the public internet.

## How it fits together

```
Phone (LearnHarness app)  ──HTTPS, inside your tailnet──►  tailscale serve  ──►  LearnHarness on localhost:3000
```

- The server stays bound to `localhost`. Tailscale is the access gate: only devices signed in to your tailnet can reach it.
- The app accepts only `https://…ts.net` addresses. Other links open in the phone's browser.

## Server setup (once)

On the always-on machine that runs LearnHarness:

1. Install Tailscale and sign in. In the Tailscale admin console, enable MagicDNS and HTTPS certificates.
2. Find the machine's full name, for example `my-computer.my-tailnet.ts.net` (`tailscale status`).
3. Start LearnHarness with that name allowed:

   ```sh
   npm ci && npm run plugins:setup && npm run build
   LH_ALLOWED_HOSTS=my-computer.my-tailnet.ts.net npm start
   ```

4. Publish it inside your tailnet over HTTPS:

   ```sh
   tailscale serve --bg 3000
   ```

5. On the phone, install Tailscale, sign in to the same tailnet, and check that `https://my-computer.my-tailnet.ts.net` opens in the phone's browser.

`LH_ALLOWED_HOSTS` is required: without it the API refuses the Tailscale name ([development](development.md#other-devices-on-your-network)).

## Build and install the app

Requirements: Node 22, JDK 21, and the Android SDK (platform 36) with `ANDROID_HOME` set.

```sh
cd mobile
npm ci
npm run apk          # → android/app/build/outputs/apk/debug/app-debug.apk
```

Copy the APK to the phone and open it (allow installs from that source), or with USB debugging: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

This is a debug build signed with a local debug key. Installing a build made on a different machine over an existing one fails until the old app is uninstalled.

On first launch the app asks for the server address. It is stored on the phone only. If the server cannot be loaded, the app returns to that screen with the address filled in, so it can be corrected or retried.

## What differs on a phone

- **Sidebar.** Below 768px it is a full-screen drawer: closed on launch, closed again after you pick a session.
- **Not available.** Attaching files by path, and subscription sign-ins, need the desktop app. API keys and custom endpoints work.
- **Dictation.** Needs the microphone permission, which Android asks for on first use.
- **System bars.** Their color follows the phone's light/dark setting, not the LearnHarness theme.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| "Server not reachable" screen | Tailscale is off on the phone, the server or `tailscale serve` is not running, or the page returned an error. |
| Page loads but nothing saves (403) | The name is missing from `LH_ALLOWED_HOSTS`, or the proxy in front of the server is not sending `X-Forwarded-Proto: https`. |
| A link leaves the app | Only `*.ts.net` pages stay inside the app. |

## Keeping in step with upstream

The shell loads the UI from your server, so updating the server updates the app; the APK only needs rebuilding when `mobile/` changes. The fork's edits to upstream files are deliberately small:

- `components/sidebar.tsx`: phone drawer state (rules in `components/sidebar-phone.ts`).
- `app/layout.tsx`: one import of `app/mobile.css`, which holds every phone-only style.
- `tsconfig.json`, `eslint.config.mjs`: exclude `mobile/`.
