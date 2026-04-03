/**
 * /api/vessels.js
 * Vercel serverless function — AISStream server-side proxy
 *
 * Connects to AISStream WebSocket on the server (bypassing browser CORS),
 * collects 8 seconds of AIS position + static data for the Strait of Hormuz,
 * and returns a deduplicated JSON array of vessels to the browser.
 *
 * Deploy: push this repo to GitHub → import on vercel.com
 * API key: set AISSTREAM_API_KEY in Vercel environment variables
 */

'use strict';

const WebSocket = require('ws');

// ── Config ──
const API_KEY    = process.env.AISSTREAM_API_KEY || '';
const BBOX       = [[[20.5, 48.0], [30.5, 65.0]]];   // Hormuz bounding box
const COLLECT_MS = 8_500;                              // collect window (< 10s Vercel timeout)

// AIS tanker/cargo/military type ranges
const TANKER_TYPES   = new Set([80,81,82,83,84,85,86,87,88,89]);
const CARGO_TYPES    = new Set([70,71,72,73,74,75,76,77,78,79]);
const MILITARY_TYPES = new Set([35]);

function isTracked(t) {
  return TANKER_TYPES.has(t) || CARGO_TYPES.has(t) || MILITARY_TYPES.has(t);
}

module.exports = async function handler(req, res) {
  // CORS — allow browser to call /api/vessels from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'Method not allowed' }); return; }

  if (!API_KEY) {
    res.status(500).json({ error: 'AISSTREAM_API_KEY environment variable not set' });
    return;
  }

  const vessels     = new Map();   // mmsi → vessel record
  const staticData  = new Map();   // mmsi → {type, name, dest, callsign, imo}

  await new Promise((resolve) => {
    let settled = false;
    function done() {
      if (settled) return;
      settled = true;
      try { ws.terminate(); } catch (_) {}
      resolve();
    }

    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    const timeout = setTimeout(done, COLLECT_MS);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: API_KEY,
        BoundingBoxes: BBOX,
        // No FilterMessageTypes — receive position + static data
      }));
    });

    ws.on('message', (raw) => {
      try {
        const msg  = JSON.parse(raw.toString());
        const meta = msg.MetaData || {};
        const mmsi = parseInt(meta.MMSI || meta.MMSI_String || 0);
        if (!mmsi) return;

        /* ── Static data — type 5 ── */
        if (msg.MessageType === 'ShipStaticData') {
          const sd = msg.Message?.ShipStaticData || {};
          const prev = staticData.get(mmsi) || {};
          staticData.set(mmsi, {
            type:     parseInt(sd.Type || meta.ShipType || 0) || prev.type || 0,
            name:     (sd.Name || meta.ShipName || prev.name || '').trim(),
            dest:     (sd.Destination || prev.dest || '').trim(),
            callsign: (sd.CallSign || prev.callsign || '').trim(),
            imo:      parseInt(sd.ImoNumber || 0) || prev.imo || 0,
          });
          // Patch live vessel record if already captured
          if (vessels.has(mmsi)) {
            const v = vessels.get(mmsi);
            const s = staticData.get(mmsi);
            if (s.type) v.type     = s.type;
            if (s.name) v.name     = s.name;
            if (s.dest) v.dest     = s.dest;
            if (s.imo)  v.imo      = s.imo;
          }
          return;
        }

        /* ── Static data — type 24 (Class B) ── */
        if (msg.MessageType === 'StaticDataReport') {
          const sd = msg.Message?.StaticDataReport || {};
          const rA = sd.ReportA || {};
          const rB = sd.ReportB || {};
          const prev = staticData.get(mmsi) || {};
          staticData.set(mmsi, {
            type:     parseInt(rB.ShipType || 0) || prev.type || 0,
            name:     (rA.Name || meta.ShipName || prev.name || '').trim(),
            dest:     prev.dest || '',
            callsign: (rB.CallSign || prev.callsign || '').trim(),
            imo:      prev.imo || 0,
          });
          if (vessels.has(mmsi)) {
            const v = vessels.get(mmsi);
            const s = staticData.get(mmsi);
            if (s.type) v.type = s.type;
            if (s.name) v.name = s.name;
          }
          return;
        }

        /* ── Position reports — types 1/2/3, 18, 19, 27 ── */
        const prBody =
          msg.Message?.PositionReport ||
          msg.Message?.StandardClassBPositionReport ||
          msg.Message?.ExtendedClassBPositionReport ||
          msg.Message?.LongRangeAisBroadcastMessage;

        if (!prBody) return;

        // Prefer MetaData coords (pre-parsed decimal degrees)
        let lat = parseFloat(meta.latitude);
        let lon = parseFloat(meta.longitude);
        if (!isFinite(lat) || !isFinite(lon)) {
          lat = parseFloat(prBody.Latitude ?? prBody.Lat ?? 91);
          lon = parseFloat(prBody.Longitude ?? prBody.Lon ?? 181);
        }

        // Reject invalid / sentinel coords
        if (!isFinite(lat) || !isFinite(lon)) return;
        if (lat === 0 && lon === 0) return;
        if (Math.abs(lat) >= 91 || Math.abs(lon) >= 181) return;

        const cached  = staticData.get(mmsi) || {};
        const rawType = (meta.ShipType > 0) ? parseInt(meta.ShipType) : null;
        const type    = rawType || cached.type || 0;
        const name    = (meta.ShipName || '').trim() || cached.name || '';

        // Only store vessel if we know it's a tracked type, or type is unknown (will filter client-side)
        if (type > 0 && !isTracked(type)) return;

        vessels.set(mmsi, {
          mmsi,
          lat,
          lon,
          sog:      parseFloat(prBody.Sog ?? 0) || 0,
          cog:      parseFloat(prBody.Cog ?? prBody.CourseOverGround ?? 0) || 0,
          hdg:      parseInt(prBody.TrueHeading ?? 511),
          status:   parseInt(prBody.NavigationalStatus ?? 15),
          type,
          name,
          dest:     cached.dest     || '',
          callsign: cached.callsign || '',
          imo:      cached.imo      || 0,
          fixTime:  meta.time_utc ? new Date(meta.time_utc).getTime() : Date.now(),
        });
      } catch (_) {}
    });

    ws.on('error', (err) => {
      console.error('[AIS proxy] WebSocket error:', err.message);
      clearTimeout(timeout);
      done();
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      done();
    });
  });

  const result = Array.from(vessels.values());
  res.status(200).json({ vessels: result, count: result.length, ts: Date.now() });
};
