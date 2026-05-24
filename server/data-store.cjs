// 文件型数据存储引擎（JSON文件替代MySQL）
// 数据保存在 server/data/ 目录下
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TABLES = ['children', 'observations', 'analysis_reports', 'education_plans', 'communication_records', 'teachers', 'classes', 'app_settings'];

// 确保数据目录和表格文件存在
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const t of TABLES) {
    const fp = path.join(DATA_DIR, t + '.json');
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, '[]', 'utf8');
  }
}

ensureDir();

function tableFile(table) {
  return path.join(DATA_DIR, table + '.json');
}

function readTable(table) {
  try {
    const data = fs.readFileSync(tableFile(table), 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeTable(table, data) {
  fs.writeFileSync(tableFile(table), JSON.stringify(data, null, 2), 'utf8');
}

// ===== CRUD 接口 =====

function getAll(table, orderBy = '') {
  const rows = readTable(table);
  if (orderBy) {
    const dir = orderBy.endsWith('DESC') ? -1 : 1;
    const field = orderBy.split(' ')[0];
    rows.sort((a, b) => {
      if (a[field] < b[field]) return -dir;
      if (a[field] > b[field]) return dir;
      return 0;
    });
  }
  return rows;
}

function get(table, id) {
  const rows = readTable(table);
  return rows.find(r => r.id === id) || null;
}

function insert(table, data) {
  const rows = readTable(table);
  rows.push(data);
  writeTable(table, rows);
}

function update(table, id, data) {
  const rows = readTable(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) {
    // 不存在则新建（upsert）
    rows.push({ id, ...data });
  } else {
    rows[idx] = { ...rows[idx], ...data };
  }
  writeTable(table, rows);
  return true;
}

function remove(table, id) {
  const rows = readTable(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  writeTable(table, rows);
  return true;
}

function query(sql, params) {
  // 简单查询模拟
  const tableMatch = sql.match(/FROM\s+`?(\w+)`?\s*/i);
  if (!tableMatch) return [];
  const table = tableMatch[1];
  let rows = readTable(table);

  // WHERE 子句
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    const conditions = whereClause.split('AND').map(s => s.trim());
    rows = rows.filter(row => {
      return conditions.every((cond, i) => {
        const m = cond.match(/`?(\w+)`?\s*(=|LIKE)\s*\?/);
        if (!m) return true;
        // snake_case → camelCase（数据库字段名映射）
        const field = m[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const val = params[i];
        if (m[2] === '=') return row[field] == val;
        if (m[2] === 'LIKE') return (row[field] || '').includes(val.replace(/%/g, ''));
        return true;
      });
    });
  }

  // ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+`?(\w+)`?\s*(DESC|ASC)?/i);
  if (orderMatch) {
    const field = orderMatch[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const dir = orderMatch[2] === 'DESC' ? -1 : 1;
    rows.sort((a, b) => {
      if (a[field] < b[field]) return -dir;
      if (a[field] > b[field]) return dir;
      return 0;
    });
  }

  return rows;
}

// 获取完整数据包（所有表数据）
function getAllData() {
  const data = {};
  for (const t of TABLES) {
    data[t] = readTable(t);
  }
  return data;
}

// 导出数据包到JSON
function exportData() {
  return JSON.stringify(getAllData(), null, 2);
}

// 导入数据包
function importData(jsonStr) {
  const data = JSON.parse(jsonStr);
  for (const t of TABLES) {
    if (data[t] && Array.isArray(data[t])) {
      writeTable(t, data[t]);
    }
  }
}

// 获取数据统计
function getStats() {
  const stats = {};
  for (const t of TABLES) {
    stats[t] = readTable(t).length;
  }
  return stats;
}

// ========== 媒体文件存储（JSON文件中存储media索引，实际文件存本地）==========
const MEDIA_DIR = path.join(DATA_DIR, 'media');

function ensureMediaDir() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function saveMedia(id, data, mimeType) {
  ensureMediaDir();
  const metaPath = path.join(MEDIA_DIR, id + '.json');
  const filePath = path.join(MEDIA_DIR, id + '.bin');
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  fs.writeFileSync(metaPath, JSON.stringify({ id, mimeType, createdAt: new Date().toISOString() }));
  return true;
}

function getMedia(id) {
  ensureMediaDir();
  const filePath = path.join(MEDIA_DIR, id + '.bin');
  if (!fs.existsSync(filePath)) return null;
  const metaPath = path.join(MEDIA_DIR, id + '.json');
  let mimeType = '';
  try { const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); mimeType = meta.mimeType || ''; } catch {}
  return { data: fs.readFileSync(filePath).toString('base64'), mimeType };
}

function deleteMedia(id) {
  ensureMediaDir();
  const filePath = path.join(MEDIA_DIR, id + '.bin');
  const metaPath = path.join(MEDIA_DIR, id + '.json');
  let ok = false;
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); ok = true; }
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  return ok;
}

module.exports = { get, getAll, insert, update, remove, query, getAllData, exportData, importData, getStats, TABLES, saveMedia, getMedia, deleteMedia };
