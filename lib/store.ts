import { create } from 'zustand';
import {
  Worker, Task, ManagerLog, ModalState,
  WorkerState, LLMProvider, RoleKey, TaskRecord,
} from './types';
import { OFFICES, MANAGER_POSITION, MANAGER_DIRECTION, getCEOWaitPosition, getOffice } from './game/office-map';
import { buildPathToWait, buildPathToSeat } from './game/pathfinding';
import { saveTaskRecord } from './storage';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface OfficeStore {
  workers: Worker[];
  tasks: Task[];
  managerLogs: ManagerLog[];
  modal: ModalState;

  getWorker: (id: string) => Worker | undefined;
  updateWorker: (id: string, u: Partial<Worker>) => void;
  removeWorker: (id: string) => void;
  addWorker: (name: string, title: string, roleKey: RoleKey, role: string, provider: LLMProvider, model: string) => void;

  openTaskModal: (workerId: string) => void;
  openReportModal: (workerId: string) => void;
  openManagerModal: () => void;
  openAddWorkerModal: () => void;
  openStatsModal: (workerId: string) => void;
  closeModal: () => void;

  startTask: (workerId: string, instruction: string, metadata?: Record<string, unknown>) => void;
  completeTask: (workerId: string, result: string) => void;
  sendWorkerToCEO: (workerId: string) => void;
  workerArriveAtCEO: (workerId: string) => void;
  workerStartReport: (workerId: string) => void;
  workerFinishReport: (workerId: string) => void;
  requestRevision: (workerId: string, feedback: string) => void;
  workerReturnToDesk: (workerId: string) => void;

  addManagerLog: (log: ManagerLog) => void;
}

function makeWorker(
  charId: number,
  officeIdx: number,
  name: string,
  title: string,
  roleKey: RoleKey,
  role: string,
  provider: LLMProvider,
  model: string,
  isManager = false,
): Worker {
  const office = OFFICES[officeIdx];
  return {
    id: uid(),
    charId,
    name,
    title,
    roleKey,
    role,
    state: 'idle',
    position: isManager ? { ...MANAGER_POSITION } : { ...office.seat },
    officeId: isManager ? 'MGR' : office.id,
    provider,
    model,
    currentTask: null,
    path: [],
    pathIndex: 0,
    direction: isManager ? MANAGER_DIRECTION : office.seatDirection,
    animTimer: 0,
    isManager,
  };
}

const M = 'claude-opus-4-6';
const P = 'anthropic' as LLMProvider;

const INITIAL: Worker[] = [
  makeWorker(1, 0, '김하늘', '블로그 작가', 'blog', '블로그 작가 (블로그 글, 에세이)', P, M),
  makeWorker(2, 1, '이서연', 'SNS 매니저', 'sns', 'SNS 매니저 (인스타, 유튜브 콘텐츠)', P, M),
  makeWorker(3, 2, '박지민', '카피라이터', 'copy', '카피라이터 (광고 카피, 슬로건)', P, M),
  makeWorker(4, 3, '최유진', '상페 카피라이터', 'salesPage', '상세페이지 카피라이터 (전환율 최적화)', P, M),
  makeWorker(5, 4, '정민수', '리서처', 'research', '리서처 (시장조사, 트렌드 분석)', P, M),
  makeWorker(6, 5, '강다현', '영상 작가', 'video', '영상 스크립트 작가 (유튜브/숏폼 대본)', P, M),
  makeWorker(7, 6, '윤재호', 'SEO 전문가', 'seo', 'SEO 전문가 (키워드·SEO 콘텐츠)', P, M),
  makeWorker(8, 7, '김인기', '디자이너', 'designer', '디자이너 (Gemini 이미지 생성)', P, M),
  makeWorker(9, 8, '윤성현', '중간관리자', 'manager', '중간관리자 (프로세스·데이터 관리)', P, M),
  { ...makeWorker(10, 0, '송승환', '파운더', 'manager', '파운더 / CEO (전체 총괄)', P, M, true) },
];

export const useOfficeStore = create<OfficeStore>((set, get) => ({
  workers: INITIAL,
  tasks: [],
  managerLogs: [],
  modal: { type: null, workerId: null },

  getWorker: (id) => get().workers.find(w => w.id === id),

  updateWorker: (id, u) =>
    set(s => ({ workers: s.workers.map(w => (w.id === id ? { ...w, ...u } : w)) })),

  removeWorker: (id) =>
    set(s => ({ workers: s.workers.filter(w => w.id !== id) })),

  addWorker: (name, title, roleKey, role, provider, model) => {
    const usedOffices = new Set(get().workers.map(w => w.officeId));
    const freeSlotIdx = OFFICES.findIndex(o => !usedOffices.has(o.id));
    if (freeSlotIdx === -1) return;
    const charId = freeSlotIdx + 1;
    const w = makeWorker(charId, freeSlotIdx, name, title, roleKey, role, provider, model);
    set(s => ({ workers: [...s.workers, w], modal: { type: null, workerId: null } }));
  },

  openTaskModal: (workerId) => {
    const w = get().getWorker(workerId);
    if (!w || w.state !== 'idle') return;
    set(s => ({
      modal: { type: 'task', workerId },
      workers: s.workers.map(v => (v.id === workerId ? { ...v, state: 'chatting' as WorkerState } : v)),
    }));
  },

  openReportModal: (workerId) => set({ modal: { type: 'report', workerId } }),
  openManagerModal: () => set({ modal: { type: 'manager', workerId: null } }),
  openAddWorkerModal: () => set({ modal: { type: 'addWorker', workerId: null } }),
  openStatsModal: (workerId) => set({ modal: { type: 'stats', workerId } }),

  closeModal: () => {
    const { modal, workers } = get();
    if (modal.type === 'task' && modal.workerId) {
      set({
        modal: { type: null, workerId: null },
        workers: workers.map(w =>
          w.id === modal.workerId && w.state === 'chatting'
            ? { ...w, state: 'idle' as WorkerState }
            : w,
        ),
      });
    } else {
      set({ modal: { type: null, workerId: null } });
    }
  },

  startTask: (workerId, instruction, metadata) => {
    const w = get().getWorker(workerId);
    if (!w) return;
    const task: Task = {
      id: uid(), workerId, workerName: w.name, instruction,
      result: '', status: 'in_progress', createdAt: Date.now(),
      revisions: [], metadata,
    };
    set(s => ({
      tasks: [...s.tasks, task],
      workers: s.workers.map(v =>
        v.id === workerId
          ? { ...v, state: 'working' as WorkerState, currentTask: task, direction: v.direction }
          : v,
      ),
      modal: { type: null, workerId: null },
    }));
  },

  completeTask: (workerId, result) => {
    set(s => ({
      tasks: s.tasks.map(t =>
        t.workerId === workerId && t.status === 'in_progress'
          ? { ...t, result, status: 'completed' as const, completedAt: Date.now() }
          : t,
      ),
      workers: s.workers.map(w =>
        w.id === workerId && w.currentTask
          ? { ...w, currentTask: { ...w.currentTask, result, status: 'completed' as const, completedAt: Date.now() } }
          : w,
      ),
    }));
  },

  sendWorkerToCEO: (workerId) => {
    const w = get().getWorker(workerId);
    if (!w) return;
    const waitIdx = get().workers.filter(
      v => v.state === 'waitingAtCEO' || v.state === 'walkingToCEO',
    ).length;
    const path = buildPathToWait(w.officeId, waitIdx);
    set(s => ({
      workers: s.workers.map(v =>
        v.id === workerId
          ? { ...v, state: 'walkingToCEO' as WorkerState, path, pathIndex: 0, animTimer: 0 }
          : v,
      ),
    }));
  },

  workerArriveAtCEO: (workerId) =>
    set(s => ({
      workers: s.workers.map(w =>
        w.id === workerId
          ? { ...w, state: 'waitingAtCEO' as WorkerState, path: [], pathIndex: 0, direction: 'up' as const }
          : w,
      ),
    })),

  workerStartReport: (workerId) =>
    set(s => ({
      workers: s.workers.map(w =>
        w.id === workerId ? { ...w, state: 'reporting' as WorkerState } : w,
      ),
      modal: { type: 'report', workerId },
    })),

  workerFinishReport: (workerId) => {
    const w = get().getWorker(workerId);
    if (!w?.currentTask) return;
    const t = w.currentTask;
    const log: ManagerLog = {
      id: uid(), workerId, workerName: w.name,
      taskInstruction: t.instruction, taskResult: t.result,
      timestamp: Date.now(), durationMs: (t.completedAt ?? Date.now()) - t.createdAt,
      provider: w.provider, model: w.model,
    };
    const record: TaskRecord = {
      id: t.id, workerId, workerName: w.name, workerTitle: w.title,
      roleKey: w.roleKey, instruction: t.instruction, result: t.result,
      revisions: t.revisions, metadata: t.metadata,
      createdAt: t.createdAt, completedAt: t.completedAt ?? Date.now(),
      durationMs: (t.completedAt ?? Date.now()) - t.createdAt,
    };
    try { saveTaskRecord(record); } catch { /* noop */ }
    const path = buildPathToSeat(w.position, w.officeId);
    set(s => ({
      workers: s.workers.map(v =>
        v.id === workerId
          ? { ...v, state: 'walkingBack' as WorkerState, path, pathIndex: 0, animTimer: 0, currentTask: null }
          : v,
      ),
      tasks: s.tasks.map(v => (v.id === t.id ? { ...v, status: 'reported' as const } : v)),
      managerLogs: [...s.managerLogs, log],
      modal: { type: null, workerId: null },
    }));
  },

  requestRevision: (workerId, feedback) => {
    const w = get().getWorker(workerId);
    if (!w?.currentTask) return;
    const revision = { feedback, result: '', createdAt: Date.now() };
    const path = buildPathToSeat(w.position, w.officeId);
    set(s => ({
      workers: s.workers.map(v =>
        v.id === workerId && v.currentTask
          ? {
              ...v,
              state: 'revising' as WorkerState,
              path, pathIndex: 0, animTimer: 0,
              currentTask: {
                ...v.currentTask!,
                status: 'in_progress' as const,
                revisions: [...v.currentTask!.revisions, revision],
              },
            }
          : v,
      ),
      modal: { type: null, workerId: null },
    }));
  },

  workerReturnToDesk: (workerId) => {
    const w = get().getWorker(workerId);
    const office = getOffice(w?.officeId ?? '');
    if (!office || !w) return;
    if (w.state === 'revising') {
      set(s => ({
        workers: s.workers.map(v =>
          v.id === workerId
            ? { ...v, state: 'working' as WorkerState, position: { ...office.seat }, path: [], pathIndex: 0, direction: office.seatDirection }
            : v,
        ),
      }));
    } else {
      set(s => ({
        workers: s.workers.map(v =>
          v.id === workerId
            ? { ...v, state: 'idle' as WorkerState, position: { ...office.seat }, path: [], pathIndex: 0, direction: office.seatDirection }
            : v,
        ),
      }));
    }
  },

  addManagerLog: (log) => set(s => ({ managerLogs: [...s.managerLogs, log] })),
}));
