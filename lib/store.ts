import { create } from 'zustand';
import {
  Worker, Task, ManagerLog, ModalState,
  WorkerState, LLMProvider, RoleKey, TaskRecord,
  Project, WorkPhase, AgentMessage, ProjectStatus, PhaseStatus,
  SpeechBubbleData, AgentPersonality, DEFAULT_PERSONALITY,
  TimelineEvent, PROJECT_COLORS, CEONote, CopyArchiveItem,
} from './types';
import { OFFICES, MANAGER_POSITION, MANAGER_DIRECTION, getCEOWaitPosition, getOffice, CORRIDOR_Y } from './game/office-map';
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
  project: Project | null;
  projectQueue: Project[];
  speechBubbles: SpeechBubbleData[];
  peekWorkerId: string | null;
  timeline: TimelineEvent[];
  chatPanelOpen: boolean;
  liveStreamWorkerId: string | null;
  officeMessages: AgentMessage[];
  ceoNotes: CEONote[];

  getWorker: (id: string) => Worker | undefined;
  updateWorker: (id: string, u: Partial<Worker>) => void;
  removeWorker: (id: string) => void;
  addWorker: (name: string, title: string, roleKey: RoleKey, role: string, provider: LLMProvider, model: string) => void;

  openTaskModal: (workerId: string) => void;
  openReportModal: (workerId: string) => void;
  openManagerModal: (workerId?: string) => void;
  openAddWorkerModal: () => void;
  openStatsModal: (workerId: string) => void;
  openProjectInput: () => void;
  openFinalReport: () => void;
  openPersonalityModal: (workerId: string) => void;
  openTemplatesModal: () => void;
  openABCompare: (extra?: Record<string, unknown>) => void;
  openResultEditor: (workerId: string) => void;
  openCompetitorModal: () => void;
  openTimelineModal: () => void;
  closeModal: () => void;

  startTask: (workerId: string, instruction: string, metadata?: Record<string, unknown>) => void;
  completeTask: (workerId: string, result: string) => void;
  sendWorkerToCEO: (workerId: string) => void;
  workerArriveAtCEO: (workerId: string) => void;
  workerStartReport: (workerId: string) => void;
  workerFinishReport: (workerId: string) => void;
  requestRevision: (workerId: string, feedback: string) => void;
  workerReturnToDesk: (workerId: string) => void;
  workerWalkBackToDesk: (workerId: string) => void;

  startProject: (productInfo: string, phases: WorkPhase[], opts?: Partial<Project>) => void;
  setProjectStatus: (status: ProjectStatus) => void;
  updatePhaseStatus: (phaseId: string, status: PhaseStatus) => void;
  completePhase: (phaseId: string, result: string) => void;
  completeProject: (finalReport: string) => void;
  addProjectMessage: (msg: AgentMessage) => void;
  updatePhaseStreaming: (phaseId: string, text: string) => void;

  setSpeechBubble: (workerId: string, text: string, durationMs: number) => void;
  clearExpiredBubbles: () => void;
  setWorkerState: (workerId: string, state: WorkerState) => void;
  setWorkerAutonomousWalk: (fromWorkerId: string, toWorkerIdOrCEO: string) => void;
  setWorkerPeek: (workerId: string | null) => void;
  updateWorkerStreaming: (workerId: string, text: string) => void;
  updatePersonality: (workerId: string, p: Partial<AgentPersonality>) => void;

  addManagerLog: (log: ManagerLog) => void;
  addTimelineEvent: (ev: Omit<TimelineEvent, 'id'>) => void;
  setChatPanelOpen: (open: boolean) => void;
  setLiveStreamWorker: (id: string | null) => void;
  addOfficeMessage: (msg: AgentMessage) => void;
  addCEONote: (note: Omit<CEONote, 'id'>) => void;
  acknowledgeCEONote: (id: string) => void;
  feedbackCEONote: (id: string, feedback: string) => void;

  reviewProject: (feedback?: string) => void;

  copyArchive: CopyArchiveItem[];
  addCopyArchiveItem: (item: Omit<CopyArchiveItem, 'id'>) => void;
  updateCopyArchiveItem: (id: string, updates: Partial<CopyArchiveItem>) => void;
  removeCopyArchiveItem: (id: string) => void;
  setCopyArchive: (items: CopyArchiveItem[]) => void;

  copyArchiveOpen: boolean;
  setCopyArchiveOpen: (open: boolean) => void;
  dataStorageOpen: boolean;
  setDataStorageOpen: (open: boolean) => void;
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
    personality: { ...DEFAULT_PERSONALITY },
    streamingText: '',
  };
}

const M = 'claude-opus-4-6';
const P = 'anthropic' as LLMProvider;

const INITIAL: Worker[] = [
  makeWorker(1, 0, '김하늘', '상페 기획', 'spPlanner', '상세페이지 기획 (구성·레이아웃·스토리보드)', P, M),
  makeWorker(2, 1, '이서연', '상페 카피·후킹', 'spCopy', '상세페이지 카피+후킹 (헤드라인·본문·CTA·후킹문구)', P, M),
  makeWorker(3, 2, '박지민', '상페 이미지', 'spImage', '상세페이지 제품 이미지 생성 (Gemini 3 Pro)', 'google' as LLMProvider, 'gemini-2.0-flash-exp'),
  makeWorker(4, 3, '최유진', '상페 전환최적화', 'spCRO', '상세페이지 CRO (전환율 분석·A/B테스트)', P, M),
  makeWorker(5, 4, '정민수', 'DA 전략기획', 'daStrategy', 'DA 전략기획 (캠페인·타겟팅·매체선정)', P, M),
  makeWorker(6, 5, '강다현', 'DA 카피', 'daCopy', 'DA 광고카피 (소재 헤드라인·본문·CTA)', P, M),
  makeWorker(7, 6, '윤재호', 'DA 퍼포먼스', 'daAnalysis', 'DA 퍼포먼스 분석 (ROAS·CTR·리포트)', P, M),
  makeWorker(8, 7, '김인기', 'DA 소재디자인', 'daCreative', 'DA 소재 디자이너 (배너·이미지·크리에이티브)', P, M),
  makeWorker(9, 8, '윤성현', '중간관리자', 'manager', '중간관리자 (프로세스·데이터 관리)', P, M),
  { ...makeWorker(10, 0, '송승환', '파운더', 'manager', '파운더 / CEO (전체 총괄)', P, M, true) },
];

export const useOfficeStore = create<OfficeStore>((set, get) => ({
  workers: INITIAL,
  tasks: [],
  managerLogs: [],
  modal: { type: null, workerId: null },
  project: null,
  projectQueue: [],
  speechBubbles: [],
  peekWorkerId: null,
  timeline: [],
  chatPanelOpen: false,
  liveStreamWorkerId: null,
  officeMessages: [],
  ceoNotes: [],

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

  // === Modals ===
  openTaskModal: (workerId) => {
    const w = get().getWorker(workerId);
    if (!w || w.state !== 'idle') return;
    set(s => ({
      modal: { type: 'task', workerId },
      workers: s.workers.map(v => (v.id === workerId ? { ...v, state: 'chatting' as WorkerState } : v)),
    }));
  },
  openReportModal: (workerId) => set({ modal: { type: 'report', workerId } }),
  openManagerModal: (workerId?) => set({ modal: { type: 'manager', workerId: workerId ?? null } }),
  openAddWorkerModal: () => set({ modal: { type: 'addWorker', workerId: null } }),
  openStatsModal: (workerId) => set({ modal: { type: 'stats', workerId } }),
  openProjectInput: () => set({ modal: { type: 'projectInput', workerId: null } }),
  openFinalReport: () => set({ modal: { type: 'finalReport', workerId: null } }),
  openPersonalityModal: (workerId) => set({ modal: { type: 'personality', workerId } }),
  openTemplatesModal: () => set({ modal: { type: 'templates', workerId: null } }),
  openABCompare: (extra) => set({ modal: { type: 'abCompare', workerId: null, extra } }),
  openResultEditor: (workerId) => set({ modal: { type: 'resultEditor', workerId } }),
  openCompetitorModal: () => set({ modal: { type: 'competitor', workerId: null } }),
  openTimelineModal: () => set({ modal: { type: 'timeline', workerId: null } }),

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

  // === Tasks ===
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
          ? { ...w, currentTask: { ...w.currentTask, result, status: 'completed' as const, completedAt: Date.now() }, streamingText: '' }
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

  workerWalkBackToDesk: (workerId) => {
    const w = get().getWorker(workerId);
    const office = getOffice(w?.officeId ?? '');
    if (!office || !w) return;
    const path = [
      { x: w.position.x, y: CORRIDOR_Y },
      { x: office.door.x, y: CORRIDOR_Y },
      office.door,
      office.seat,
    ];
    set(s => ({
      workers: s.workers.map(v =>
        v.id === workerId
          ? { ...v, state: 'walkingBack' as WorkerState, path, pathIndex: 0, animTimer: 0 }
          : v,
      ),
    }));
  },

  // === Project ===
  startProject: (productInfo, phases, opts) => {
    const colorIdx = (get().projectQueue.length) % PROJECT_COLORS.length;
    set({
      project: {
        id: uid(), productInfo, status: 'in_progress',
        phases, messages: [], finalReport: null, createdAt: Date.now(),
        color: PROJECT_COLORS[colorIdx],
        ...opts,
      },
    });
  },

  setProjectStatus: (status) => set(s => ({
    project: s.project ? { ...s.project, status } : null,
  })),

  updatePhaseStatus: (phaseId, status) => set(s => ({
    project: s.project ? {
      ...s.project,
      phases: s.project.phases.map(p => p.id === phaseId ? { ...p, status } : p),
    } : null,
  })),

  completePhase: (phaseId, result) => set(s => ({
    project: s.project ? {
      ...s.project,
      phases: s.project.phases.map(p =>
        p.id === phaseId ? { ...p, status: 'completed' as PhaseStatus, result, streamingText: '' } : p
      ),
    } : null,
  })),

  completeProject: (finalReport) => set(s => {
    const completed = s.project ? {
      ...s.project, status: 'completed' as ProjectStatus,
      finalReport, completedAt: Date.now(),
    } : null;
    return {
      project: completed,
      projectQueue: completed ? [...s.projectQueue, completed] : s.projectQueue,
    };
  }),

  addProjectMessage: (msg) => set(s => ({
    project: s.project ? {
      ...s.project, messages: [...s.project.messages, msg],
    } : null,
  })),

  updatePhaseStreaming: (phaseId, text) => set(s => ({
    project: s.project ? {
      ...s.project,
      phases: s.project.phases.map(p =>
        p.id === phaseId ? { ...p, streamingText: text } : p
      ),
    } : null,
  })),

  // === UI & Visual ===
  setSpeechBubble: (workerId, text, durationMs) => set(s => ({
    speechBubbles: [
      ...s.speechBubbles.filter(b => b.workerId !== workerId),
      { workerId, text, expiresAt: Date.now() + durationMs },
    ],
  })),

  clearExpiredBubbles: () => {
    const now = Date.now();
    const current = get().speechBubbles;
    const filtered = current.filter(b => b.expiresAt > now);
    if (filtered.length !== current.length) {
      set({ speechBubbles: filtered });
    }
  },

  setWorkerState: (workerId, state) => set(s => ({
    workers: s.workers.map(w => w.id === workerId ? { ...w, state } : w),
  })),

  setWorkerAutonomousWalk: (fromWorkerId, toWorkerIdOrCEO) => {
    const from = get().getWorker(fromWorkerId);
    if (!from) return;

    let targetPos;
    if (toWorkerIdOrCEO === 'CEO') {
      targetPos = getCEOWaitPosition(0);
    } else {
      const to = get().getWorker(toWorkerIdOrCEO);
      if (!to) return;
      const toOffice = getOffice(to.officeId);
      targetPos = toOffice ? toOffice.door : to.position;
    }

    const fromOffice = getOffice(from.officeId);
    const startDoor = fromOffice ? fromOffice.door : from.position;

    const path = [
      startDoor,
      { x: startDoor.x, y: CORRIDOR_Y },
      { x: targetPos.x, y: CORRIDOR_Y },
      targetPos,
    ];

    set(s => ({
      workers: s.workers.map(w =>
        w.id === fromWorkerId
          ? { ...w, state: 'walkingToColleague' as WorkerState, path, pathIndex: 0, animTimer: 0 }
          : w
      ),
    }));
  },

  setWorkerPeek: (workerId) => set({ peekWorkerId: workerId }),

  updateWorkerStreaming: (workerId, text) => set(s => ({
    workers: s.workers.map(w =>
      w.id === workerId ? { ...w, streamingText: text } : w
    ),
  })),

  updatePersonality: (workerId, p) => set(s => ({
    workers: s.workers.map(w =>
      w.id === workerId ? { ...w, personality: { ...w.personality, ...p } } : w
    ),
  })),

  addManagerLog: (log) => set(s => ({ managerLogs: [...s.managerLogs, log] })),

  addTimelineEvent: (ev) => set(s => ({
    timeline: [...s.timeline, { ...ev, id: uid() }],
  })),

  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
  setLiveStreamWorker: (id) => set({ liveStreamWorkerId: id }),

  addOfficeMessage: (msg) => set(s => ({
    officeMessages: [...s.officeMessages.slice(-200), msg],
  })),

  addCEONote: (note) => set(s => ({
    ceoNotes: [...s.ceoNotes, { ...note, id: uid() }],
  })),

  acknowledgeCEONote: (id) => set(s => ({
    ceoNotes: s.ceoNotes.map(n => n.id === id ? { ...n, acknowledged: true } : n),
  })),

  feedbackCEONote: (id, feedback) => set(s => ({
    ceoNotes: s.ceoNotes.map(n => n.id === id ? { ...n, feedback, acknowledged: true } : n),
  })),

  reviewProject: (feedback) => set(s => {
    if (!s.project) return {};
    if (feedback) {
      return {
        project: { ...s.project, reviewFeedback: feedback, reviewed: false },
      };
    }
    return {
      project: { ...s.project, reviewed: true, reviewFeedback: undefined },
    };
  }),

  copyArchive: [],
  addCopyArchiveItem: (item) => set(s => ({
    copyArchive: [...s.copyArchive, { ...item, id: uid() }],
  })),
  updateCopyArchiveItem: (id, updates) => set(s => ({
    copyArchive: s.copyArchive.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c),
  })),
  removeCopyArchiveItem: (id) => set(s => ({
    copyArchive: s.copyArchive.filter(c => c.id !== id),
  })),
  setCopyArchive: (items) => set({ copyArchive: items }),

  copyArchiveOpen: false,
  setCopyArchiveOpen: (open) => set({ copyArchiveOpen: open }),
  dataStorageOpen: false,
  setDataStorageOpen: (open) => set({ dataStorageOpen: open }),
}));
