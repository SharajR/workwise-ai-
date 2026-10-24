/**
 * WorkWise AI - React App Development Server
 * Run with: agy-node dev-server.js
 * Serves the React SPA at http://localhost:5173
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const VENDOR_DIR = path.join(PUBLIC_DIR, 'vendor');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Check if vendor files exist
function checkVendorFiles() {
  const required = [
    path.join(VENDOR_DIR, 'react.production.min.js'),
    path.join(VENDOR_DIR, 'react-dom.production.min.js'),
    path.join(VENDOR_DIR, 'babel.min.js')
  ];
  const missing = required.filter(f => !fs.existsSync(f));
  return missing;
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // All routes serve index.html (SPA routing)
  if (!urlPath.startsWith('/vendor/') && !urlPath.startsWith('/assets/') && !urlPath.endsWith('.js') && !urlPath.endsWith('.css') && !urlPath.endsWith('.json')) {
    urlPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + urlPath);
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

// Startup checks
const missing = checkVendorFiles();
if (missing.length > 0) {
  console.log('\n ⚠️  Vendor files not found! Run setup first:\n');
  console.log('     agy-node setup.js\n');
  console.log(' Missing files:');
  missing.forEach(f => console.log('   -', path.basename(f)));
  console.log('');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log('\n ╔══════════════════════════════════════════╗');
  console.log(' ║  WorkWise AI - React Frontend Dev Server ║');
  console.log(' ╠══════════════════════════════════════════╣');
  console.log(` ║  URL: http://localhost:${PORT}              ║`);
  console.log(' ║  Press Ctrl+C to stop                    ║');
  console.log(' ╚══════════════════════════════════════════╝\n');
});
