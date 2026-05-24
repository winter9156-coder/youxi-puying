// === 幼儿 ===
export interface Child {
  id: string;
  name: string;
  nickname?: string;
  birthDate: string;
  class: string;
  avatar?: string;
  tags: string[];
  notes: string;
  createdAt: string;
}

// === 观察记录 ===
export interface Observation {
  id: string;
  childIds: string[];
  date: string;
  context: string;         // 游戏情境描述
  whiteDescription: string; // 白描记录
  childExpression: string;  // 幼儿表达表征（幼儿对自己行为的表达）
  teacherDialogue: string;  // 师幼共读对话记录
  mediaUrls: string[];
  teacherName?: string;     // 观察教师姓名
  createdAt: string;
}

// === 多视角分析标签 ===
export interface AnalysisPerspectives {
  developmentGuide?: string[];      // 发展指南
  schema?: string[];                // 图式理论
  psychology?: string[];            // 幼儿心理
  learningQuality?: string[];       // 学习品质
  socialDevelopment?: string[];     // 社会性发展
  zpd?: string;                     // 最近发展区
  multipleIntelligence?: string[];  // 多元智能
}

// === 分析报告 ===
export interface AnalysisReport {
  id: string;
  observationId: string;
  childId: string;
  caseAnalysis: string;       // 一、案例分析（教师积极行为）
  childEvaluation: string;    // 二、幼儿行为评价
  teacherEvaluation: string;  // 三、教师行为评价
  improvementMeasures: string;// 四、改进措施
  perspectives: AnalysisPerspectives;
  status: 'draft' | 'confirmed' | 'modified';
  teacherNote: string;
  createdAt: string;
}

// === 教学方案 ===
export type PlanType = 'shared-thinking' | 'pbl' | 'theme-course' | 'strategy';

export interface EducationPlan {
  id: string;
  type: PlanType;
  title: string;
  childIds: string[];
  observationId?: string;
  content: string;  // Markdown
  tags: string[];
  status: 'draft' | 'completed';
  createdAt: string;
}

// === 模拟对话记录 ===
export interface SimulationMessage {
  role: 'coach' | 'teacher' | 'parent';
  content: string;
  type?: 'simulation' | 'correction' | 'feedback';
}

export interface CommunicationRecord {
  id: string;
  childId: string;
  scenario: string;         // 沟通难题描述
  parentType: string;       // 家长类型
  goal: string;             // 沟通目标
  simulationLog: SimulationMessage[];
  suggestion: string;
  createdAt: string;
}

// === 设置 ===
export interface AppSettings {
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  theme: 'warm' | 'light';
  adminPassword: string;   // 管理员密码，用于保护密钥
}
