import { openDB, type IDBPDatabase } from 'idb';
import type { Child, Observation, AnalysisReport, EducationPlan, CommunicationRecord, AppSettings } from '../types';
import * as api from './api';

const DB_NAME = 'edu-observation';
const DB_VERSION = 2;

// 统一数据层：API 优先，IndexedDB 回退
let useApi = false;
let apiCheckDone = false;

async function ensureMode() {
  if (!apiCheckDone) {
    apiCheckDone = true;
    useApi = await api.isApiAvailable();
  }
  return useApi;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('children')) {
          db.createObjectStore('children', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('observations')) {
          const obsStore = db.createObjectStore('observations', { keyPath: 'id' });
          obsStore.createIndex('date', 'date');
          obsStore.createIndex('childIds', 'childIds', { multiEntry: true });
        }
        if (!db.objectStoreNames.contains('analysisReports')) {
          const reportStore = db.createObjectStore('analysisReports', { keyPath: 'id' });
          reportStore.createIndex('observationId', 'observationId');
          reportStore.createIndex('childId', 'childId');
        }
        if (!db.objectStoreNames.contains('educationPlans')) {
          const planStore = db.createObjectStore('educationPlans', { keyPath: 'id' });
          planStore.createIndex('type', 'type');
          planStore.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('communicationRecords')) {
          const commStore = db.createObjectStore('communicationRecords', { keyPath: 'id' });
          commStore.createIndex('childId', 'childId');
        }
        if (!db.objectStoreNames.contains('mediaStore')) {
          db.createObjectStore('mediaStore');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ========== 幼儿 CRUD ==========

export async function getAllChildren(): Promise<Child[]> {
  if (await ensureMode()) return api.getAllChildren();
  const db = await getDB();
  return db.getAll('children');
}

export async function getChild(id: string): Promise<Child | undefined> {
  if (await ensureMode()) return api.getChild(id);
  const db = await getDB();
  return db.get('children', id);
}

export async function saveChild(child: Child): Promise<void> {
  if (await ensureMode()) { await api.saveChild(child); return; }
  const db = await getDB();
  await db.put('children', child);
}

export async function deleteChild(id: string): Promise<void> {
  if (await ensureMode()) { await api.deleteChild(id); return; }
  const db = await getDB();
  await db.delete('children', id);
}

// ========== 观察记录 CRUD ==========

export async function getAllObservations(): Promise<Observation[]> {
  if (await ensureMode()) return api.getAllObservations();
  const db = await getDB();
  const all = await db.getAll('observations');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getObservationsByChild(childId: string): Promise<Observation[]> {
  if (await ensureMode()) return api.getObservationsByChild(childId);
  const db = await getDB();
  return db.getAllFromIndex('observations', 'childIds', childId);
}

export async function getObservation(id: string): Promise<Observation | undefined> {
  if (await ensureMode()) return api.getObservation(id);
  const db = await getDB();
  return db.get('observations', id);
}

export async function saveObservation(obs: Observation): Promise<void> {
  if (await ensureMode()) { await api.saveObservation(obs); return; }
  const db = await getDB();
  await db.put('observations', obs);
}

export async function deleteObservation(id: string): Promise<void> {
  if (await ensureMode()) { await api.deleteObservation(id); return; }
  const db = await getDB();
  await db.delete('observations', id);
}

// ========== 分析报告 CRUD ==========

export async function getReportByObservation(observationId: string): Promise<AnalysisReport | undefined> {
  if (await ensureMode()) return api.getReportByObservation(observationId);
  const db = await getDB();
  const results = await db.getAllFromIndex('analysisReports', 'observationId', observationId);
  return results[0];
}

export async function getReportsByChild(childId: string): Promise<AnalysisReport[]> {
  if (await ensureMode()) return api.getReportsByChild(childId);
  const db = await getDB();
  return db.getAllFromIndex('analysisReports', 'childId', childId);
}

export async function getAnalysisReport(id: string): Promise<AnalysisReport | undefined> {
  if (await ensureMode()) return api.getAnalysisReport(id);
  const db = await getDB();
  return db.get('analysisReports', id);
}

export async function saveAnalysisReport(report: AnalysisReport): Promise<void> {
  if (await ensureMode()) { await api.saveAnalysisReport(report); return; }
  const db = await getDB();
  await db.put('analysisReports', report);
}

// ========== 教学方案 CRUD ==========

export async function getAllPlans(): Promise<EducationPlan[]> {
  if (await ensureMode()) return api.getAllPlans();
  const db = await getDB();
  const all = await db.getAll('educationPlans');
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPlansByType(type: string): Promise<EducationPlan[]> {
  if (await ensureMode()) return api.getPlansByType(type);
  const db = await getDB();
  return db.getAllFromIndex('educationPlans', 'type', type);
}

export async function savePlan(plan: EducationPlan): Promise<void> {
  if (await ensureMode()) { await api.savePlan(plan); return; }
  const db = await getDB();
  await db.put('educationPlans', plan);
}

export async function deletePlan(id: string): Promise<void> {
  if (await ensureMode()) { await api.deletePlan(id); return; }
  const db = await getDB();
  await db.delete('educationPlans', id);
}

// ========== 沟通记录 CRUD ==========

export async function saveCommunicationRecord(record: CommunicationRecord): Promise<void> {
  if (await ensureMode()) { await api.saveCommunicationRecord(record); return; }
  const db = await getDB();
  await db.put('communicationRecords', record);
}

export async function getCommunicationRecords(): Promise<CommunicationRecord[]> {
  if (await ensureMode()) return api.getCommunicationRecords();
  const db = await getDB();
  return db.getAll('communicationRecords');
}

// ========== 设置 ==========

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  apiEndpoint: '/proxy/ai',
  modelName: 'deepseek-chat',
  theme: 'warm',
  adminPassword: '',
};

export async function getSettings(): Promise<AppSettings> {
  if (await ensureMode()) return api.getSettings();
  const db = await getDB();
  const stored = await db.get('settings', 'app');
  return stored ? (stored.value as AppSettings) : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (await ensureMode()) { await api.saveSettings(settings); return; }
  const db = await getDB();
  await db.put('settings', { key: 'app', value: settings });
}

// ========== 媒体文件存储 ==========

export async function saveMedia(id: string, blob: Blob): Promise<void> {
  // 优先使用服务端 API（跨设备共享）
  if (await ensureMode()) {
    const base64 = await new Promise<string>(resolve => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(',')[1]);
      r.readAsDataURL(blob);
    });
    await api.uploadMedia(id, base64, blob.type);
    return;
  }
  const db = await getDB();
  await db.put('mediaStore', blob, id);
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  // 优先使用服务端 API（跨设备共享）
  if (await ensureMode()) {
    return api.fetchMedia(id);
  }
  const db = await getDB();
  return db.get('mediaStore', id);
}

export async function deleteMedia(id: string): Promise<void> {
  if (await ensureMode()) { await api.deleteMedia(id); return; }
  const db = await getDB();
  await db.delete('mediaStore', id);
}
