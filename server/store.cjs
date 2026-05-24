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

// 添加 init 方法：PG 初始化表结构，文件存储直接成功
store.init = async function() {
  if (store.initSchema) {
    await store.initSchema();
    console.log('✅ 数据库表结构已就绪');
  }
  return true;
};

module.exports = store;
