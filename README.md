# Memory Garden

One small memory a day, grown into a garden. A single Expo codebase builds the iPhone app and an installable web app.

<p>
  <img src="docs/screenshot.png" alt="The garden: a year of daily memories shown as a grid of plants" width="280">
  <img src="docs/screenshot-write.png" alt="Writing today's memory" width="280">
</p>

## Run

| | |
|---|---|
| Expo Go (no voice) | `npx expo start` |
| Native, with voice | `npx expo run:ios` |
| Web | `npx expo start --web` |
| TestFlight | `npx eas-cli@latest build -p ios --profile production --auto-submit` |
| Web hosting | `npx expo export -p web`, then serve `dist/` (already set up for Vercel in `vercel.json`) |

Web-only files live in `public/`. Bump `CACHE` in `public/sw.js` when you change it.

## Tips

- Press and hold a day (hover on the web) to see its date.
- Tap the mic to speak a memory. On the web it needs Chrome, Edge or Safari.
