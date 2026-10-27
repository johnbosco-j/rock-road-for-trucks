(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('rock.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rock.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('rock.' + k); } catch {} }
};
const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 2600); };
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtKm = m => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m / 10) * 10 + ' m';
const fmtMin = m => m >= 60 ? Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' min' : Math.round(m) + ' min';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= state (per user) ================= */
let user = store.get('session', null);
const K = k => `u.${user.email}.${k}`;
let vehicles, activeId, expenses, restrictions, trips, feedback;
function loadUser() {
  vehicles = store.get(K('vehicles'), [{ id: 1, name: 'Tata Prima 4825', type: 'Multi-axle', h: 3.9, w: 25, wd: 2.5, a: 3, m: 4.2, d: 92, odo: 0, svc: 0, int: 10000 }]);
  activeId = store.get(K('active'), vehicles[0].id);
  expenses = store.get(K('expenses'), []); restrictions = store.get(K('restr'), []);
  trips = store.get(K('trips'), []); feedback = store.get(K('feedback'), []);
}
const save = () => { store.set(K('vehicles'), vehicles); store.set(K('active'), activeId); store.set(K('expenses'), expenses); store.set(K('restr'), restrictions); store.set(K('trips'), trips); store.set(K('feedback'), feedback); };
const veh = () => vehicles.find(v => v.id === activeId) || vehicles[0];

/* ================= auth ================= */
let signup = false;
const hash = async s => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('rock:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { return 'p:' + s; } };
function setMode(s) {
  signup = s; $('#nameField').classList.toggle('hide', !s); $('#lsubmit').textContent = 'Start';
  $('#swTxt').textContent = s ? 'Already Have An Account?' : 'New to Rock?'; $('#swMode').textContent = s ? 'Log In' : 'Sign Up'; $('#lerr').textContent = '';
}
setMode(!Object.keys(store.get('users', {})).length);
$('#swMode').onclick = e => { e.preventDefault(); setMode(!signup); };
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#lemail').value.trim().toLowerCase(), pass = $('#lpass').value, users = store.get('users', {});
  if (!/^\S+@\S+\.\S+$/.test(email)) return $('#lerr').textContent = 'Enter a valid email.';
  if (pass.length < 6) return $('#lerr').textContent = 'Password needs at least 6 characters.';
  const h = await hash(pass);
  if (signup) {
    if (users[email]) return $('#lerr').textContent = 'Account exists. Log in instead.';
    users[email] = { name: $('#lname').value.trim() || email.split('@')[0], h }; store.set('users', users);
  } else {
    if (!users[email]) return $('#lerr').textContent = 'No account found. Sign up first.';
    if (users[email].h !== h) return $('#lerr').textContent = 'Wrong password.';
  }
  user = { email, name: users[email].name }; store.set('session', user); start();
});
$$('[data-soc]').forEach(b => b.onclick = () => toast('Social sign-in needs OAuth keys. Use email for now'));
$('#logout').onclick = () => { store.del('session'); location.hash = ''; location.reload(); };

function start() {
  loadUser(); typeSel = veh().type || 'Multi-axle';
  $('#login').classList.add('hide'); $('#shell').classList.remove('hide');
  $('#hello').textContent = 'Welcome, ' + user.name;
  $('#acct').textContent = `${user.name} · ${user.email}`;
  $('#mbt').value = store.get('mbt', '');
  go(location.hash.slice(1) || 'home');
}

/* ================= nav ================= */
const VIEWS = ['home', 'trucks', 'map', 'expenses', 'play', 'profile'];
function go(v) {
  if (!VIEWS.includes(v)) v = 'home';
  $$('[data-view]').forEach(s => s.classList.toggle('hide', s.dataset.view !== v));
  $$('aside.side [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v || (v === 'trucks' && b.dataset.v === 'home')));
  history.replaceState(null, '', '#' + v);
  if (v === 'map') { initMap(); setTimeout(() => map.invalidateSize(), 60); }
  if (v === 'play') Play.ui();
  render();
}
$$('aside.side [data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
$$('.tile').forEach(t => { const f = () => go(t.dataset.go); t.onclick = f; t.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), f()); });
const net = () => { const on = navigator.onLine; $('#netdot').classList.toggle('off', !on); $('#nettxt').textContent = on ? 'Online' : 'Offline · cached maps & saved trips'; };
addEventListener('online', net); addEventListener('offline', net); net();

/* ================= geometry ================= */
const R = 6371000, rad = x => x * Math.PI / 180;
const dist = (a, b) => { const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function segDist(p, a, b) {
  const k = Math.cos(rad(p[0])), X = q => [q[1] * k, q[0]];
  const [px, py] = X(p), [ax, ay] = X(a), [bx, by] = X(b);
  const dx = bx - ax, dy = by - ay, t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy) * 111320;
}
const minDistToLine = (p, line) => { let m = Infinity; for (let i = 1; i < line.length; i++) { const d = segDist(p, line[i - 1], line[i]); if (d < m) m = d; } return m; };
const cumDist = c => { const o = [0]; for (let i = 1; i < c.length; i++) o.push(o[i - 1] + dist(c[i - 1], c[i])); return o; };
const decimate = (c, n) => { if (c.length <= n) return c; const s = (c.length - 1) / (n - 1); return Array.from({ length: n }, (_, i) => c[Math.round(i * s)]); };

async function geocode(q) {
  const m = q.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/); if (m) return [+m[1], +m[2]];
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(q));
  const j = await r.json(); if (!j.length) throw new Error('Could not find “' + q + '”');
  return [+j[0].lat, +j[0].lon];
}

/* ================= real restriction data (OpenStreetMap / Overpass) ================= */
const OVERPASS = 'https://overpass-api.de/api/interpreter';
function parseLen(s) {
  s = String(s || '').toLowerCase().trim(); if (!s || /^(none|default|no|below_default|unsigned)/.test(s)) return null;
  let m = s.match(/^(\d+)'\s*(\d+)?/); if (m) return (+m[1] * 12 + (+m[2] || 0)) * 0.0254;
  m = s.match(/^(\d+(?:[.,]\d+)?)\s*(m|cm|ft)?/); if (!m) return null;
  let n = +m[1].replace(',', '.'); if (m[2] === 'cm') n /= 100; if (m[2] === 'ft') n *= 0.3048; return n;
}
function parseWeight(s) {
  s = String(s || '').toLowerCase().trim(); const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(t|kg|lbs|st)?/); if (!m) return null;
  let n = +m[1].replace(',', '.'); if (m[2] === 'kg') n /= 1000; if (m[2] === 'lbs') n *= 0.000453592; if (m[2] === 'st') n *= 0.907; return n;
}
const MIRRORS = [OVERPASS, 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let mirror = 0;
async function overpass(q) {
  for (let n = 0; n < MIRRORS.length; n++) {
    const url = MIRRORS[(mirror + n) % MIRRORS.length], ac = new AbortController(), t = setTimeout(() => ac.abort(), 9000);
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ac.signal });
      if (!r.ok) continue; const j = await r.json(); mirror = (mirror + n) % MIRRORS.length; return j;
    } catch {} finally { clearTimeout(t); }
  }
  throw new Error('Overpass unavailable');
}
async function osmRestrictions(coords, v) {
  const cum = cumDist(coords), total = cum[cum.length - 1], CH = 25000, MAXCH = 8, out = [], seen = new Set();
  let checked = total;
  for (let s = 0, ci = 0; s < coords.length - 1 && ci < MAXCH; ci++) {
    let e = s; while (e < coords.length - 1 && cum[e] - cum[s] < CH) e++;
    const slice = coords.slice(s, e + 1); if (slice.length < 2) break;
    const pts = decimate(slice, 110).map(c => c[0].toFixed(5) + ',' + c[1].toFixed(5)).join(',');
    const A = `(around:30,${pts})`;
    const j = await overpass(`[out:json][timeout:25];(way["maxheight"]${A};way["maxweight"]${A};way["maxwidth"]${A};way["hgv"="no"]${A};);out tags geom;`);
    for (const w of j.elements || []) {
      if (seen.has(w.id) || !w.geometry) continue;
      const g = w.geometry.map(p => [p.lat, p.lon]);
      if (g.filter(p => minDistToLine(p, slice) < 20).length < 2) continue; // way must run along the route, not just cross it
      const t = w.tags || [], hh = parseLen(t.maxheight), ww = parseWeight(t.maxweight), wd = parseLen(t.maxwidth), why = [];
      if (hh != null && hh <= v.h) why.push(`height limit ${hh.toFixed(1)} m`);
      if (ww != null && ww < v.w) why.push(`weight limit ${ww} t`);
      if (wd != null && wd <= (v.wd || 2.5)) why.push(`width limit ${wd.toFixed(1)} m`);
      if (t.hgv === 'no') why.push('trucks (HGV) banned');
      if (!why.length) continue; seen.add(w.id);
      const mid = g[Math.floor(g.length / 2)];
      out.push({ lat: mid[0], lng: mid[1], name: (t.name || t.ref || (t.bridge ? 'Bridge' : 'Road')) + ': ' + why.join(', '), src: 'OSM' });
    }
    s = e; if (ci === MAXCH - 1 && e < coords.length - 1) checked = cum[e];
    await sleep(350);
  }
  return { list: out, partial: checked < total, checkedKm: checked / 1000 };
}
const customViolations = (coords, v) => restrictions.filter(r => r.h <= v.h && minDistToLine([r.lat, r.lng], coords) < 60).map(r => ({ lat: r.lat, lng: r.lng, name: `${r.name}: height limit ${r.h} m`, src: 'You' }));

/* ================= map ================= */
let map, layers, routeLayers = [], pickMode = false, curOpts = null, curSel = 0, curEnds = null, poiLayer;
function tiles() {
  const t = store.get('mbt', '');
  return t ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${t}`, { tileSize: 512, zoomOffset: -1, maxZoom: 19, attribution: '© Mapbox © OSM' })
           : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
}
function initMap() {
  if (map) return;
  map = L.map('map').setView([13.0, 80.17], 11); tiles().addTo(map);
  layers = L.layerGroup().addTo(map); poiLayer = L.layerGroup().addTo(map); drawCustom();
  map.on('click', e => {
    if (!pickMode) return;
    restrictions.push({ lat: e.latlng.lat, lng: e.latlng.lng, h: parseFloat($('#rh').value) || 3.8, name: 'Custom restriction' }); save();
    pickMode = false; $('#addMode').textContent = '+ On map'; map.getContainer().style.cursor = ''; drawCustom(); toast('Restriction added. Plan the route again.');
  });
}
const pin = (r, c) => L.marker([r.lat, r.lng], { icon: L.divIcon({ className: '', html: `<div style="background:${c};color:#fff;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;font:700 13px Poppins;border:2px solid #fff;box-shadow:0 2px 8px #0006">!</div>`, iconSize: [28, 28] }) });
function drawCustom() { layers.clearLayers(); restrictions.forEach((r, i) => pin(r, '#ffb454').bindPopup(`<b>${esc(r.name)}</b><br>Clearance ${r.h} m<br><a href="#" data-del="${i}">Remove</a>`).addTo(layers)); }
document.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) { e.preventDefault(); restrictions.splice(+d.dataset.del, 1); save(); drawCustom(); map.closePopup(); } });
$('#addMode').onclick = () => { pickMode = !pickMode; $('#addMode').textContent = pickMode ? 'Tap map…' : '+ On map'; map.getContainer().style.cursor = pickMode ? 'crosshair' : ''; };
$('#locate').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => { $('#from').value = p.coords.latitude.toFixed(5) + ', ' + p.coords.longitude.toFixed(5); }, () => toast('Location permission denied')) : toast('Geolocation unavailable');

/* ---- routing: Mapbox (if token) else OSRM ---- */
function stepText(s) {
  const m = s.maneuver || {}, mod = m.modifier || '', n = s.name ? ` onto ${s.name}` : '';
  if (m.instruction) return m.instruction;
  switch (m.type) {
    case 'depart': return 'Head ' + (mod || 'out') + (s.name ? ' on ' + s.name : '');
    case 'arrive': return 'You have arrived at your destination';
    case 'roundabout': case 'rotary': return `At the roundabout take exit ${m.exit || ''}` + n;
    case 'turn': return `Turn ${mod}` + n;
    case 'end of road': return `At the end of the road turn ${mod}` + n;
    case 'fork': return `Keep ${mod}` + n;
    case 'merge': return 'Merge' + n;
    case 'on ramp': case 'off ramp': return `Take the ramp ${mod}`.trim() + n;
    default: return mod ? `Continue ${mod}` + n : 'Continue' + (s.name ? ' on ' + s.name : '');
  }
}
const ARROWS = { left: '⬅', right: '➡', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↩', 'sharp right': '↪', uturn: '⤾', straight: '⬆' };
async function fetchRoutes(a, b, v) {
  const tk = store.get('mbt', '');
  if (tk && navigator.onLine) {
    try {
      const u = `https://api.mapbox.com/directions/v5/mapbox/driving/${a[1]},${a[0]};${b[1]},${b[0]}?alternatives=true&overview=full&geometries=geojson&steps=true&max_height=${v.h}&max_width=${v.wd || 2.5}&max_weight=${v.w}&access_token=${tk}`;
      const j = await (await fetch(u)).json(); if (j.code === 'Ok') return { routes: j.routes, src: 'Mapbox' };
    } catch {}
  }
  const j = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?alternatives=3&overview=full&geometries=geojson&steps=true`)).json();
  if (j.code !== 'Ok') throw new Error('No route found between those places');
  return { routes: j.routes, src: 'OSRM' };
}
// Rough Indian national-highway toll estimate (₹ per km, 2-axle base, scaled by axles). Estimate only.
const tollFor = (km, axles) => km < 20 ? 0 : km * 2.6 * ({ 2: 1, 3: 1.1, 4: 1.75, 5: 2.1, 6: 2.1 }[axles] || 1);
const TRUCK_FACTOR = 1.3; // trucks average slower than cars

$('#go').onclick = async () => {
  if (nav) stopNav();
  const out = $('#result'); out.innerHTML = '<p class="note" style="margin-top:12px">Planning route…</p>'; $('#navctl').classList.add('hide');
  try {
    const [a, b] = await Promise.all([geocode($('#from').value), geocode($('#to').value)]), v = veh();
    const { routes, src } = await fetchRoutes(a, b, v);
    const opts = routes.slice(0, 3).map(rt => {
      const coords = rt.geometry.coordinates.map(c => [c[1], c[0]]), km = rt.distance / 1000;
      const steps = (rt.legs || []).flatMap(l => l.steps || []).map(s => ({ text: stepText(s), dist: s.distance, name: s.name, mod: (s.maneuver || {}).modifier, type: (s.maneuver || {}).type }));
      return { coords, km, min: rt.duration / 60 * TRUCK_FACTOR, toll: tollFor(km, v.a), fuel: km / v.m * (v.d || 92), steps, bad: customViolations(coords, v), osm: null };
    });
    curEnds = [a, b]; curOpts = opts; show(0, { src, checking: true, osmOk: true });
    let osmOk = true, partial = false;
    for (const o of opts) { try { const r = await osmRestrictions(o.coords, v); o.bad.push(...r.list); o.osm = r; partial ||= r.partial; } catch { osmOk = false; break; } }
    opts.sort((x, y) => x.bad.length - y.bad.length || x.min - y.min);
    curOpts = opts; show(0, { src, osmOk, partial });
  } catch (e) { out.innerHTML = `<div class="alert bad">⚠ ${esc(e.message || 'Routing failed. Check your connection.')}</div>` + savedList(); bindSaved(); }
};
let info = {};
function show(sel, meta) {
  info = meta || info; curSel = sel; const opts = curOpts, [a, b] = curEnds, v = veh(), o = opts[sel];
  routeLayers.forEach(l => l.remove()); routeLayers = [];
  opts.forEach((x, i) => { if (i !== sel) routeLayers.push(L.polyline(x.coords, { color: '#6b7f72', weight: 5, opacity: .7 }).addTo(map)); });
  routeLayers.push(L.polyline(o.coords, { color: o.bad.length ? '#ff6b5e' : '#7bd23c', weight: 7 }).addTo(map), L.marker(a).addTo(map), L.marker(b).addTo(map));
  o.bad.forEach(x => routeLayers.push(pin(x, '#ff6b5e').bindPopup(esc(x.name) + `<br><small>Source: ${x.src}</small>`).addTo(map)));
  map.fitBounds(L.latLngBounds(o.coords), { padding: [30, 30] });
  const note = info.checking ? '<div class="alert warn">⏳ Checking OpenStreetMap for height, weight and width limits… route shown below is not verified yet.</div>' : !info.osmOk ? '<div class="alert warn">⚠ Could not reach the OpenStreetMap restriction service. Only your own restrictions were checked.</div>' : info.partial ? `<div class="alert warn">⚠ Restrictions checked for the first ${Math.round(o.osm.checkedKm)} km only.</div>` : '';
  $('#result').innerHTML = note +
    (o.bad.length ? `<div class="alert bad">⛔ ${o.bad.length} restriction(s) affect ${esc(v.name)}:<br>${o.bad.slice(0, 5).map(x => '• ' + esc(x.name)).join('<br>')}</div>`
      : `<div class="alert ok">✓ No known restrictions for ${esc(v.name)} (${v.h} m · ${v.w} t · ${v.wd || 2.5} m wide).</div>`) +
    `<div style="margin-top:10px;font-size:.9rem"><b>${o.km.toFixed(1)} km</b> · ${fmtMin(o.min)} (truck est.)<br><span style="color:var(--mute)">Toll ≈ ${inr(o.toll)} · Fuel ≈ ${inr(o.fuel)}</span></div>` +
    (opts.length > 1 ? '<p class="note" style="margin-top:10px">Alternatives</p>' + opts.map((x, i) => `<div class="routeopt ${i === sel ? 'on' : ''}" data-r="${i}"><b>${x.km.toFixed(1)} km · ${fmtMin(x.min)}</b> ${x.bad.length ? '⛔ ' + x.bad.length + ' restricted' : '✓ clear'}</div>`).join('') : '') +
    `<p class="note">Routing: ${info.src || 'saved'} · limits only as complete as OpenStreetMap data, so always obey road signs.</p>`;
  $$('.routeopt').forEach(el => el.onclick = () => show(+el.dataset.r));
  $('#navctl').classList.remove('hide');
}
const savedList = () => trips.length ? '<p class="note" style="margin-top:12px">Saved trips (work offline)</p>' + trips.slice(0, 4).map((t, i) => `<div class="routeopt" data-s="${i}"><b>${esc(t.from)} → ${esc(t.to)}</b><br><small>${t.km.toFixed(0)} km · ${t.date}</small></div>`).join('') : '';
function bindSaved() {
  $$('[data-s]').forEach(el => el.onclick = () => {
    const t = trips[+el.dataset.s], v = veh(); initMap();
    const o = { coords: t.coords, km: t.km, min: t.min, toll: t.toll, fuel: t.fuel, steps: t.steps || [], bad: customViolations(t.coords, v), osm: { checkedKm: t.km } };
    curOpts = [o]; curEnds = [t.coords[0], t.coords[t.coords.length - 1]]; $('#from').value = t.from; $('#to').value = t.to; show(0, { src: 'saved trip', osmOk: false });
    $('#result').insertAdjacentHTML('afterbegin', '<div class="alert warn">Showing a saved trip. Restrictions are re-checked only against your own markers.</div>');
  });
}

/* ---- POIs (live from OSM) ---- */
const POIQ = { fuel: ['⛽', 'node["amenity"="fuel"]'], parking: ['🅿', 'nwr["amenity"="parking"]["hgv"~"yes|designated"];nwr["amenity"="parking"]["capacity:hgv"]'], rest: ['🛏', 'nwr["highway"="services"];nwr["highway"="rest_area"]'], weigh: ['⚖', 'nwr["amenity"="weighbridge"];nwr["man_made"="weighbridge"]'] };
$$('#poiBtns button').forEach(b => b.onclick = async () => {
  const k = b.dataset.poi, [ic, q] = POIQ[k], route = curOpts && curOpts[curSel], bb = map.getBounds();
  if (!route && map.getZoom() < 11) return toast('Zoom in a little to search stops');
  $$('#poiBtns button').forEach(x => x.classList.toggle('on', x === b)); $('#pois').innerHTML = '<p class="note">Searching…</p>';
  try {
    let area, cum, line;
    if (route) { line = route.coords; cum = cumDist(line); const lim = line.findIndex((_, i) => cum[i] > 150000); const part = decimate(lim < 0 ? line : line.slice(0, lim), 100); area = `(around:1500,${part.map(c => c[0].toFixed(5) + ',' + c[1].toFixed(5)).join(',')})`; }
    else area = `(${bb.getSouth()},${bb.getWest()},${bb.getNorth()},${bb.getEast()})`;
    const j = await overpass(`[out:json][timeout:25];(${q.split(';').filter(Boolean).map(s => s + area).join(';')};);out center 80;`);
    const c = map.getCenter();
    const list = (j.elements || []).map(e => ({ lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, name: e.tags?.name || e.tags?.brand || e.tags?.operator || k[0].toUpperCase() + k.slice(1) })).filter(e => e.lat).map(e => {
      if (!route) return { ...e, d: dist([c.lat, c.lng], [e.lat, e.lng]), lbl: fmtKm(dist([c.lat, c.lng], [e.lat, e.lng])) };
      let bi = 0, bd = Infinity; line.forEach((p, i) => { const d = Math.abs(p[0] - e.lat) + Math.abs(p[1] - e.lng); if (d < bd) { bd = d; bi = i; } });
      return { ...e, d: cum[bi], lbl: fmtKm(cum[bi]) + ' ahead' };
    }).sort((x, y) => x.d - y.d).slice(0, 12);
    poiLayer.clearLayers();
    list.forEach(p => L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div style="font-size:22px">${ic}</div>`, iconSize: [24, 24] }) }).bindPopup(esc(p.name)).addTo(poiLayer));
    $('#pois').innerHTML = (route ? '<p class="note">Along your planned route, nearest to the start first.</p>' : '') + (list.length ? list.map((p, i) => `<div class="poi" data-p="${i}"><span class="e">${ic}</span><div style="flex:1">${esc(p.name)}</div><small>${p.lbl}</small></div>`).join('') : '<p class="note">Nothing tagged here in OpenStreetMap. Try another area.</p>');
    $$('.poi[data-p]').forEach(el => el.onclick = () => map.flyTo([list[el.dataset.p].lat, list[el.dataset.p].lng], 16));
  } catch { $('#pois').innerHTML = '<p class="note">Search failed (offline or busy). Try again.</p>'; }
});

/* ---- offline map download ---- */
$('#dl').onclick = async () => {
  const bb = map.getBounds(), z0 = Math.max(8, Math.floor(map.getZoom())), tiles = [];
  for (let z = z0; z <= Math.min(z0 + 2, 15); z++) {
    const f = (lat, lng) => [Math.floor((lng + 180) / 360 * 2 ** z), Math.floor((1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2 * 2 ** z)];
    const [x0, y0] = f(bb.getNorth(), bb.getWest()), [x1, y1] = f(bb.getSouth(), bb.getEast());
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
  }
  if (tiles.length > 220) return toast(`Area too large (${tiles.length} tiles). Zoom in first.`);
  if (store.get('mbt', '')) toast('Mapbox tiles are cached as you view them');
  let n = 0; $('#dl').disabled = true;
  for (const u of tiles) { try { await fetch(u, { mode: 'no-cors' }); } catch {} $('#dlStat').textContent = `Saved ${++n}/${tiles.length} tiles`; await sleep(60); }
  $('#dl').disabled = false; $('#dlStat').textContent = `✓ ${tiles.length} tiles saved for offline use`;
};

/* ================= turn-by-turn navigation ================= */
let nav = null;
const speak = t => { if (!$('#voice').checked || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-IN'; speechSynthesis.speak(u); };
$('#startNav').onclick = () => {
  if (!curOpts) return toast('Plan a route first');
  const o = curOpts[curSel], mode = $('#simMode').value, cum = cumDist(o.coords);
  let acc = 0; const ends = o.steps.map(s => acc += s.dist);
  const along = o.bad.map(b => { let bi = 0, bd = Infinity; o.coords.forEach((c, i) => { const d = Math.abs(c[0] - b.lat) + Math.abs(c[1] - b.lng); if (d < bd) { bd = d; bi = i; } }); return { b, at: cum[bi], warned: false }; });
  nav = { o, cum, ends, i: 0, d: 0, mode, along, said: -1, speed: 0, mult: mode === 'gps' ? 1 : +mode, logged: false, last: Date.now() };
  $('#hud').classList.remove('hide'); $('#startNav').textContent = '■ Running';
  nav.marker = L.marker(o.coords[0], { icon: L.divIcon({ className: '', html: '<div class="truckpin">🚚</div>', iconSize: [30, 30] }), zIndexOffset: 1000 }).addTo(map);
  map.setView(o.coords[0], 16);
  speak(o.steps[0] ? o.steps[0].text : 'Starting navigation');
  if (mode === 'gps') {
    if (!navigator.geolocation) { toast('Geolocation unavailable'); return stopNav(); }
    nav.watch = navigator.geolocation.watchPosition(p => { nav.speed = (p.coords.speed || 0) * 3.6; advance([p.coords.latitude, p.coords.longitude]); }, () => { toast('GPS signal lost'); }, { enableHighAccuracy: true });
  } else nav.timer = setInterval(simTick, 500);
  tick();
};
function simTick() {
  nav.speed = 55; nav.d += (55 / 3.6) * 0.5 * nav.mult;
  const c = nav.o.coords, cum = nav.cum, T = cum[cum.length - 1];
  if (nav.d >= T) nav.d = T;
  while (nav.i < c.length - 2 && cum[nav.i + 1] <= nav.d) nav.i++;
  const seg = cum[nav.i + 1] - cum[nav.i] || 1, f = Math.min(1, (nav.d - cum[nav.i]) / seg);
  advance([c[nav.i][0] + (c[nav.i + 1][0] - c[nav.i][0]) * f, c[nav.i][1] + (c[nav.i + 1][1] - c[nav.i][1]) * f], true);
}
function advance(pos, sim) {
  if (!nav) return;
  if (!sim) { // GPS: monotonic nearest-vertex search
    const c = nav.o.coords; let bi = nav.i, bd = Infinity; for (let i = nav.i; i < Math.min(c.length, nav.i + 300); i++) { const d = dist(pos, c[i]); if (d < bd) { bd = d; bi = i; } }
    nav.i = bi; nav.d = nav.cum[bi]; if (bd > 150 && Date.now() - nav.last > 15000) { nav.last = Date.now(); speak('You are off route. Replan from the Travel panel.'); toast('Off route'); }
  }
  nav.marker.setLatLng(pos); map.panTo(pos, { animate: true, duration: .4 });
  tick();
}
function tick() {
  const n = nav, T = n.cum[n.cum.length - 1], done = n.d, rem = T - done;
  let k = n.ends.findIndex(e => e > done + 1); if (k < 0) k = n.o.steps.length - 1;
  const next = n.o.steps[k + 1] || n.o.steps[k], toNext = Math.max(0, (n.ends[k] ?? T) - done);
  const last = !n.o.steps[k + 1];
  $('#hDist').textContent = last ? fmtKm(rem) : fmtKm(toNext); $('#hTxt').textContent = next ? next.text : 'Follow the route';
  $('#hIc').textContent = last ? '🏁' : (ARROWS[next.mod] || '⬆');
  $('#hRem').textContent = fmtKm(rem); const spd = Math.max(n.speed, 30) * 1; // ETA from planned truck pace
  $('#hSpd').textContent = Math.round(n.speed); $('#hEta').textContent = new Date(Date.now() + rem / ((Math.max(n.speed, 30) / 3.6) * n.mult) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (n.said !== k + 1 && toNext < 350 && next && !last) { n.said = k + 1; speak(`In ${Math.round(toNext / 50) * 50} metres, ${next.text}`); }
  const ahead = n.along.find(a => !a.warned && a.at > done && a.at - done < 600);
  if (ahead) { ahead.warned = true; $('#hWarn').textContent = '⚠ ' + ahead.b.name; $('#hWarn').classList.remove('hide'); speak('Warning. ' + ahead.b.name); setTimeout(() => $('#hWarn') && $('#hWarn').classList.add('hide'), 9000); }
  if (rem < 25 && !n.logged) arrive();
}
function arrive() {
  nav.logged = true; const o = nav.o, v = veh(), d = new Date().toISOString().slice(0, 10), note = `${$('#from').value} → ${$('#to').value}`;
  expenses.push({ id: Date.now(), d, type: 'Fuel', amt: Math.round(o.fuel), km: Math.round(o.km), note }); if (o.toll > 0) expenses.push({ id: Date.now() + 1, d, type: 'Toll', amt: Math.round(o.toll), km: 0, note });
  v.odo = (v.odo || 0) + Math.round(o.km);
  trips.unshift({ id: Date.now(), date: d, from: $('#from').value, to: $('#to').value, km: o.km, min: o.min, toll: o.toll, fuel: o.fuel, coords: decimate(o.coords, 400), steps: o.steps, veh: v.name }); trips = trips.slice(0, 10); save();
  speak('You have arrived at your destination.'); $('#hTxt').textContent = `Arrived. Logged ${inr(o.fuel)} fuel${o.toll > 0 ? ' and ' + inr(o.toll) + ' toll' : ''}.`; $('#hIc').textContent = '🏁'; toast('Trip saved to Expenses'); render();
  if (nav.timer) clearInterval(nav.timer);
}
function stopNav() {
  if (!nav) return; clearInterval(nav.timer); if (nav.watch != null) navigator.geolocation.clearWatch(nav.watch);
  nav.marker.remove(); nav = null; speechSynthesis && speechSynthesis.cancel(); $('#hud').classList.add('hide'); $('#startNav').textContent = '▶ Start';
}
$('#stopNav').onclick = stopNav;

/* ================= expenses ================= */
$('#expForm').addEventListener('submit', e => {
  e.preventDefault(); const amt = +$('#eAmt').value; if (!(amt > 0)) return;
  expenses.push({ id: Date.now(), d: new Date().toISOString().slice(0, 10), type: $('#eType').value, amt, km: +$('#eKm').value || 0, note: $('#eNote').value.trim() });
  save(); e.target.reset(); render(); toast('Expense added');
});
$('#csv').onclick = () => {
  const csv = 'date,type,note,km,amount\n' + expenses.map(x => [x.d, x.type, `"${x.note.replace(/"/g, '""')}"`, x.km, x.amt].join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'rock-expenses.csv'; a.click();
};
document.addEventListener('click', e => { const d = e.target.closest('[data-x]'); if (d) { expenses = expenses.filter(x => x.id !== +d.dataset.x); save(); render(); } });

/* ================= vehicles / profile ================= */
$('#vehForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = { id: Date.now(), name: $('#vName').value.trim(), type: typeSel, h: +$('#vH').value, w: +$('#vW').value, wd: +$('#vWd').value || 2.5, a: +$('#vA').value, m: +$('#vM').value, d: +$('#vD').value || 92, odo: 0, svc: 0, int: 10000 };
  if (!v.name || !(v.h > 0) || !(v.w > 0) || !(v.m > 0)) return toast('Fill name, height, weight and mileage');
  vehicles.push(v); activeId = v.id; save(); render(); toast('Truck saved and active');
});
document.addEventListener('click', e => {
  const s = e.target.closest('[data-use]'); if (s) { activeId = +s.dataset.use; save(); render(); }
  const d = e.target.closest('[data-rm]'); if (d && vehicles.length > 1) { vehicles = vehicles.filter(v => v.id !== +d.dataset.rm); if (!vehicles.some(v => v.id === activeId)) activeId = vehicles[0].id; save(); render(); }
});
$('#mbSave').onclick = () => { const t = $('#mbt').value.trim(); if (t && !t.startsWith('pk.')) return toast('That is not a public token (must start with pk.)'); store.set('mbt', t); toast(t ? 'Saved. Reload to apply Mapbox' : 'Token removed'); };
$('#fbForm').addEventListener('submit', e => {
  e.preventDefault(); const c = map ? map.getCenter() : { lat: 13.0, lng: 80.17 };
  feedback.unshift({ id: Date.now(), d: new Date().toISOString().slice(0, 10), type: $('#fbType').value, txt: $('#fbTxt').value.trim(), lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4) }); save(); e.target.reset(); render(); toast('Report saved. Thank you!');
});
$('#clear').onclick = () => { if (confirm('Delete all trucks, trips, expenses and reports on this device?')) { ['vehicles', 'active', 'expenses', 'restr', 'trips', 'feedback'].forEach(k => store.del(K(k))); location.reload(); } };

/* ================= TruckPlay (Web Audio, generated on device) ================= */
const Play = (() => {
  const T = [
    { n: 'Midnight Highway', m: 'Lo-fi · 68 bpm', bpm: 68, w: 'triangle', ch: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 56, 59, 64]] },
    { n: 'Dawn at the Dhaba', m: 'Warm acoustic · 84 bpm', bpm: 84, w: 'sine', ch: [[60, 64, 67, 71], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]] },
    { n: 'Toll Plaza Groove', m: 'Upbeat · 100 bpm', bpm: 100, w: 'square', ch: [[62, 65, 69, 72], [58, 62, 65, 70], [55, 58, 62, 67], [57, 61, 64, 69]] },
    { n: 'Ghat Road Ambient', m: 'Slow ambient · 56 bpm', bpm: 56, w: 'sine', ch: [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [45, 52, 57, 60]] }
  ];
  let ctx, master, delay, timer, beat = 0, idx = 0, playing = false, t0 = 0, vol = .5;
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function init() {
    if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; delay = ctx.createDelay(); delay.delayTime.value = .375; const fb = ctx.createGain(); fb.gain.value = .3;
    delay.connect(fb); fb.connect(delay); f.connect(master); f.connect(delay); delay.connect(master); master.connect(ctx.destination); ctx._in = f;
  }
  function note(m, t, dur, g, w) {
    const o = ctx.createOscillator(), e = ctx.createGain(); o.type = w; o.frequency.value = hz(m);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .03); e.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(e); e.connect(ctx._in); o.start(t); o.stop(t + dur + .05);
  }
  function step() {
    const tr = T[idx], ch = tr.ch[Math.floor(beat / 8) % 4], d = 60 / tr.bpm / 2, t = ctx.currentTime + .05, pat = [0, 2, 1, 3, 2, 1, 3, 2];
    note(ch[pat[beat % 8]] + 12, t, d * 2.2, .16, tr.w === 'square' ? 'triangle' : tr.w);
    if (beat % 8 === 0) { ch.forEach((m, i) => note(m - 12 + (i ? 0 : 0), t, d * 8, .07, 'sine')); }
    if (tr.bpm > 90 && beat % 2 === 0) note(36, t, .15, .22, 'sine');
    beat++;
  }
  function run() { init(); ctx.resume(); clearInterval(timer); const d = 60 / T[idx].bpm / 2 * 1000; step(); timer = setInterval(step, d); if (!playing) t0 = Date.now(); playing = true; ui(); }
  function pause() { clearInterval(timer); ctx && ctx.suspend(); playing = false; ui(); }
  function sel(i) { idx = (i + T.length) % T.length; beat = 0; t0 = Date.now(); if (playing) run(); else ui(); }
  let ui = function () {
    $('#tName').textContent = T[idx].n; $('#tMood').textContent = T[idx].m; $('#pPlay').textContent = playing ? '⏸' : '▶'; $('#vinyl').classList.toggle('spin', playing);
    $('#tracks').innerHTML = T.map((t, i) => `<div class="trk ${i === idx ? 'on' : ''}" data-t="${i}"><span style="font-size:1.4rem">${i === idx && playing ? '🔊' : '💿'}</span><div><b>${t.n}</b><br><small>${t.m}</small></div></div>`).join('');
    $$('.trk').forEach(el => el.onclick = () => { idx = +el.dataset.t; beat = 0; run(); });
  }
  setInterval(() => { if (!playing) return; const s = Math.floor((Date.now() - t0) / 1000); $('#tEl').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); $('#tBar').style.width = (s % 60) / 60 * 100 + '%'; }, 500);
  $('#pPlay').onclick = () => playing ? pause() : run(); $('#pNext').onclick = () => sel(idx + 1); $('#pPrev').onclick = () => sel(idx - 1);
  $('#pVol').oninput = e => { vol = +e.target.value; if (master) master.gain.value = vol; };
  const syncRail = () => { $('#rpPlay').textContent = playing ? '⏸' : '▶'; };
  const _ui = ui; ui = function () { _ui(); syncRail(); };
  return { ui, toggle: () => playing ? pause() : run(), next: () => sel(idx + 1), setVol: v => { vol = v; if (master) master.gain.value = v; $('#pVol').value = v; } };
})();
$('#rpPlay').onclick = () => Play.toggle(); $('#rpNext').onclick = () => Play.next();
(() => { // vertical volume pill (Figma mini player)
  const vs = $('#rpVol'), set = v => { v = Math.max(0, Math.min(1, v)); vs.firstElementChild.style.height = v * 100 + '%'; vs.setAttribute('aria-valuenow', Math.round(v * 100)); Play.setVol(v); };
  const at = e => { const r = vs.getBoundingClientRect(); set(1 - (e.clientY - r.top) / r.height); };
  vs.onpointerdown = e => { vs.setPointerCapture(e.pointerId); at(e); vs.onpointermove = at; }; vs.onpointerup = () => vs.onpointermove = null;
  vs.onkeydown = e => { const cur = +vs.getAttribute('aria-valuenow') / 100; if (e.key === 'ArrowUp') set(cur + .05); if (e.key === 'ArrowDown') set(cur - .05); };
})();

/* ================= trucks page ================= */
const TYPES = [
  { t: 'Light (LCV)', h: 2.8, w: 7.5, wd: 2.1, a: 2, m: 8 },
  { t: 'Rigid HCV', h: 3.5, w: 16, wd: 2.5, a: 2, m: 5.5 },
  { t: 'Multi-axle', h: 3.9, w: 25, wd: 2.5, a: 3, m: 4.2 },
  { t: 'Trailer', h: 4.2, w: 49, wd: 2.6, a: 6, m: 3 }
];
let typeSel = 'Multi-axle';
$('#typeChips').innerHTML = TYPES.map(x => `<button data-type="${x.t}">${x.t}</button>`).join('');
$$('#typeChips button').forEach(b => b.onclick = () => { const x = TYPES.find(t => t.t === b.dataset.type); typeSel = x.t; fill({ name: x.t + ' truck', ...x }); $('#formTitle').textContent = 'New ' + x.t + ' profile'; render(); toast('Typical ' + x.t + ' values loaded. Edit to match your RC book.'); });
function truckSVG(v) {
  const hh = Math.min(v.h, 4.8) * 36, len = 230 + (v.a - 2) * 28, g = 190, cabX = 30 + len;
  const wheels = [...Array(v.a)].map((_, i) => 60 + i * ((len - 60) / Math.max(1, v.a - 1 || 1)) * (v.a > 1 ? .72 : 0) + (v.a === 1 ? 0 : 0)).concat([cabX + 20, cabX + 62]);
  return `<svg viewBox="0 0 ${cabX + 130} 230" role="img" aria-label="Truck ${v.h} m high"><defs><pattern id="rb" width="12" height="10" patternUnits="userSpaceOnUse"><rect width="12" height="10" fill="#d9531e"/><rect width="5" height="10" fill="#b53f12"/></pattern></defs>
    <rect x="0" y="${g + 18}" width="${cabX + 130}" height="6" rx="3" fill="#b9b3ae"/>
    <rect x="30" y="${g - hh}" width="${len}" height="${hh}" rx="4" fill="url(#rb)"/>
    <path d="M${cabX} ${g - 78} h46 c12 0 20 6 25 18 l12 28 c3 7 4 12 4 18 v18 h-87z" fill="#e2551f"/><path d="M${cabX + 8} ${g - 70} h34 c7 0 11 3 14 9 l7 17 h-55z" fill="#c4d0da"/>
    ${wheels.map(x => `<circle cx="${x}" cy="${g + 8}" r="16" fill="#161616"/><circle cx="${x}" cy="${g + 8}" r="6" fill="#999"/>`).join('')}
    <line x1="10" x2="10" y1="${g}" y2="${g - hh}" stroke="#16231c" stroke-width="1.5"/><path d="M5 ${g - hh + 6} l5 -6 l5 6 M5 ${g - 6} l5 6 l5 -6" stroke="#16231c" fill="none" stroke-width="1.5"/>
    <text x="16" y="${g - hh / 2}" font-family="Josefin Sans" font-size="15" font-weight="600" fill="#16231c">${v.h} m</text></svg>`;
}
const mOdo = () => { const v = veh(); v.odo = Math.max(0, +$('#mOdo').value || 0); save(); render(); };
$('#mOdo').onchange = mOdo;
$('#mInt').onchange = () => { const v = veh(); v.int = Math.max(500, +$('#mInt').value || 10000); save(); render(); };
$('#mDone').onclick = () => {
  const v = veh(), c = prompt('Service cost in ₹ (leave blank to skip logging an expense):', ''); v.svc = v.odo || 0;
  if (c && +c > 0) expenses.push({ id: Date.now(), d: new Date().toISOString().slice(0, 10), type: 'Maintenance', amt: +c, km: 0, note: 'Service · ' + v.name });
  save(); render(); toast('Service logged. Next due in ' + (v.int || 10000) + ' km');
};

/* ================= art ================= */
let artTimer;
function drawLogin() { if (!ART || $('#login').classList.contains('hide')) return; ART.forest($('#bgForest'), { meadow: true, seed: 21 }); ART.forest($('#cardArt'), { road: true, seed: 5 }); }
addEventListener('resize', () => { clearTimeout(artTimer); artTimer = setTimeout(drawLogin, 250); });
function tileArt() {
  [['#tTrucks', ART.trucks()], ['#tMap', ART.map()], ['#tPlay', ART.play()]].forEach(([id, svg]) => { if (!$(id + ' svg.art')) $(id).insertAdjacentHTML('afterbegin', svg); });
  const y = String(new Date().getFullYear()), tot = [...Array(12)].map((_, i) => expenses.filter(x => x.d.startsWith(y + '-' + String(i + 1).padStart(2, '0'))).reduce((a, x) => a + x.amt, 0));
  $('#tExp svg.art')?.remove(); $('#tExp').insertAdjacentHTML('afterbegin', ART.expenses(tot));
}

/* ================= render ================= */
function fill(v) { $('#vName').value = v.name; $('#vH').value = v.h; $('#vW').value = v.w; $('#vWd').value = v.wd || 2.5; $('#vA').value = v.a; $('#vM').value = v.m; $('#vD').value = v.d || 92; }
function render() {
  if (!user) return; const v = veh(), mo = new Date().toISOString().slice(0, 7);
  const chip = `🚚 ${v.name} · ${v.h} m · ${v.w} t · ${v.wd || 2.5} m wide · ${v.a} axles`; $('#vehChip').textContent = chip; $('#vehChip2').textContent = chip;
  $('#kTrips').textContent = trips.length;
  $('#kSpend').textContent = inr(expenses.filter(x => x.d.startsWith(mo)).reduce((s, x) => s + x.amt, 0));
  const km = expenses.reduce((s, x) => s + x.km, 0); $('#kKm').textContent = km.toLocaleString('en-IN');
  $('#cpk').textContent = km ? inr(expenses.reduce((s, x) => s + x.amt, 0) / km) : '–';
  $('#rows').innerHTML = [...expenses].sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id).map(x => `<tr><td>${x.d}</td><td>${x.type}</td><td>${esc(x.note) || '–'}</td><td>${x.km || '–'}</td><td>${inr(x.amt)}</td><td><button class="del" data-x="${x.id}" aria-label="Delete">✕</button></td></tr>`).join('');
  $('#empty').classList.toggle('hide', expenses.length > 0);
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const tot = months.map(m => expenses.filter(x => x.d.startsWith(m)).reduce((s, x) => s + x.amt, 0)), mx = Math.max(...tot, 1);
  $('#chart').innerHTML = months.map((m, i) => `<div><span>${tot[i] ? inr(tot[i]) : ''}</span><i style="height:${tot[i] / mx * 100}%"></i>${new Date(m + '-15').toLocaleString('en', { month: 'short' })}</div>`).join('');
  // trucks page
  $('#truckViz').innerHTML = truckSVG(v); $('#bcName').textContent = v.name;
  $('#sH').textContent = v.h + ' m'; $('#sW').textContent = v.w + ' t'; $('#sWd').textContent = (v.wd || 2.5) + ' m'; $('#sA').textContent = v.a;
  $$('#typeChips button').forEach(b => b.classList.toggle('on', b.dataset.type === typeSel));
  const odo = v.odo || 0, svc = v.svc || 0, it = v.int || 10000, used = Math.max(0, odo - svc), left = it - used;
  if (document.activeElement !== $('#mOdo')) $('#mOdo').value = odo; if (document.activeElement !== $('#mInt')) $('#mInt').value = it;
  $('#mBar').classList.toggle('warn', left < 1000); $('#mBar').firstElementChild.style.width = Math.min(100, used / it * 100) + '%';
  $('#mTxt').textContent = left > 0 ? `${left.toLocaleString('en-IN')} km until next service` : `Service overdue by ${(-left).toLocaleString('en-IN')} km`;
  $('#vehList').innerHTML = vehicles.map(x => `<div class="poi" style="cursor:default"><span class="e">🚚</span><div style="flex:1"><b>${esc(x.name)}</b><br><small style="color:var(--mute)">${esc(x.type || 'Custom')} · ${x.h} m · ${x.w} t · ${x.a} axles · ${x.m} km/l</small></div>${x.id === activeId ? '<span class="tag">Active</span>' : `<button class="btn ghost" style="padding:6px 14px" data-use="${x.id}">Use</button>`}${vehicles.length > 1 ? `<button class="del" data-rm="${x.id}" aria-label="Remove">✕</button>` : ''}</div>`).join('');
  $('#fbList').innerHTML = feedback.slice(0, 4).map(f => `<div class="poi" style="cursor:default"><div style="flex:1"><b>${esc(f.type)}</b><br><small style="color:var(--mute)">${esc(f.txt)} · ${f.lat}, ${f.lng}</small></div><small>${f.d}</small></div>`).join('');
  if (!$('#vName').value) fill(v);
  if (!$('#result').innerHTML.trim() && trips.length) { $('#result').innerHTML = savedList(); bindSaved(); }
  tileArt();
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (user && store.get('users', {})[user.email]) start(); else { user = null; drawLogin(); document.fonts && document.fonts.ready.then(drawLogin); }
})();
