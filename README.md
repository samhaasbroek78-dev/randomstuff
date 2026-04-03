# Hormuz Strait — Live Ship Tracker

A real-time maritime tracking dashboard for the Strait of Hormuz and surrounding Gulf region. Tracks tankers, container ships, and military vessels live via AIS data.

![Satellite view of the Strait of Hormuz with live vessel markers](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/23/39)

## Features

- **Real-time AIS feed** via [AISStream.io](https://aisstream.io) WebSocket — position updates as they arrive
- **Satellite view** by default (Esri World Imagery), toggle to dark tactical map
- **Three vessel types** tracked and colour-coded:
  - 🟠 Tankers (AIS types 80–89)
  - 🔵 Cargo / Container ships (AIS types 70–79)
  - 🟢 Military vessels (AIS type 35)
- **Flag-of-origin icons** — each marker shows the vessel's flag state derived from its MMSI Maritime Identification Digit
- **Last-known position** — ships silent for 5+ minutes display a faded ghost marker with pulsing ring instead of disappearing. Kept on map for 6 hours
- **Vessel detail panel** — click any ship for speed, course, heading, nav status, callsign, IMO, and destination
- **Zoom controls** with keyboard shortcuts (`+` / `-` / `S`)
- Zero dependencies — single HTML file, no build step

## Live Demo

Deployed at: `https://your-project.vercel.app`

## Tech Stack

| Component | Provider |
|-----------|----------|
| AIS data  | AISStream.io WebSocket API |
| Map       | Leaflet 1.9.4 |
| Tiles     | Esri ArcGIS Online (satellite + dark canvas) |
| Hosting   | Vercel (static) |
| Fonts     | Google Fonts (Barlow Condensed, Share Tech Mono) |

## Repository Structure

```
hormuz-tracker/
├── index.html       # Complete self-contained app (38 KB)
├── vercel.json      # Vercel static deployment config
└── README.md
```

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Option B — Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repository
3. Framework preset: **Other**
4. Click **Deploy** — no build settings needed

### Option C — Drag and drop
Go to [vercel.com/new](https://vercel.com/new), drag the project folder in.

## Local Development

No server needed — just open `index.html` directly in any modern browser:

```bash
open index.html
# or
python3 -m http.server 8080
```

## AIS Data

Data is sourced from [AISStream.io](https://aisstream.io). The included API key is pre-configured for the Hormuz bounding box (`[20.5°N, 48.0°E]` → `[30.5°N, 65.0°E]`).

To use your own API key, replace the value in `index.html`:
```javascript
const API_KEY = 'your_key_here';
```

## How Last-Known Position Works

| State | Time since last ping | Display |
|-------|---------------------|---------|
| Active | < 5 minutes | Full-colour flag + directional arrow |
| Stale | 5 min – 6 hours | Faded ghost marker + pulsing dashed ring |
| Removed | > 6 hours | Cleared from map |

## License

MIT
