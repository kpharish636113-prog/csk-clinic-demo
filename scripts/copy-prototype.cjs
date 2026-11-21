const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'apps', 'web', 'public', 'prototype');

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(path.join(destination, 'assets'), { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && ['.html', '.js', '.css'].includes(path.extname(entry.name))) {
    fs.copyFileSync(path.join(root, entry.name), path.join(destination, entry.name));
  }
}

const apiBaseUrl = process.env.VITE_API_URL?.trim();
if (apiBaseUrl) {
  let normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  if (normalizedApiBaseUrl.startsWith('/')) {
    if (!normalizedApiBaseUrl.endsWith('/api')) {
      throw new Error('A relative VITE_API_URL must end in /api.');
    }
  } else {
    const parsedApiUrl = new URL(normalizedApiBaseUrl);
    if (!['http:', 'https:'].includes(parsedApiUrl.protocol) || !parsedApiUrl.pathname.replace(/\/+$/, '').endsWith('/api')) {
      throw new Error('VITE_API_URL must be an HTTP(S) URL ending in /api.');
    }
    normalizedApiBaseUrl = parsedApiUrl.toString().replace(/\/+$/, '');
  }
  const demoEmail = process.env.VITE_DEMO_EMAIL?.trim() || 'admin@cskclinic.local';
  fs.writeFileSync(
    path.join(destination, 'api-config.js'),
    `window.CSK_CLINIC_API_BASE_URL = ${JSON.stringify(normalizedApiBaseUrl)};\nwindow.CSK_CLINIC_DEMO_EMAIL = ${JSON.stringify(demoEmail)};\n`,
  );
}

const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
    const source = path.join(assets, entry.name);
    const target = path.join(destination, 'assets', entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(source, target, { recursive: true, force: true });
    } else {
      fs.copyFileSync(source, target);
    }
  }
}
