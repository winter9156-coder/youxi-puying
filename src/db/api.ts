// ============================================
// 云端 API 数据层
// 当部署到服务器时，替代 IndexedDB
// ============================================
import type { Child, Observation, AnalysisReport, EducationPlan, CommunicationRecord, AppSettings } from '../types';

const BASE = '/api';

async function api(method: string, path: string, body?: any) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${method} ${path}: ${res.status}`);
  return res.json();
}

// 检测 API 是否可用
let _apiAvailable: boolean | null = null;
export async function isApiAvailable(): Promise<boolean> {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const res = await fetch(`${BASE}/children`, { method: 'GET' });
    _apiAvailable = res.ok;
  } catch {
    _apiAvailable = false;
  }
  return _apiAvailable;
}

// ========== 幼儿 ==========
export async function getAllChildren(): Promise<Child[]> {
  return api('GET', '/children');
}
export async function getChild(id: string): Promise<Child | undefined> {
  return api('GET', `/children/${id}`);
}
export async function saveChild(child: Child): Promise<void> {
  await api('PUT', `/children/${child.id}`, child);
}
export async function deleteChild(id: string): Promise<void> {
  await api('DELETE', `/children/${id}`);
}

// ========== 观察记录 ==========
export async function getAllObservations(): Promise<Observation[]> {
  const list = await api('GET', '/observations');
  return list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
export async function getObservationsByChild(childId: string): Promise<Observation[]> {
  return api('GET', `/observations?childId=${childId}`);
}
export async function getObservation(id: string): Promise<Observation | undefined> {
  return api('GET', `/observations/${id}`);
}
export async function saveObservation(obs: Observation): Promise<void> {
  await api('PUT', `/observations/${obs.id}`, obs);
}
export async function deleteObservation(id: string): Promise<void> {
  await api('DELETE', `/observations/${id}`);
}

// ========== 分析报告 ==========
export async function getReportByObservation(observationId: string): Promise<AnalysisReport | undefined> {
  return api('GET', `/analysis_reports?observationId=${observationId}`);
}
export async function getReportsByChild(childId: string): Promise<AnalysisReport[]> {
  return api('GET', `/analysis_reports?childId=${childId}`);
}
export async function getAnalysisReport(id: string): Promise<AnalysisReport | undefined> {
  return api('GET', `/analysis_reports/${id}`);
}
export async function saveAnalysisReport(report: AnalysisReport): Promise<void> {
  await api('PUT', `/analysis_reports/${report.id}`, report);
}

// ========== 教学方案 ==========
export async function getAllPlans(): Promise<EducationPlan[]> {
  const list = await api('GET', '/education_plans');
  return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export async function getPlansByType(type: string): Promise<EducationPlan[]> {
  const all = await api('GET', '/education_plans');
  return all.filter((p: any) => p.type === type);
}
export async function savePlan(plan: EducationPlan): Promise<void> {
  await api('PUT', `/education_plans/${plan.id}`, plan);
}
export async function deletePlan(id: string): Promise<void> {
  await api('DELETE', `/education_plans/${id}`);
}

// ========== 沟通记录 ==========
export async function saveCommunicationRecord(record: CommunicationRecord): Promise<void> {
  await api('PUT', `/communication_records/${record.id}`, record);
}
export async function getCommunicationRecords(): Promise<CommunicationRecord[]> {
  return api('GET', '/communication_records');
}

// ========== 设置 ==========
const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '', apiEndpoint: '/proxy/ai', modelName: 'deepseek-chat', theme: 'warm', adminPassword: '',
};
export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await api('GET', '/app_settings/app');
    return row ? row.value : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
export async function saveSettings(settings: AppSettings): Promise<void> {
  await api('PUT', '/app_settings/app', { key: 'app', value: settings });
}

// ========== 媒体文件 ==========
export async function saveMedia(id: string, blob: Blob): Promise<void> {
  // 媒体文件上传到 COS，需要额外的上传接口
  const formData = new FormData();
  formData.append('file', blob, id);
  await fetch(`${BASE}/media/upload/${id}`, { method: 'POST', body: formData });
}
export async function getMedia(id: string): Promise<Blob | undefined> {
  const res = await fetch(`${BASE}/media/${id}`);
  if (!res.ok) return undefined;
  return res.blob();
}
export async function deleteMedia(id: string): Promise<void> {
  await api('DELETE', `/media/${id}`);
}
