import { TaskRecord, Project, RoleKey } from './types';
import { createClient } from './supabase/client';

const TASK_KEY = 'virtual-office-records';
const PROJECT_KEY = 'virtual-office-projects';

async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

// === Task Records ===

export function saveTaskRecord(record: TaskRecord): void {
  const records = loadTaskRecords();
  records.push(record);
  safeSet(TASK_KEY, records, 200);
  saveTaskToSupabase(record);
}

async function saveTaskToSupabase(record: TaskRecord) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('task_records').upsert({
    id: record.id,
    user_id: userId,
    worker_id: record.workerId,
    worker_name: record.workerName,
    instruction: record.instruction.slice(0, 5000),
    result: record.result.slice(0, 10000),
    duration_ms: record.durationMs,
    metadata: { workerTitle: record.workerTitle, roleKey: record.roleKey, revisions: record.revisions.length },
  });
}

export function loadTaskRecords(): TaskRecord[] {
  return safeGet<TaskRecord[]>(TASK_KEY) ?? [];
}

export function getWorkerRecords(workerId: string): TaskRecord[] {
  return loadTaskRecords().filter(r => r.workerId === workerId);
}

export async function syncTasksFromSupabase() {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  const { data } = await supabase
    .from('task_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (data && data.length > 0) {
    const records: TaskRecord[] = data.map(d => ({
      id: d.id,
      workerId: d.worker_id,
      workerName: d.worker_name,
      workerTitle: d.metadata?.workerTitle ?? '',
      roleKey: d.metadata?.roleKey ?? 'spPlanner',
      instruction: d.instruction,
      result: d.result,
      revisions: [],
      createdAt: new Date(d.created_at).getTime(),
      completedAt: new Date(d.created_at).getTime() + (d.duration_ms ?? 0),
      durationMs: d.duration_ms ?? 0,
    }));
    safeSet(TASK_KEY, records, 200);
  }
}

// === Project History ===

export interface ProjectSnapshot {
  id: string;
  productInfo: string;
  phases: { roleKey: RoleKey; workerName: string; result: string; team: string }[];
  finalReport: string;
  messageCount: number;
  createdAt: number;
  completedAt: number;
  durationMs: number;
}

export function saveProjectSnapshot(project: Project, workerNames: Record<string, string>): void {
  if (!project.finalReport || !project.completedAt) return;

  const snap: ProjectSnapshot = {
    id: project.id,
    productInfo: project.productInfo,
    phases: project.phases.map(p => ({
      roleKey: p.roleKey,
      workerName: workerNames[p.workerId] ?? p.roleKey,
      result: p.result.slice(0, 2000),
      team: p.team,
    })),
    finalReport: project.finalReport.slice(0, 3000),
    messageCount: project.messages.length,
    createdAt: project.createdAt,
    completedAt: project.completedAt,
    durationMs: project.completedAt - project.createdAt,
  };

  const history = loadProjectHistory();
  history.push(snap);
  safeSet(PROJECT_KEY, history, 50);
  saveProjectToSupabase(snap);
}

async function saveProjectToSupabase(snap: ProjectSnapshot) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('project_snapshots').upsert({
    id: snap.id,
    user_id: userId,
    product_info: snap.productInfo,
    final_report: snap.finalReport,
    phases: snap.phases,
    worker_names: Object.fromEntries(snap.phases.map(p => [p.roleKey, p.workerName])),
  });
}

export function loadProjectHistory(): ProjectSnapshot[] {
  return safeGet<ProjectSnapshot[]>(PROJECT_KEY) ?? [];
}

export async function syncProjectsFromSupabase() {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  const { data } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (data && data.length > 0) {
    const snaps: ProjectSnapshot[] = data.map(d => ({
      id: d.id,
      productInfo: d.product_info ?? '',
      phases: (d.phases as ProjectSnapshot['phases']) ?? [],
      finalReport: d.final_report ?? '',
      messageCount: 0,
      createdAt: new Date(d.created_at).getTime(),
      completedAt: new Date(d.created_at).getTime(),
      durationMs: 0,
    }));
    safeSet(PROJECT_KEY, snaps, 50);
  }
}

export function getAgentHistory(roleKey: RoleKey, limit = 3): string {
  const history = loadProjectHistory();
  const relevant = history
    .filter(p => p.phases.some(ph => ph.roleKey === roleKey))
    .slice(-limit);

  if (relevant.length === 0) return '';

  const entries = relevant.map(p => {
    const phase = p.phases.find(ph => ph.roleKey === roleKey);
    if (!phase) return '';
    const date = new Date(p.createdAt).toLocaleDateString('ko-KR');
    return `[${date}] 상품: ${p.productInfo.slice(0, 100)}\n결과 요약: ${phase.result.slice(0, 500)}`;
  }).filter(Boolean);

  if (entries.length === 0) return '';
  return `\n\n[과거 작업 히스토리 - 참고하여 더 나은 결과를 만드세요]\n${entries.join('\n---\n')}`;
}

export function getProjectStats() {
  const history = loadProjectHistory();
  const roleStats: Record<string, number> = {};
  let totalPhases = 0;

  for (const p of history) {
    for (const ph of p.phases) {
      roleStats[ph.roleKey] = (roleStats[ph.roleKey] ?? 0) + 1;
      totalPhases++;
    }
  }

  return {
    totalProjects: history.length,
    totalPhases,
    avgDurationMs: history.length > 0
      ? history.reduce((sum, p) => sum + p.durationMs, 0) / history.length
      : 0,
    roleStats,
  };
}

// === Export ===

export function getAllRecordsAsCSV(): string {
  const records = loadTaskRecords();
  if (records.length === 0) return '';
  const header = 'id,workerName,workerTitle,roleKey,instruction,result,revisions,createdAt,completedAt,durationMs';
  const rows = records.map(r =>
    [r.id, `"${r.workerName}"`, `"${r.workerTitle}"`, r.roleKey,
      `"${r.instruction.replace(/"/g, '""').slice(0, 200)}"`,
      `"${r.result.slice(0, 200).replace(/"/g, '""')}"`,
      r.revisions.length, new Date(r.createdAt).toISOString(),
      new Date(r.completedAt).toISOString(), r.durationMs].join(','),
  );
  return [header, ...rows].join('\n');
}

export function getAllRecordsAsJSON(): string {
  return JSON.stringify({ tasks: loadTaskRecords(), projects: loadProjectHistory() }, null, 2);
}

export function getFullExport(): string {
  return JSON.stringify({
    tasks: loadTaskRecords(), projects: loadProjectHistory(),
    stats: getProjectStats(), exportedAt: new Date().toISOString(),
  }, null, 2);
}

// === Init: sync from Supabase on load ===

export async function initStorageFromSupabase() {
  await Promise.all([syncTasksFromSupabase(), syncProjectsFromSupabase()]);
}

// === Helpers ===

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function safeSet<T>(key: string, data: T[], maxItems: number): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    const trimmed = data.slice(-maxItems);
    try { localStorage.setItem(key, JSON.stringify(trimmed)); } catch { /* noop */ }
  }
}
