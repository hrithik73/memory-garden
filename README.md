# Memory Garden

One small memory a day, grown into a garden.

- `app/` — the iPhone app (Expo / React Native).
  - Expo Go (no voice): `cd app && npx expo start`
  - With voice (speak-to-write needs a native build): `cd app && npx expo run:ios`
  - TestFlight: `cd app && npx eas-cli@latest build -p ios --profile production --auto-submit`
- `web/` — the same app as an installable web page (serve the folder, e.g. `python3 -m http.server -d web`).

Press and hold a day in the garden to see its date (hover with a mouse on the web). Tap the mic in the editor to speak a memory.
