// ============================================
// 数据库连接模块
// 使用环境变量配置 MySQL 连接
// ============================================
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'youxi',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
    // 初始化表结构
    await initTables(pool);
  }
  return pool;
}

async function initTables(p) {
  const sql = `
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL,
      grade VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(50) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(100) NOT NULL,
      class_id VARCHAR(36), role ENUM('admin','teacher') DEFAULT 'teacher',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS children (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(50) NOT NULL,
      nickname VARCHAR(50), birth_date VARCHAR(20),
      class_id VARCHAR(36), tags TEXT, notes TEXT, photo_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS observations (
      id VARCHAR(36) PRIMARY KEY, teacher_id VARCHAR(36),
      child_ids TEXT NOT NULL, date VARCHAR(20) NOT NULL,
      context VARCHAR(200), white_description TEXT,
      child_expression TEXT, teacher_dialogue TEXT,
      media_urls TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS analysis_reports (
      id VARCHAR(36) PRIMARY KEY, observation_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36) NOT NULL, case_analysis LONGTEXT,
      status ENUM('draft','confirmed','modified') DEFAULT 'draft',
      teacher_note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS education_plans (
      id VARCHAR(36) PRIMARY KEY, teacher_id VARCHAR(36),
      type VARCHAR(50) NOT NULL, title VARCHAR(200) NOT NULL,
      child_ids TEXT, observation_id VARCHAR(36),
      content LONGTEXT, tags TEXT,
      status ENUM('draft','completed') DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS communication_records (
      id VARCHAR(36) PRIMARY KEY, teacher_id VARCHAR(36),
      child_id VARCHAR(36), scenario TEXT,
      parent_type VARCHAR(50), goal TEXT,
      simulation_log TEXT, suggestion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS app_settings (
      \`key\` VARCHAR(50) PRIMARY KEY, \`value\` TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    try { await p.execute(stmt); } catch (e) { /* table may already exist */ }
  }
}

// ========== CRUD 操作 ==========

async function query(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function get(table, id) {
  const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function getAll(table, orderBy = 'created_at DESC') {
  return query(`SELECT * FROM \`${table}\` ORDER BY ${orderBy}`);
}

async function insert(table, data) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = keys.map(() => '?').join(',');
  await query(`INSERT INTO \`${table}\` (${keys.join(',')}) VALUES (${placeholders})`, vals);
}

async function update(table, id, data) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const setClause = keys.map(k => `\`${k}\` = ?`).join(',');
  await query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, [...vals, id]);
}

async function remove(table, id) {
  await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
}

module.exports = { getPool, query, get, getAll, insert, update, remove, DB_CONFIG };
