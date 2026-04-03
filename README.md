# Hormuz Strait — Live Ship Tracker

Real-time AIS vessel tracking for the Strait of Hormuz. Tankers, cargo ships, and military vessels tracked live via AISStream.io, served through a Vercel serverless proxy.

## Architecture

```
Browser (index.html)
    │  polls /api/vessels every 30s
    ▼
Vercel Serverless Function (api/vessels.js)
    │  opens WebSocket server-side — no CORS issues
    ▼
AISStream.io WebSocket API
    │  streams AIS data for Hormuz bounding box
    ▼  collected for 8 seconds, returned as JSON
Vercel Function → Browser
```

The AISStream API requires a server-side connection because it does not support browser CORS requests. The Vercel function acts as a transparent proxy — it connects to AISStream via WebSocket, collects 8 seconds of AIS messages, and returns the deduplicated vessel list as a JSON REST response.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/hormuz-tracker
cd hormuz-tracker
npm install
```

### 2. Set your AISStream API key

In Vercel dashboard → Project → Settings → Environment Variables:

```
AISSTREAM_API_KEY = your_key_here
```

Get a free key at [aisstream.io](https://aisstream.io).

For local development, create `.env.local`:
```
AISSTREAM_API_KEY=your_key_here
```

### 3. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo at [vercel.com/new](https://vercel.com/new).

## Local Development

```bash
npx vercel dev
# → http://localhost:3000
```

The `vercel dev` command runs both the static frontend and the API function locally, replicating the production environment exactly.

## Project Structure

```
hormuz-tracker/
├── api/
│   └── vessels.js       # Serverless function — AISStream WebSocket proxy
├── index.html           # Frontend — polls /api/vessels, renders Leaflet map
├── package.json         # ws dependency for the serverless function
├── vercel.json          # Routes, function config, maxDuration
└── README.md
```

## Features

- Real-time positions via AISStream.io (refreshes every 30 seconds)
- Satellite view by default (Esri World Imagery), toggle to dark map
- Tankers 🟠, Cargo/Container 🔵, Military 🟢
- Flag-of-origin icons from MMSI (150+ countries)
- Last-known position ghost markers (stale after 5 min, removed after 6 hr)
- Vessel detail panel: speed, course, heading, nav status, IMO, destination
- Press `R` to force-refresh immediately

## Vercel Function Details

| Setting | Value |
|---------|-------|
| Runtime | Node.js 18 |
| Max duration | 10 seconds (Hobby tier limit) |
| Memory | 256 MB |
| Collect window | 8.5 seconds of AIS data |
| CORS | `Access-Control-Allow-Origin: *` |

## License

MIT
