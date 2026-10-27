# ROCK – Road for Trucks

Truck navigation web app and project site for the PDL (CS24423) project by The AfterMath.

## Run

```bash
python3 -m http.server 5173
```

Open http://localhost:5173 (landing page) or http://localhost:5173/app.html (app). Needs no API key.

## UI source

The app follows the team's Figma file (pages Login, Home, Travel, Profile, plus the Trucks wireframe): forest login card, cream Overview with the four photo tiles (Trucks, Map, TruckPlay, Expenses), the left icon rail with the pink mini-player. The Miro stickies (music for trucks, search along route, where trucks are allowed, a profile per truck type, truck maintenance, in-app expenses) are all implemented. Photos are recreated as generated artwork in `art.js`, since the originals are not in the zip. The landing page carries the deck/report content and the 3-month roadmap slide.

## Features

| Area | What it does |
|---|---|
| Accounts | Sign up / log in. Passwords are SHA-256 hashed and everything is stored in this browser's localStorage (demo only, no server). |
| Trucks | Multiple profiles: height, weight, width, axles, mileage, diesel price. |
| Routing | OSRM routes with up to 3 alternatives, sorted by fewest restrictions. With a Mapbox public token it uses Mapbox Directions with `max_height/max_width/max_weight`. |
| Restrictions | Live OpenStreetMap `maxheight`, `maxweight`, `maxwidth` and `hgv=no` ways along the route via Overpass (3 mirrors), plus user-placed markers. |
| Navigation | Turn-by-turn HUD, voice guidance (Web Speech), warnings 600 m before a restriction, simulator (1×, 8×, 30×) or live GPS. Arrival auto-logs fuel and toll. |
| Stops | Fuel, truck parking, rest areas, weigh stations from OpenStreetMap. |
| Offline | Service worker caches the app and map tiles; "Download visible area" pre-fetches tiles (capped at 220); saved trips re-open with no signal. |
| Expenses | Manual and automatic entries, monthly chart, cost per km, CSV export. |
| TruckPlay | Four generated tracks (Web Audio), play/pause/next/volume. |
| Feedback | Report map errors with location, stored per user. |

## Known limits

- Restriction data is only as complete as OpenStreetMap in the area; always obey road signs.
- Toll is a flat per-km estimate by axle count, not real plaza data. Truck speed is car time × 1.3.
- Social sign-in buttons need OAuth keys and are not connected.
- The public OSRM, Nominatim and Overpass servers are shared and rate-limited. For production, host your own or use Mapbox/HERE.
- Mapbox truck parameters were written from the API docs and have not been tested without a token.
