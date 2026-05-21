const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const URL_FILE = '/tmp/puying_url.txt';
const SSH_ARGS = [
  '-o', 'TCPKeepAlive=yes',
  '-o', 'ServerAliveInterval=10',
  '-o', 'ServerAliveCountMax=2',
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'ConnectTimeout=5',
  '-o', 'ExitOnForwardFailure=yes',
  '-R', '80:localhost:5173',
  'nokey@localhost.run'
];

function start() {
  const proc = spawn('/usr/bin/ssh', SSH_ARGS, { stdio: ['ignore', 'pipe', 'pipe'] });
  const pid = proc.pid;

  proc.stdout.on('data', d => {
    const text = d.toString();
    const m = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
    if (m) {
      fs.writeFileSync(URL_FILE, m[0]);
      console.log(`[${new Date().toLocaleTimeString()}] TUNNEL: ${m[0]}`);
    }
  });

  proc.stderr.on('data', d => {
    const text = d.toString();
    if (text.includes('error') || text.includes('failed')) {
      console.log(`[${new Date().toLocaleTimeString()}] ERR: ${text.trim().substring(0, 100)}`);
    }
  });

  proc.on('exit', (code, sig) => {
    console.log(`[${new Date().toLocaleTimeString()}] EXIT: code=${code} sig=${sig}, restart in 3s...`);
    setTimeout(start, 3000);
  });

  proc.on('error', e => {
    console.log(`[${new Date().toLocaleTimeString()}] ERROR: ${e.message}, restart in 5s...`);
    setTimeout(start, 5000);
  });
}

// Self-ping every 60s to keep connection alive
function selfPing() {
  try {
    const url = fs.readFileSync(URL_FILE, 'utf8').trim();
    if (url) {
      http.get(url.replace('https', 'http'), { timeout: 5000 }, r => r.resume());
    }
  } catch(e) {}
}

console.log('=== TUNNEL MANAGER STARTED ===');
start();
setInterval(selfPing, 60000);
