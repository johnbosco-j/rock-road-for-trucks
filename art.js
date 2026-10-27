// Generated artwork that recreates the Figma imagery (no external photos needed).
window.ART = (() => {
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /** Aerial forest with an optional switchback road, drawn onto a canvas. */
  function forest(cv, { road = false, meadow = false, seed = 7 } = {}) {
    const w = cv.width = Math.max(300, cv.clientWidth || 600), h = cv.height = Math.max(300, cv.clientHeight || 600), c = cv.getContext('2d'), r = rng(seed);
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2f5d2a'); g.addColorStop(1, '#17381b'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const blob = (n, rmin, rmax, hs, ss, ls, a) => { for (let i = 0; i < n; i++) { c.fillStyle = `hsla(${hs[0] + r() * (hs[1] - hs[0])},${ss[0] + r() * (ss[1] - ss[0])}%,${ls[0] + r() * (ls[1] - ls[0])}%,${a[0] + r() * (a[1] - a[0])})`; c.beginPath(); c.ellipse(r() * w, r() * h, rmin + r() * (rmax - rmin), rmin + r() * (rmax - rmin), r() * 3, 0, 7); c.fill(); } };
    const A = w * h / 1400;
    blob(A * 1.2, 7, 18, [95, 140], [30, 50], [12, 22], [.5, .8]);
    blob(A * 1.5, 4, 11, [85, 130], [35, 55], [20, 34], [.55, .85]);
    blob(A * 1.2, 2, 6, [70, 110], [40, 60], [30, 46], [.4, .7]);
    if (meadow) { // sunlit yellow-green field, bottom right
      const m = c.createRadialGradient(w * .95, h * .98, 10, w * .95, h * .98, w * .5); m.addColorStop(0, 'rgba(196,184,86,.95)'); m.addColorStop(.6, 'rgba(150,160,70,.6)'); m.addColorStop(1, 'rgba(120,140,60,0)'); c.fillStyle = m; c.fillRect(0, 0, w, h);
    }
    if (road) {
      const P = [[.92, 1.06], [.3, .9], [.82, .74], [.22, .58], [.78, .42], [.36, .26], [.7, .1], [.56, -.06]].map(p => [p[0] * w, p[1] * h]);
      const path = () => { c.beginPath(); c.moveTo(...P[0]); for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2; c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); } };
      c.lineCap = 'round'; c.lineJoin = 'round';
      path(); c.strokeStyle = 'rgba(20,30,15,.35)'; c.lineWidth = w * .045; c.stroke();
      path(); c.strokeStyle = '#9a967d'; c.lineWidth = w * .032; c.stroke();
      path(); c.strokeStyle = '#d9d4c4'; c.lineWidth = w * .02; c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 0, w, h);
  }

  const T = (inner, vb = '0 0 520 270') => `<svg class="art" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;

  const trucks = () => T(`
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d1d8"/><stop offset="1" stop-color="#9aa4ac"/></linearGradient>
    <pattern id="rib" width="12" height="10" patternUnits="userSpaceOnUse"><rect width="12" height="10" fill="#cf4a1d"/><rect width="5" height="10" fill="#b53a12"/></pattern></defs>
    <rect width="520" height="270" fill="url(#sk)"/><rect x="430" y="60" width="90" height="140" fill="#6d7e91"/><rect x="440" y="75" width="20" height="30" fill="#8fa0b3"/>
    <rect y="196" width="520" height="74" fill="#55524f"/><rect y="196" width="520" height="6" fill="#7b776f"/>
    <rect x="40" y="62" width="262" height="126" rx="4" fill="url(#rib)"/><rect x="40" y="62" width="262" height="8" fill="#e45a2a"/>
    <rect x="60" y="100" width="62" height="26" rx="3" fill="#f7efe8" opacity=".85"/><text x="68" y="118" font-family="Josefin Sans" font-size="13" fill="#b53a12">Solutions</text>
    <path d="M302 112 h52 c14 0 24 8 30 22 l14 34 c3 8 5 14 5 20 v6 h-101z" fill="#e2551f"/>
    <path d="M312 120 h38 c8 0 13 4 16 10 l8 20 h-62z" fill="#b8c4cf"/><rect x="302" y="168" width="104" height="20" fill="#c9481a"/>
    <rect x="394" y="170" width="20" height="9" fill="#2a2a2a"/>
    <rect x="36" y="188" width="380" height="8" fill="#2d2c2b"/>
    ${[88, 122, 158, 330, 372].map(x => `<g><circle cx="${x}" cy="198" r="17" fill="#161616"/><circle cx="${x}" cy="198" r="7" fill="#8d8d8d"/></g>`).join('')}`);

  const map = () => {
    const pal = ['#e2776a', '#e98d7d', '#d9695d'], r = rng(11); let blocks = '';
    for (let y = 0; y < 270; y += 46) for (let x = -20; x < 520; x += 58) { const w = 34 + r() * 18, hh = 28 + r() * 12, s = ((x + y) % 3 + 3) % 3; blocks += `<rect x="${x + r() * 8}" y="${y + r() * 6}" width="${w}" height="${hh}" fill="${pal[s]}" transform="rotate(-14 260 135)"/>`; }
    return T(`<defs><pattern id="hat" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#d9d9d9"/><rect width="1.4" height="5" fill="#c9928c" opacity=".7"/></pattern></defs>
      <rect width="520" height="270" fill="#cfd0d0"/><rect width="520" height="270" fill="url(#hat)" opacity=".5"/>${blocks}
      <g font-family="Poppins" font-size="7" fill="#444" letter-spacing="1">
        <text transform="translate(40 150) rotate(-62)">GREAT EASTERN ROAD</text><text transform="translate(120 255) rotate(-62)">BETHNAL GREEN ROAD</text>
        <text transform="translate(470 120) rotate(-62)">BRICK LANE</text><text x="150" y="200" transform="rotate(-14 150 200)">ANNA SALAI</text></g>
      <rect x="20" y="150" width="70" height="60" rx="3" fill="#3b3b3f" transform="rotate(-14 55 180)"/><text x="30" y="188" font-family="Poppins" font-size="9" fill="#fff" transform="rotate(-14 55 180)">CANTEEN</text>
      <rect x="262" y="200" width="50" height="18" rx="3" fill="#fff"/><circle cx="287" cy="209" r="3" fill="#111"/>`);
  };

  const play = () => T(`
    <defs><radialGradient id="vg" cx="0.3" cy="0.75" r="0.9"><stop offset="0" stop-color="#a23d4e"/><stop offset="1" stop-color="#5c1d2b"/></radialGradient>
    <repeating-radial-gradient id="gr" cx="0.3" cy="0.75" r="0.9" spreadMethod="repeat"><stop offset="0" stop-color="#00000000"/></repeating-radial-gradient></defs>
    <rect width="520" height="270" fill="#a3a09b"/><rect x="330" y="0" width="190" height="270" fill="#b9b5ae"/>
    <circle cx="140" cy="215" r="250" fill="url(#vg)"/>
    ${[60, 90, 120, 150, 180, 210, 235].map(r => `<circle cx="140" cy="215" r="${r}" fill="none" stroke="#2b0d15" stroke-opacity=".35" stroke-width="1.4"/>`).join('')}
    <circle cx="140" cy="215" r="48" fill="#8a3a47"/><text x="86" y="145" font-family="Josefin Sans" font-size="14" fill="#ecc7c7" opacity=".6" transform="rotate(-18 86 145)">All Of A Sudden</text>
    <circle cx="400" cy="50" r="22" fill="#6e6a64"/><circle cx="400" cy="50" r="12" fill="#2b2b2b"/>
    <path d="M400 50 L215 178" stroke="#3a3836" stroke-width="9" stroke-linecap="round"/><path d="M400 50 L215 178" stroke="#bdb9b2" stroke-width="3" stroke-linecap="round"/>
    <rect x="198" y="168" width="34" height="14" rx="4" fill="#2d2b2a" transform="rotate(35 215 178)"/>`);

  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  /** Expenses chart: olive area + orange dots + vertical month lines, drawn from real monthly totals. */
  const expenses = totals => {
    const has = totals.some(v => v > 0), d = has ? totals : [320, 1200, 900, 1500, 1100, 1800, 1400, 2900, 3900, 3100, 1700, 0].map(v => v), mx = Math.max(...d, 1);
    const x0 = 62, x1 = 458, base = 205, top = 50, X = i => x0 + i * (x1 - x0) / 11, Y = v => base - v / mx * (base - top);
    const pts = d.map((v, i) => [X(i), Y(v)]); let line = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const cx = (pts[i - 1][0] + pts[i][0]) / 2; line += ` C${cx} ${pts[i - 1][1]} ${cx} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`; }
    return T(`<rect width="520" height="270" fill="#d8d9d3"/>
      ${MON.map((m, i) => `<line x1="${X(i)}" x2="${X(i)}" y1="22" y2="${base}" stroke="#8c8f86" stroke-width=".6"/><text transform="translate(${X(i) + 3} ${base + 6}) rotate(90)" font-family="Poppins" font-size="7" fill="#444">${m}</text><text transform="translate(${X(i) + 3} 20) rotate(90)" font-family="Poppins" font-size="6.5" fill="#555">${d[i].toLocaleString('en-IN')}</text>`).join('')}
      <path d="${line} L${x1} ${base} L${x0} ${base} Z" fill="#91a02a" opacity="${has ? .95 : .55}"/><path d="${line}" fill="none" stroke="#c9522a" stroke-width="1.4"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#d9531e"/>`).join('')}`);
  };
  return { forest, trucks, map, play, expenses };
})();
