# Memory Garden

One small memory a day, grown into a garden.

Everything lives in `app/`: one Expo / React Native codebase that builds the iPhone app and the installable web version.

- Expo Go (no voice): `cd app && npx expo start`
- With voice (speak-to-write needs a native build): `cd app && npx expo run:ios`
- TestFlight: `cd app && npx eas-cli@latest build -p ios --profile production --auto-submit`
- Web, while developing: `cd app && npx expo start --web`
- Web, for hosting: `cd app && npx expo export -p web`, then serve `app/dist/` from the root of any static host (e.g. `python3 -m http.server -d dist`).

The web-only files (manifest, icons, offline service worker and the HTML shell) are in `app/public/`. When you change `public/sw.js`, bump its `CACHE` name so installed copies update.

Press and hold a day in the garden to see its date (hover with a mouse on the web). Tap the mic in the editor to speak a memory. On the web, the mic only appears in browsers with speech recognition (Chrome, Edge and Safari).
