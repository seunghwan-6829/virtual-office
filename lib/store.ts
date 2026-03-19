import { create } from 'zustand';
import {
  Worker, Task, ManagerLog, ModalState,
  WorkerState, LLMProvider,
} from './types';
import { OFFICES, MANAGER_POSITION, getCEOWaitPosition, getOffice } from './game/office-map';
import { buildPathToWait, buildPathToSeat } from './game/pathfinding';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface OfficeStore {
  workers: Worker[];
  tasks: Task[];
  managerLogs: ManagerLog[];
  modal: ModalState;

  getWorker: (id: string) => Worker | undefined;
  updateWorker: (id: string, u: Partial<Worker>) => void;
  removeWorker: (id: string) => void;
  addWorker: (name: string, role: string, provider: LLMProvider, model: string) => void;

  openTaskModal: (workerId: string) => void;
  openReportModal: (workerId: string) => void;
  openManagerModal: () => void;
  openAddWorkerModal: () => void;
  closeModal: () => void;

  startTask: (workerId: string, instruction: string) => void;
  completeTask: (workerId: string, result: string) => void;
  sendWorkerToCEO: (workerId: string) => void;
  workerArriveAtCEO: (workerId: string) => void;
  workerStartReport: (workerId: string) => void;
  workerFinishReport: (workerId: string) => void;
  workerReturnToDesk: (workerId: string) => void;

  addManagerLog: (log: ManagerLog) => void;
}

function makeWorker(
  charId: number,
  officeIdx: number,
  name: string,
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
    role,
    state: 'idle',
    position: isManager ? { ...MANAGER_POSITION } : { ...office.seat },
    officeId: isManager ? 'MGR' : office.id,
    provider,
    model,
    currentTask: null,
    path: [],
    pathIndex: 0,
    direction: isManager ? 'down' : office.seatDirection,
    animTimer: 0,
    isManager,
  };
}

const INITIAL: Worker[] = [
  makeWorker(1, 0, '김하늘', '블로그 작가 (블로그 글, 에세이)', 'openai', 'gpt-4o'),
  makeWorker(2, 1, '이서연', 'SNS 매니저 (인스타, 유튜브 콘텐츠)', 'openai', 'gpt-4o-mini'),
  makeWorker(3, 2, '박지민', '카피라이터 (광고 카피, 슬로건)', 'anthropic', 'claude-3-5-sonnet-20241022'),
  makeWorker(4, 3, '최유진', '번역가 (한↔영/일 번역, 현지화)', 'anthropic', 'claude-3-5-sonnet-20241022'),
  makeWorker(5, 4, '정민수', '리서처 (시장조사, 트렌드 분석)', 'google', 'gemini-pro'),
  makeWorker(6, 5, '강다현', '영상 스크립트 작가 (유튜브/숏폼 대본)', 'openai', 'gpt-4o'),
  makeWorker(7, 6, '윤재호', 'SEO 전문가 (키워드·SEO 콘텐츠)', 'google', 'gemini-pro'),
  makeWorker(8, 7, '한소라', '뉴스레터 에디터 (이메일·큐레이션)', 'anthropic', 'claude-3-haiku-20240307'),
  makeWorker(9, 8, '오태준', '기술 문서 작성자 (매뉴얼, 가이드)', 'openai', 'gpt-4o'),
  { ...makeWorker(10, 0, '임채원', '중간관리자 (프로세스·데이터 관리)', 'openai', 'gpt-4o', true) },
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

  addWorker: (name, role, provider, model) => {
    const usedOffices = new Set(get().workers.map(w => w.officeId));
    const freeSlotIdx = OFFICES.findIndex(o => !usedOffices.has(o.id));
    if (freeSlotIdx === -1) return;
    const charId = freeSlotIdx + 1;
    const w = makeWorker(charId, freeSlotIdx, name, role, provider, model);
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

  startTask: (workerId, instruction) => {
    const w = get().getWorker(workerId);
    if (!w) return;
    const task: Task = {
      id: uid(), workerId, workerName: w.name, instruction,
      result: '', status: 'in_progress', createdAt: Date.now(),
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
          ? { ...w, state: 'waitingAtCEO' as WorkerState, path: [], pathIndex: 0, direction: 'up' as const, animFrame: 0 }
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

  workerReturnToDesk: (workerId) => {
    const office = getOffice(get().getWorker(workerId)?.officeId ?? '');
    if (!office) return;
    set(s => ({
      workers: s.workers.map(w =>
        w.id === workerId
          ? { ...w, state: 'idle' as WorkerState, position: { ...office.seat }, path: [], pathIndex: 0, direction: office.seatDirection, animFrame: 0 }
          : w,
      ),
    }));
  },

  addManagerLog: (log) => set(s => ({ managerLogs: [...s.managerLogs, log] })),
}));
