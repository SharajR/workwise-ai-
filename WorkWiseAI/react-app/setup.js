/**
 * WorkWise AI - React App Setup Script
 * Run once with: agy-node setup.js
 * Downloads React, ReactDOM and Babel Standalone for offline use.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const VENDOR_DIR = path.join(__dirname, 'public', 'vendor');
if (!fs.existsSync(VENDOR_DIR)) fs.mkdirSync(VENDOR_DIR, { recursive: true });

const FILES = [
  {
    url: 'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
    dest: path.join(VENDOR_DIR, 'react.production.min.js'),
    label: 'React 18'
  },
  {
    url: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
    dest: path.join(VENDOR_DIR, 'react-dom.production.min.js'),
    label: 'ReactDOM 18'
  },
  {
    url: 'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',
    dest: path.join(VENDOR_DIR, 'babel.min.js'),
    label: 'Babel Standalone'
  }
];

function download(url, dest, label) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  ✓ ${label} already downloaded, skipping.`);
      return resolve();
    }
    console.log(`  ⟳ Downloading ${label}...`);
    const file = fs.createWriteStream(dest);

    function get(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          const size = fs.statSync(dest).size;
          console.log(`  ✓ ${label} saved (${(size / 1024).toFixed(0)} KB)`);
          resolve();
        });
      }).on('error', err => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }
    get(url);
  });
}

async function setup() {
  console.log('\n WorkWise AI - React App Setup\n');
  console.log(' Downloading vendor libraries...\n');
  try {
    for (const f of FILES) {
      await download(f.url, f.dest, f.label);
    }
    console.log('\n ✅ Setup complete! Now run:\n');
    console.log('    agy-node dev-server.js\n');
    console.log('    Then open: http://localhost:5173\n');
  } catch (err) {
    console.error('\n ❌ Download failed:', err.message);
    console.error('    Make sure you have internet access and try again.\n');
    process.exit(1);
  }
}

setup();
