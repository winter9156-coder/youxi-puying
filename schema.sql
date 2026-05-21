-- ============================================
-- 幼析·育见 数据库架构 v1.0
-- 适用于 MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS youxi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE youxi;

-- 班级表
CREATE TABLE classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '班级名称，如中二班',
  grade VARCHAR(20) COMMENT '年级：小班/中班/大班',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 教师表
CREATE TABLE teachers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL COMMENT 'SHA256 加密',
  class_id VARCHAR(36),
  role ENUM('admin','teacher') DEFAULT 'teacher',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 幼儿表
CREATE TABLE children (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  nickname VARCHAR(50),
  birth_date VARCHAR(20),
  class_id VARCHAR(36),
  tags TEXT COMMENT 'JSON 数组',
  notes TEXT,
  photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 观察记录表
CREATE TABLE observations (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36),
  child_ids TEXT NOT NULL COMMENT 'JSON 数组',
  date VARCHAR(20) NOT NULL,
  context VARCHAR(200) COMMENT '观察场景',
  white_description TEXT COMMENT '白描记录',
  child_expression TEXT COMMENT '幼儿表达表征',
  teacher_dialogue TEXT COMMENT '师幼共读对话',
  media_urls TEXT COMMENT 'JSON 数组，媒体文件ID列表',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 分析报告表
CREATE TABLE analysis_reports (
  id VARCHAR(36) PRIMARY KEY,
  observation_id VARCHAR(36) NOT NULL,
  child_id VARCHAR(36) NOT NULL,
  case_analysis LONGTEXT COMMENT 'AI 分析全文',
  status ENUM('draft','confirmed','modified') DEFAULT 'draft',
  teacher_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 教育方案表
CREATE TABLE education_plans (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36),
  type VARCHAR(50) NOT NULL COMMENT 'shared-thinking/pbl/theme-course/strategy',
  title VARCHAR(200) NOT NULL,
  child_ids TEXT COMMENT 'JSON 数组',
  observation_id VARCHAR(36),
  content LONGTEXT COMMENT 'Markdown 内容',
  tags TEXT COMMENT 'JSON 数组',
  status ENUM('draft','completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 沟通记录表
CREATE TABLE communication_records (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36),
  child_id VARCHAR(36),
  scenario TEXT,
  parent_type VARCHAR(50),
  goal TEXT,
  simulation_log TEXT COMMENT 'JSON 数组',
  suggestion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 媒体文件表（关联 COS）
CREATE TABLE media_files (
  id VARCHAR(36) PRIMARY KEY,
  observation_id VARCHAR(36),
  file_type ENUM('image','video') NOT NULL,
  cos_url VARCHAR(500) NOT NULL COMMENT 'COS 访问链接',
  description TEXT,
  file_size INT COMMENT '字节',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 系统设置表
CREATE TABLE app_settings (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB;

-- 插入默认设置
INSERT INTO app_settings (`key`, `value`) VALUES
('api_key', ''),
('api_endpoint', '/proxy/ai'),
('model_name', 'deepseek-chat'),
('theme', 'warm');
