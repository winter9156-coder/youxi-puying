// REST API 路由 - 使用文件型数据存储
const store = require('./store.cjs');
const crypto = require('crypto');

function parseJSON(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function createRouter() {
  return async (req, res, url, method) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const send = (code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const readBody = () => new Promise(resolve => {
      let body = [];
      req.on('data', c => body.push(c));
      req.on('end', () => resolve(JSON.parse(Buffer.concat(body).toString())));
    });

    const match = url.match(/^\/api\/(\w+)(?:\/([a-zA-Z0-9-]+))?(\?.*)?$/);
    if (!match) return false;

    const table = match[1];
    const id = match[2];
    const qs = match[3] || '';

    const validTables = ['children', 'observations', 'analysis_reports', 'education_plans', 'communication_records', 'teachers', 'classes', 'app_settings'];
    if (!validTables.includes(table)) { send(400, { error: 'Invalid table' }); return true; }

    try {
      (async () => {
      switch (method) {
        case 'GET': {
          // 特殊查询：按 observationId 查报告（优先处理查询参数）
          if (table === 'analysis_reports' && qs.includes('observationId=')) {
            const obsId = qs.split('observationId=')[1].split('&')[0];
            const rows = await store.query('SELECT * FROM analysis_reports WHERE observation_id = ?', [obsId]);
            send(200, rows[0] || null);
          } else if (table === 'observations' && qs.includes('childId=')) {
            const childId = qs.split('childId=')[1].split('&')[0];
            const rows = await store.query('SELECT * FROM observations WHERE child_ids LIKE ?', [`%${childId}%`]);
            send(200, rows);
          } else if (table === 'analysis_reports' && qs.includes('childId=')) {
            const childId = qs.split('childId=')[1].split('&')[0];
            const rows = await store.query('SELECT * FROM analysis_reports WHERE child_id = ?', [childId]);
            send(200, rows);
          } else if (id) {
            send(200, await store.get(table, id));
          } else {
            send(200, await store.getAll(table, 'created_at DESC'));
          }
          break;
        }
        case 'POST': {
          const data = await readBody();
          data.id = data.id || crypto.randomUUID();
          await store.insert(table, data);
          send(201, data);
          break;
        }
        case 'PUT': {
          if (!id) { send(400, { error: 'ID required' }); return true; }
          const data = await readBody();
          delete data.id;
          await store.update(table, id, data);
          send(200, { success: true });
          break;
        }
        case 'DELETE': {
          if (!id) { send(400, { error: 'ID required' }); return true; }
          await store.remove(table, id);
          send(200, { success: true });
          break;
        }
        default:
          send(405, { error: 'Method not allowed' });
      }
      })().catch(e => { send(500, { error: e.message }); });
    } catch (e) {
      send(500, { error: e.message });
    }
    return true;
  };
}

module.exports = createRouter;
