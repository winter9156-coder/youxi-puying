const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL_FILE = '/tmp/puying_url.txt';
const CF_BIN = '/Users/chuningwang/.npm/_npx/8a26fc3a61fe4212/node_modules/cloudflared/bin/cloudflared';

function start() {
  const proc = spawn(CF_BIN, ['tunnel', '--url', 'http://localhost:5173'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '' }
  });

  proc.stdout.on('data', d => {
    const text = d.toString();
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) { fs.writeFileSync(URL_FILE, m[0]); console.log(`[${new Date().toLocaleTimeString()}] URL: ${m[0]}`); }
  });

  proc.stderr.on('data', d => {
    const text = d.toString();
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) { fs.writeFileSync(URL_FILE, m[0]); console.log(`[${new Date().toLocaleTimeString()}] URL: ${m[0]}`); }
    if (text.includes('error') || text.includes('Error')) {
      console.log(`[${new Date().toLocaleTimeString()}] ERR: ${text.trim().substring(0,100)}`);
    }
  });

  proc.on('exit', (code, sig) => {
    console.log(`[${new Date().toLocaleTimeString()}] EXIT code=${code}, restart in 5s...`);
    setTimeout(start, 5000);
  });

  proc.on('error', e => {
    console.log(`[${new Date().toLocaleTimeString()}] ERROR: ${e.message}, restart in 10s...`);
    setTimeout(start, 10000);
  });
}

console.log('=== Cloudflare Tunnel Manager Started ===');
start();
