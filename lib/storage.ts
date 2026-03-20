import { TaskRecord, Project, RoleKey } from './types';

const TASK_KEY = 'virtual-office-records';
const PROJECT_KEY = 'virtual-office-projects';

// === Task Records (개별 작업) ===

export function saveTaskRecord(record: TaskRecord): void {
  const records = loadTaskRecords();
  records.push(record);
  safeSet(TASK_KEY, records, 200);
}

export function loadTaskRecords(): TaskRecord[] {
  return safeGet<TaskRecord[]>(TASK_KEY) ?? [];
}

export function getWorkerRecords(workerId: string): TaskRecord[] {
  return loadTaskRecords().filter(r => r.workerId === workerId);
}

// === Project History (자율 프로젝트) ===

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
}

export function loadProjectHistory(): ProjectSnapshot[] {
  return safeGet<ProjectSnapshot[]>(PROJECT_KEY) ?? [];
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

export function getProjectStats(): {
  totalProjects: number;
  totalPhases: number;
  avgDurationMs: number;
  roleStats: Record<string, number>;
} {
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
    [
      r.id,
      `"${r.workerName}"`,
      `"${r.workerTitle}"`,
      r.roleKey,
      `"${r.instruction.replace(/"/g, '""').slice(0, 200)}"`,
      `"${r.result.slice(0, 200).replace(/"/g, '""')}"`,
      r.revisions.length,
      new Date(r.createdAt).toISOString(),
      new Date(r.completedAt).toISOString(),
      r.durationMs,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function getAllRecordsAsJSON(): string {
  return JSON.stringify({ tasks: loadTaskRecords(), projects: loadProjectHistory() }, null, 2);
}

export function getFullExport(): string {
  return JSON.stringify({
    tasks: loadTaskRecords(),
    projects: loadProjectHistory(),
    stats: getProjectStats(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// === Helpers ===

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet<T>(key: string, data: T[], maxItems: number): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    const trimmed = data.slice(-maxItems);
    try { localStorage.setItem(key, JSON.stringify(trimmed)); } catch { /* noop */ }
  }
}
