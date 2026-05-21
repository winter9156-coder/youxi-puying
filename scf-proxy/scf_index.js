'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  json: 'application/json',
};

const DIST = path.join(__dirname, 'dist');

function serveStatic(filePath) {
  const fullPath = path.join(DIST, filePath);
  try {
    const data = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return {
      isBase64Encoded: true,
      statusCode: 200,
      headers: {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': ext === 'html' ? 'no-cache' : 'max-age=31536000',
      },
      body: data.toString('base64'),
    };
  } catch (e) {
    return null;
  }
}

exports.main_handler = async (event) => {
  const pathname = event.path || '/';
  const method = event.httpMethod || 'GET';
  const body = event.body || '';

  // ===== API Proxy: DeepSeek =====
  if (pathname.startsWith('/proxy/ai/')) {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!apiKey) {
      return { isBase64Encoded: false, statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }) };
    }

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.deepseek.com',
        port: 443,
        path: pathname.replace('/proxy/ai', ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        timeout: 60000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            isBase64Encoded: false,
            statusCode: res.statusCode,
            headers: {
              'Content-Type': res.headers['content-type'] || 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: data,
          });
        });
      });
      req.on('error', (e) => {
        resolve({ isBase64Encoded: false, statusCode: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: e.message }) });
      });
      req.on('timeout', () => { req.destroy();
        resolve({ isBase64Encoded: false, statusCode: 504,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Gateway Timeout' }) });
      });
      req.write(body);
      req.end();
    });
  }

  // ===== CORS Preflight =====
  if (method === 'OPTIONS') {
    return { isBase64Encoded: false, statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '' };
  }

  // ===== Static Files =====
  // SPA: any non-file path -> index.html
  let filePath = pathname === '/' ? '/index.html' : pathname.substring(1);
  
  let result = serveStatic(filePath);
  if (result) return result;

  // SPA fallback
  result = serveStatic('index.html');
  if (result) return result;

  return { isBase64Encoded: false, statusCode: 404,
    headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    body: 'Not Found' };
};
