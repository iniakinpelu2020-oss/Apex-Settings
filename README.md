# Apex Settings

Zero-dependency, offline-first control panel for **ApexOS**, served from `/apps/settings/` or as a standalone PWA. Vanilla HTML, CSS and JavaScript — no build step, no frameworks, no CDN.

Every path is relative (`./`), so the same files work at `https://host/apps/settings/` and when installed to an Android home screen.

## Sections

| Section | What it does |
| --- | --- |
| **Apps & Launcher** | Every Apex Ecosystem app with a show/hide switch for the home screen, an editable launch URL, and a `+ Add Custom Web App` form. Custom apps are removable. |
| **AI & API Keys** | Apex AI Router endpoint, default model (preset list or custom id), and Groq / Gemini / Mistral / Cloudflare keys stored on the device. **Test Connection** POSTs a 1-token ping to the router and reports status + latency. |
| **Offline & Storage** | Live quota and usage from `navigator.storage.estimate()`, persistence status from `navigator.storage.persisted()` with a **Request Lock** button, every `caches.keys()` bucket with per-cache entry count and delete, and **Force Update Service Worker**. |
| **Appearance & Mode** | UI mode (`Auto`, `Desktop`, `Android Mobile`), accent colour (presets + colour picker), wallpaper preset (`Aurora`, `Mesh`, `Ember`, `Graphite`) and a UI scale slider (80–140%). |
| **Backup & Reset** | One-tap **Export OS Config (.json)**, **Import Config (.json)** (button or drag/drop), and **Factory Reset ApexOS** behind a confirmation modal. |

## Shared config contract

All sections read and write a single object stored under the key `apex_os_config` in `localStorage`, mirrored into IndexedDB (`apex-settings` / `config`) as a recovery copy.

```json
{
  "version": 1,
  "apps": [{ "id": "notes", "name": "Apex Notes", "url": "./apps/notes/", "visible": true, "custom": false }],
  "ai": {
    "routerUrl": "https://your-router.workers.dev/v1/chat/completions",
    "model": "llama-3.3-70b-versatile",
    "keys": { "groq": "", "gemini": "", "mistral": "", "cloudflare": "" }
  },
  "appearance": { "mode": "auto", "accent": "#7c8cff", "wallpaper": "aurora", "scale": 100 },
  "updatedAt": "2026-11-18T14:20:00.000Z"
}
```

### Live updates for the ApexOS shell

Changes are broadcast on `BroadcastChannel('apex-settings')` so the shell re-renders without a reload:

```js
const bus = new BroadcastChannel('apex-settings');
bus.onmessage = (event) => {
  if (event.data?.type !== 'apex-config-changed') return;
  applyConfig(event.data.config); // accent, wallpapers, visible apps, mode
};
```

Messages look like `{ type: 'apex-config-changed', source: 'settings-ab12cd34', config }`. The sender ignores its own messages; a `storage` event listener covers browsers without `BroadcastChannel`.

Programmatic API: `window.ApexSettings.get()`, `.save()`, `.replace(config)`, `.reset()`, `.load()`, `.onChange(fn)`.

## Files

```
index.html               # shell + all five section containers
styles.css               # dark glassmorphism, sidebar and bottom-tab layouts
config.js                # defaults, normalise(), localStorage + IndexedDB, BroadcastChannel
ui.js                    # DOM helpers, toast, section router, appearance applier
section-apps.js          # 1 - Apps & Launcher
section-ai.js            # 2 - AI & API Keys
section-storage.js       # 3 - Offline & Storage
section-appearance.js    # 4 - Appearance & Mode
section-backup.js        # 5 - Backup & Reset
boot.js                  # load -> theme -> nav -> mount -> service worker
sw.js                    # app-shell precache, network-first code, cache-first images
manifest.json            # standalone PWA, relative start_url/scope
icons/                   # 192, 512 and maskable 512 (palette PNGs)
```

## Running it

Any static server works; no install step:

```bash
python3 -m http.server 8080
# http://localhost:8080/index.html
```

Service workers need `http://localhost` or HTTPS. To embed in ApexOS, copy the folder to `/apps/settings/` — the relative manifest, service-worker scope and `./` asset paths keep working.

## Notes and limits

- API keys are stored in this browser's storage only. They are never compiled into the app and are only ever sent to the router endpoint you configure. Anything that can run script on this origin can read them, so treat this as a convenience store, not a secret vault.
- **Test Connection** depends on the router allowing CORS from this origin. A failure message distinguishes timeout, HTTP error and network/CORS rejection rather than reporting a false success.
- Factory reset clears `apex_os_config`, provider keys and the config copy in IndexedDB; it does not clear every Cache Storage bucket (those are listed individually in **Offline & Storage** so you can choose).
- `navigator.storage.persist()` is a request — the browser may decline, in which case the UI says so.
