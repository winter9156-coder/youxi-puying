// ============================================
// PostgreSQL 数据存储层
// 替换 data-store.cjs，当 DATABASE_URL 存在时使用
// 保持与 data-store.cjs 相同的接口
// ============================================
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// 初始化表结构
async function initSchema() {
  const p = getPool();
  const tables = ['children', 'observations', 'analysis_reports', 'education_plans', 'communication_records', 'app_settings'];
  for (const t of tables) {
    await p.query(`
      CREATE TABLE IF NOT EXISTS ${t} (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
  // 媒体文件表（base64存储）
  await p.query(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ PostgreSQL schema initialized (with media table)');
}

// 获取单条记录
async function get(table, id) {
  if (!id) return null;
  const p = getPool();
  const r = await p.query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  if (r.rows.length === 0) return null;
  return { id, ...r.rows[0].data };
}

// 获取全部记录
async function getAll(table, orderBy) {
  const p = getPool();
  const r = await p.query(`SELECT id, data FROM ${table} ORDER BY created_at DESC`);
  return r.rows.map(row => ({ id: row.id, ...row.data }));
}

// 插入记录
async function insert(table, data) {
  const p = getPool();
  const { id, ...rest } = data;
  await p.query(
    `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`,
    [id || require('crypto').randomUUID(), JSON.stringify(rest)]
  );
  return data;
}

// 更新记录（upsert）
async function update(table, id, data) {
  const p = getPool();
  await p.query(
    `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`,
    [id, JSON.stringify(data)]
  );
  return true;
}

// 删除记录
async function remove(table, id) {
  const p = getPool();
  const r = await p.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return r.rowCount > 0;
}

// 简易 SQL 查询
async function query(sql, params) {
  const p = getPool();
  // 解析 SQL 语句
  const tableMatch = sql.match(/FROM\s+`?(\w+)`?\s*/i);
  if (!tableMatch) return [];
  const table = tableMatch[1];

  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|\$)/i);
  let querySQL = `SELECT id, data FROM ${table}`;
  const values = [];

  if (whereMatch) {
    const whereClause = whereMatch[1];
    const conditions = whereClause.split('AND').map(s => s.trim());
    const conds = [];
    conditions.forEach((cond, i) => {
      const m = cond.match(/`?(\w+)`?\s*(=|LIKE)\s*\?/);
      if (m) {
        // Map snake_case to camelCase JSON field access
        const field = m[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (m[2] === '=') {
          conds.push(`data->>'${field}' = $${i + 1}`);
          values.push(params[i]);
        } else if (m[2] === 'LIKE') {
          conds.push(`data->>'${field}' LIKE $${i + 1}`);
          values.push(params[i]);
        }
      }
    });
    if (conds.length > 0) {
      querySQL += ' WHERE ' + conds.join(' AND ');
    }
  }

  // ORDER BY
  if (sql.toUpperCase().includes('ORDER BY')) {
    const orderMatch = sql.match(/ORDER\s+BY\s+`?(\w+)`?\s*(DESC|ASC)?/i);
    if (orderMatch) {
      const field = orderMatch[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const dir = orderMatch[2] === 'DESC' ? 'DESC' : 'ASC';
      querySQL += ` ORDER BY data->>'${field}' ${dir}`;
    }
  } else {
    querySQL += ' ORDER BY created_at DESC';
  }

  const r = await p.query(querySQL, values);
  return r.rows.map(row => ({ id: row.id, ...row.data }));
}

// 统计
async function getStats() {
  const p = getPool();
  const tables = ['children', 'observations', 'analysis_reports', 'education_plans', 'communication_records'];
  const stats = {};
  for (const t of tables) {
    const r = await p.query(`SELECT COUNT(*) as count FROM ${t}`);
    stats[t] = parseInt(r.rows[0].count);
  }
  return stats;
}

// 获取全部数据（管理员）
async function getAllData() {
  const tables = ['children', 'observations', 'analysis_reports', 'education_plans', 'communication_records', 'app_settings'];
  const result = {};
  for (const t of tables) {
    result[t] = await getAll(t);
  }
  return result;
}

// 导出数据
async function exportData() {
  const data = await getAllData();
  return JSON.stringify(data, null, 2);
}

// ========== 媒体文件存储 ==========

// 保存媒体文件（base64）
async function saveMedia(id, data, mimeType) {
  const p = getPool();
  await p.query(
    `INSERT INTO media (id, data, mime_type) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, mime_type = $3`,
    [id, data, mimeType || '']
  );
  return true;
}

// 获取媒体文件
async function getMedia(id) {
  const p = getPool();
  const r = await p.query(`SELECT data, mime_type FROM media WHERE id = $1`, [id]);
  if (r.rows.length === 0) return null;
  return { data: r.rows[0].data, mimeType: r.rows[0].mime_type };
}

// 删除媒体文件
async function deleteMedia(id) {
  const p = getPool();
  const r = await p.query(`DELETE FROM media WHERE id = $1`, [id]);
  return r.rowCount > 0;
}

// 清空指定表的所有数据
async function clearTable(table) {
  const p = getPool();
  await p.query(`DELETE FROM ${table}`);
  return true;
}

module.exports = { initSchema, get, getAll, insert, update, remove, query, getStats, getAllData, exportData, saveMedia, getMedia, deleteMedia, clearTable };
