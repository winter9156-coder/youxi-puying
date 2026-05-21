const http = require('http');
const { execSync, spawn } = require('child_process');
const https = require('https');

const TUNNEL_URL = 'https://puyingxiangyang.loca.lt/';
const CHECK_INTERVAL = 30000; // 30s

function pingTunnel() {
  const req = https.get(TUNNEL_URL, { timeout: 10000 }, res => {
    console.log(`[${new Date().toLocaleTimeString()}] ping OK (${res.statusCode})`);
    res.resume();
  });
  req.on('error', () => {
    console.log(`[${new Date().toLocaleTimeString()}] tunnel dead, restarting...`);
    try {
      execSync("pkill -f 'lt --port' 2>/dev/null; sleep 1");
      const child = spawn('/Users/chuningwang/.workbuddy/binaries/node/versions/22.12.0/bin/lt', 
        ['--port', '5173', '--subdomain', 'puyingxiangyang'], {
        stdio: 'ignore',
        detached: true
      });
      child.unref();
      console.log(`[${new Date().toLocaleTimeString()}] tunnel restarted`);
    } catch(e) {
      console.log('restart failed:', e.message);
    }
  });
}

console.log('Tunnel keepalive started');
pingTunnel();
setInterval(pingTunnel, CHECK_INTERVAL);
