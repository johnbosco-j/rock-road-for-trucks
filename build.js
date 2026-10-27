// Vercel build step: write the public Mapbox token (pk.*) from the environment into config.js.
const fs = require('fs');
const token = process.env.MAPBOX_TOKEN || '';
fs.writeFileSync('config.js', `window.ROCK_CONFIG = { mapboxToken: ${JSON.stringify(token)} };\n`);
console.log(token ? 'Mapbox token injected' : 'No MAPBOX_TOKEN set; using empty config');
