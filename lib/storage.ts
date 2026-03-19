import { TaskRecord } from './types';

const STORAGE_KEY = 'virtual-office-records';

export function saveTaskRecord(record: TaskRecord): void {
  const records = loadTaskRecords();
  records.push(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // quota exceeded — drop oldest entries
    const trimmed = records.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function loadTaskRecords(): TaskRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getWorkerRecords(workerId: string): TaskRecord[] {
  return loadTaskRecords().filter(r => r.workerId === workerId);
}

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
      `"${r.instruction.replace(/"/g, '""')}"`,
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
  return JSON.stringify(loadTaskRecords(), null, 2);
}
