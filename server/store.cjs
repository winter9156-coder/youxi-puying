// 数据存储入口 - 自动选择 PostgreSQL 或 JSON 文件存储
const usePG = !!process.env.DATABASE_URL;

let store;
if (usePG) {
  console.log('📦 使用 PostgreSQL 数据存储');
  store = require('./data-store-pg.cjs');
} else {
  console.log('📦 使用 JSON 文件数据存储');
  store = require('./data-store.cjs');
}

module.exports = store;
