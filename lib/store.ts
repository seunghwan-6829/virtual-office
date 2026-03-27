import { create } from 'zustand';
import {
  Worker, Task, ManagerLog, ModalState,
  WorkerState, LLMProvider, RoleKey, TaskRecord, FloorId,
  Project, WorkPhase, AgentMessage, ProjectStatus, PhaseStatus,
  SpeechBubbleData, AgentPersonality, DEFAULT_PERSONALITY,
  TimelineEvent, PROJECT_COLORS, CEONote, CopyArchiveItem,
} from './types';
import { OFFICES, FLOOR2_OFFICES, FLOOR3_OFFICES, MANAGER_POSITION, MANAGER_DIRECTION, getCEOWaitPosition, getOffice, CORRIDOR_Y } from './game/office-map';
import { buildPathToWait, buildPathToSeat } from './game/pathfinding';
import { saveTaskRecord } from './storage';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface OfficeStore {
  currentFloor: FloorId;
  setCurrentFloor: (floor: FloorId) => void;

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

  /* 2층 전용 상태 */
  floor2Project: Project | null;
  floor2Messages: AgentMessage[];
  floor2Timeline: TimelineEvent[];

  /* 3층 전용 상태 */
  floor3Project: Project | null;
  floor3Messages: AgentMessage[];
  floor3Timeline: TimelineEvent[];

  getFloorWorkers: (floor: FloorId) => Worker[];
  getActiveProject: () => Project | null;
  getActiveMessages: () => AgentMessage[];

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

  /* 2층 전용 카피보관함 */
  floor2CopyArchive: CopyArchiveItem[];
  addFloor2CopyArchiveItem: (item: Omit<CopyArchiveItem, 'id'>) => void;
  updateFloor2CopyArchiveItem: (id: string, updates: Partial<CopyArchiveItem>) => void;
  removeFloor2CopyArchiveItem: (id: string) => void;
  setFloor2CopyArchive: (items: CopyArchiveItem[]) => void;

  /* 2층 프로젝트 액션 */
  startFloor2Project: (productInfo: string, phases: WorkPhase[], opts?: Partial<Project>) => void;
  setFloor2ProjectStatus: (status: ProjectStatus) => void;
  completeFloor2Project: (finalReport: string) => void;
  addFloor2Message: (msg: AgentMessage) => void;
  reviewFloor2Project: (feedback?: string) => void;

  /* 3층 프로젝트 액션 */
  startFloor3Project: (productInfo: string, phases: WorkPhase[], opts?: Partial<Project>) => void;
  setFloor3ProjectStatus: (status: ProjectStatus) => void;
  completeFloor3Project: (finalReport: string) => void;
  addFloor3Message: (msg: AgentMessage) => void;
  reviewFloor3Project: (feedback?: string) => void;
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
  floor: FloorId = 1,
): Worker {
  const officeArr = floor === 3 ? FLOOR3_OFFICES : floor === 2 ? FLOOR2_OFFICES : OFFICES;
  const office = officeArr[officeIdx];
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
    floor,
  };
}

/* 2층 캐릭터 (AI 제작 부서 — 전원 이미지 생성)
   FLOOR2_OFFICES: idx 0-2 = 위 3명(Front), idx 3-5 = 아래 3명(Back) */
const FLOOR2_INITIAL: Worker[] = [
  makeWorker(1, 0, '김영주', 'AI 이미지', 'aiImage1', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
  makeWorker(2, 1, '오예원', 'AI 이미지', 'aiImage2', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
  makeWorker(3, 2, '이한나', 'AI 이미지', 'aiImage3', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
  makeWorker(4, 3, '장한나', 'AI 이미지', 'aiImage4', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
  makeWorker(5, 4, '차지우', 'AI 이미지', 'aiImage5', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
  makeWorker(1, 5, '한나라', 'AI 이미지', 'aiImage6', 'AI 제품 이미지 생성', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 2),
];

/* 3층 캐릭터 (DA 제작 부서)
   FLOOR3_OFFICES: idx 0-2 = 위 3명(Front), idx 3-5 = 아래 3명(Back) */
const FLOOR3_INITIAL: Worker[] = [
  makeWorker(3, 0, '서유나', 'DA 디자인', 'daDesign1', 'DA 소재 디자인 및 제작', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
  makeWorker(5, 1, '임도윤', 'DA 카피', 'daDesign2', 'DA 광고 카피라이팅', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
  makeWorker(1, 2, '권서영', 'DA 전략', 'daDesign3', 'DA 매체 전략 및 타겟팅', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
  makeWorker(4, 3, '문채린', 'DA 분석', 'daDesign4', 'DA 성과 분석 및 최적화', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
  makeWorker(2, 4, '백서윤', 'DA 소재', 'daDesign5', 'DA 소재 기획 및 A/B 테스트', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
  makeWorker(6, 5, '안지호', 'DA 운영', 'daDesign6', 'DA 캠페인 운영 관리', 'anthropic' as LLMProvider, 'claude-sonnet-4-20250514', false, 3),
];

const M = 'claude-sonnet-4-20250514';
const P = 'anthropic' as LLMProvider;

const INITIAL: Worker[] = [
  makeWorker(1, 0, '김하늘', '시장조사·리서치', 'spPlanner', '시장 조사 및 니즈 파악, 제품 장단점 분석, 교차 검증 리서치', P, M, false, 1),
  makeWorker(2, 1, '이서연', '데이터 정리·분석', 'spCopy', '수집 데이터 논리 분석·정리, 팩트 체크, 작업용 구조화', P, M, false, 1),
  makeWorker(3, 2, '박지민', '기획안 설계', 'spImage', '상세페이지 전체 플로우·스토리텔링 설계, 타사 비교 기획', P, M, false, 1),
  makeWorker(4, 3, '최유진', '카피·후킹', 'spCRO', '상세페이지 카피라이팅, 후킹성 부여, 이탈율 최소화', P, M, false, 1),
  makeWorker(5, 4, '정민수', 'AI 이미지', 'daStrategy', '상세페이지 제품 AI 이미지 생성 (선택적 참여)', 'google' as LLMProvider, 'gemini-2.0-flash-exp', false, 1),
  makeWorker(6, 5, '강다현', '중간 컨펌', 'daCopy', '상세페이지 중간 컨펌, 카피 보완·흐름 유지', P, M, false, 1),
  makeWorker(7, 6, '윤재호', '단점 지적·검수', 'daAnalysis', '기획안 약점 지적·문제점 분석 (과장 없이 솔직하게)', P, M, false, 1),
  makeWorker(8, 7, '김인기', '최종 컨펌·A/B', 'daCreative', '최종 컨펌 작업 + A안/B안 제시, 신중한 최종 판단', P, M, false, 1),
  makeWorker(9, 8, '윤성현', '중간관리자', 'manager', '중간관리자 (프로세스·데이터 관리, 최종 보고서 취합)', P, M, false, 1),
  { ...makeWorker(10, 0, '송승환', '파운더', 'manager', '파운더 / CEO (전체 총괄)', P, M, true, 1) },
];

export const useOfficeStore = create<OfficeStore>((set, get) => ({
  currentFloor: 1 as FloorId,
  setCurrentFloor: (floor) => set({ currentFloor: floor }),

  workers: [...INITIAL, ...FLOOR2_INITIAL, ...FLOOR3_INITIAL],
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

  floor2Project: null,
  floor2Messages: [],
  floor2Timeline: [],

  floor3Project: null,
  floor3Messages: [],
  floor3Timeline: [],

  getFloorWorkers: (floor) => get().workers.filter(w => w.floor === floor),
  getActiveProject: () => {
    const s = get();
    return s.currentFloor === 1 ? s.project : s.currentFloor === 2 ? s.floor2Project : s.floor3Project;
  },
  getActiveMessages: () => {
    const s = get();
    return s.currentFloor === 1 ? s.officeMessages : s.currentFloor === 2 ? s.floor2Messages : s.floor3Messages;
  },

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

  /* 2층 카피보관함 */
  floor2CopyArchive: [],
  addFloor2CopyArchiveItem: (item) => set(s => ({
    floor2CopyArchive: [...s.floor2CopyArchive, { ...item, id: uid() }],
  })),
  updateFloor2CopyArchiveItem: (id, updates) => set(s => ({
    floor2CopyArchive: s.floor2CopyArchive.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c),
  })),
  removeFloor2CopyArchiveItem: (id) => set(s => ({
    floor2CopyArchive: s.floor2CopyArchive.filter(c => c.id !== id),
  })),
  setFloor2CopyArchive: (items) => set({ floor2CopyArchive: items }),

  /* 2층 프로젝트 */
  startFloor2Project: (productInfo, phases, opts) => {
    const colorIdx = (get().projectQueue.length) % PROJECT_COLORS.length;
    const proj: Project = {
      id: uid(), productInfo, status: 'planning',
      phases, messages: [], finalReport: null,
      createdAt: Date.now(), color: PROJECT_COLORS[colorIdx],
      ...opts,
    };
    const workerUpdates = phases.map(p => p.workerId);
    set(s => ({
      floor2Project: proj,
      workers: s.workers.map(w =>
        workerUpdates.includes(w.id) ? { ...w, projectColor: proj.color } : w
      ),
      modal: { type: null, workerId: null },
    }));
  },

  setFloor2ProjectStatus: (status) => set(s => ({
    floor2Project: s.floor2Project ? { ...s.floor2Project, status } : null,
  })),

  completeFloor2Project: (finalReport) => set(s => {
    if (!s.floor2Project) return {};
    const completed: Project = {
      ...s.floor2Project, status: 'completed', finalReport, completedAt: Date.now(),
    };
    return {
      floor2Project: completed,
      projectQueue: [...s.projectQueue, completed],
    };
  }),

  addFloor2Message: (msg) => set(s => ({
    floor2Messages: [...s.floor2Messages.slice(-200), msg],
  })),

  reviewFloor2Project: (feedback) => set(s => {
    if (!s.floor2Project) return {};
    if (feedback) {
      return { floor2Project: { ...s.floor2Project, reviewFeedback: feedback, reviewed: false } };
    }
    return { floor2Project: { ...s.floor2Project, reviewed: true, reviewFeedback: undefined } };
  }),

  /* 3층 프로젝트 */
  startFloor3Project: (productInfo, phases, opts) => {
    const colorIdx = (get().projectQueue.length) % PROJECT_COLORS.length;
    const proj: Project = {
      id: uid(), productInfo, status: 'planning',
      phases, messages: [], finalReport: null,
      createdAt: Date.now(), color: PROJECT_COLORS[colorIdx],
      ...opts,
    };
    const workerUpdates = phases.map(p => p.workerId);
    set(s => ({
      floor3Project: proj,
      workers: s.workers.map(w =>
        workerUpdates.includes(w.id) ? { ...w, projectColor: proj.color } : w
      ),
      modal: { type: null, workerId: null },
    }));
  },

  setFloor3ProjectStatus: (status) => set(s => ({
    floor3Project: s.floor3Project ? { ...s.floor3Project, status } : null,
  })),

  completeFloor3Project: (finalReport) => set(s => {
    if (!s.floor3Project) return {};
    const completed: Project = {
      ...s.floor3Project, status: 'completed', finalReport, completedAt: Date.now(),
    };
    return {
      floor3Project: completed,
      projectQueue: [...s.projectQueue, completed],
    };
  }),

  addFloor3Message: (msg) => set(s => ({
    floor3Messages: [...s.floor3Messages.slice(-200), msg],
  })),

  reviewFloor3Project: (feedback) => set(s => {
    if (!s.floor3Project) return {};
    if (feedback) {
      return { floor3Project: { ...s.floor3Project, reviewFeedback: feedback, reviewed: false } };
    }
    return { floor3Project: { ...s.floor3Project, reviewed: true, reviewFeedback: undefined } };
  }),
}));
