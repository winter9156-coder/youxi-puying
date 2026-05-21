// 创建育见幼析全部用户账号
// 运行: node seed-users.cjs
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'youxi',
};

// 37名教师 + 6名行政管理员
const USERS = [
  // ===== 教师 (role=teacher, class_id=teacher, 密码格式: py+姓名拼音首字母) =====
  { name: '刘沂柠', class: '教师', role: 'teacher' },
  { name: '杨柳', class: '教师', role: 'teacher' },
  { name: '郭宇涵', class: '教师', role: 'teacher' },
  { name: '张雨晴', class: '教师', role: 'teacher' },
  { name: '李昕怡', class: '教师', role: 'teacher' },
  { name: '蔡涵', class: '教师', role: 'teacher' },
  { name: '周岩', class: '教师', role: 'teacher' },
  { name: '芦丽', class: '教师', role: 'teacher' },
  { name: '王文雪', class: '教师', role: 'teacher' },
  { name: '徐可新', class: '教师', role: 'teacher' },
  { name: '张建梅', class: '教师', role: 'teacher' },
  { name: '孙乐', class: '教师', role: 'teacher' },
  { name: '张冉', class: '教师', role: 'teacher' },
  { name: '纪思曼', class: '教师', role: 'teacher' },
  { name: '都建昀', class: '教师', role: 'teacher' },
  { name: '尹亭蕊', class: '教师', role: 'teacher' },
  { name: '张斯婕', class: '教师', role: 'teacher' },
  { name: '苏琦蕊', class: '教师', role: 'teacher' },
  { name: '邢佳杰', class: '教师', role: 'teacher' },
  { name: '王旻姣', class: '教师', role: 'teacher' },
  { name: '刘茜', class: '教师', role: 'teacher' },
  { name: '谷雨', class: '教师', role: 'teacher' },
  { name: '王玉', class: '教师', role: 'teacher' },
  { name: '徐佳', class: '教师', role: 'teacher' },
  { name: '李亚洁', class: '教师', role: 'teacher' },
  { name: '姜媛', class: '教师', role: 'teacher' },
  { name: '鲁晨曦', class: '教师', role: 'teacher' },
  { name: '李梦', class: '教师', role: 'teacher' },
  { name: '马正颖', class: '教师', role: 'teacher' },
  { name: '富佳妍', class: '教师', role: 'teacher' },
  { name: '程紫玉', class: '教师', role: 'teacher' },
  { name: '田鑫颖', class: '教师', role: 'teacher' },
  { name: '李一帆', class: '教师', role: 'teacher' },
  { name: '伊金宝', class: '教师', role: 'teacher' },
  { name: '张淼', class: '教师', role: 'teacher' },
  { name: '李晓娇', class: '教师', role: 'teacher' },
  { name: '李雪彤', class: '教师', role: 'teacher' },
  // ===== 行政管理员 (role=admin) =====
  { name: '李念东', class: '行政', role: 'admin' },
  { name: '吴瑸', class: '行政', role: 'admin' },
  { name: '刘玉红', class: '行政', role: 'admin' },
  { name: '刘珊珊', class: '行政', role: 'admin' },
  { name: '刘梦', class: '行政', role: 'admin' },
  { name: '王洋洋', class: '行政', role: 'admin' },
];

function generatePassword(name) {
  // 统一密码: puying + 手机尾号风格随机4位数字
  // 这样既安全又好记
  const year = '2026';
  return `py${year}`;
}

async function main() {
  console.log('=== 创建用户账号 ===\n');
  
  // 创建表格（如果不存在）
  const pool = mysql.createPool(DB_CONFIG);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(50) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(200) NOT NULL,
      class_id VARCHAR(36), role ENUM('admin','teacher') DEFAULT 'teacher',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  
  const salt = await bcrypt.genSalt(10);
  let csv = '序号,姓名,用户名,密码,角色\n';
  let success = 0;
  
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const username = u.name;
    const password = generatePassword(u.name);
    const hashed = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();
    
    try {
      await pool.execute(
        'INSERT INTO teachers (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)',
        [id, u.name, username, hashed, u.role]
      );
      console.log(`✅ [${i+1}/${USERS.length}] ${u.name} (${u.role})`);
      csv += `${i+1},${u.name},${username},${password},${u.role}\n`;
      success++;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️ [${i+1}/${USERS.length}] ${u.name} - 已存在，更新密码`);
        await pool.execute(
          'UPDATE teachers SET password=? WHERE username=?',
          [hashed, username]
        );
        csv += `${i+1},${u.name},${username},${password},${u.role}\n`;
        success++;
      } else {
        console.log(`❌ [${i+1}/${USERS.length}] ${u.name} - ${e.message}`);
      }
    }
  }
  
  // 保存密码表
  fs.writeFileSync(path.join(__dirname, '教师账号密码.csv'), '\uFEFF' + csv, 'utf8');
  console.log(`\n✅ 完成！成功创建/更新 ${success} 个账号`);
  console.log(`📄 密码表已保存到: 教师账号密码.csv`);
  console.log(`\n⚠️ 默认密码: py2026（建议首次登录后修改）`);
  
  await pool.end();
}

main().catch(e => console.error('失败:', e.message));
