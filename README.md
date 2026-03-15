# Appa's YT Downloader

A clean, fast YouTube downloader. Downloads videos, playlists, and audio (MP3).  
Built with **Next.js 14** — deploys to **Vercel free tier**, no backend needed.

---

## How it works

```
User pastes URL
  → Next.js API route (/api/info)    — fetches title/thumbnail via YouTube oEmbed (free, no key)
  → Next.js API route (/api/resolve) — calls a cobalt community instance, gets download URL
  → Browser downloads file directly from cobalt's tunnel
```

The Vercel API routes only relay a URL — they never stream bytes — so they complete well within Vercel's free-tier 10-second timeout. The actual file (even 5-hour videos) downloads directly in the user's browser.

---

## Project structure

```
src/
  app/
    page.tsx               ← UI
    page.module.css        ← styles
    layout.tsx
    globals.css
    api/
      info/route.ts        ← GET  /api/info?url=...
      resolve/route.ts     ← POST /api/resolve  { url, videoQuality, isAudioOnly }
package.json
next.config.js
tsconfig.json
```

---

## Deploy to Vercel (free)

### Option A — GitHub + Vercel dashboard (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — done ✓

No environment variables needed. The app works out-of-the-box.

---

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

---

## Cobalt instances

The `/api/resolve` route tries these open community cobalt instances in order, falling back on failure:

```
cobalt.api.timelessnesses.me
cobalt.ggtyler.dev
cobalt-api.asm.al
api.cobalt.tools
```

To add or change instances, edit the `COBALT_INSTANCES` array in `src/app/api/resolve/route.ts`.

You can find the community instance list at: https://instances.cobalt.best

---

## Features

- ▶ **Download Video** — MP4, quality: 360p / 480p / 720p / 1080p / 1440p / 4K
- ≡ **Download Playlist** — downloads the playlist via cobalt (public playlists only)
- ♪ **Download Audio** — MP3, best available quality
- Thumbnail preview + video title shown before download
- Full error handling (private videos, invalid URLs, instance failures)
- Responsive — works on mobile

---

## Notes

- Works with public YouTube videos and playlists only (private/age-restricted content will fail gracefully)
- Long videos (4–5 hours) work fine — the download happens in-browser, not on Vercel's servers
- cobalt is open-source: https://github.com/imputnet/cobalt
