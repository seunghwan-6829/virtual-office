export const BG_WIDTH = 2752;
export const BG_HEIGHT = 1536;
export const CHAR_HEIGHT = 155;
export const MOVE_SPEED = 320;

export type WorkerState =
  | 'idle'
  | 'chatting'
  | 'working'
  | 'walkingToCEO'
  | 'waitingAtCEO'
  | 'reporting'
  | 'revising'
  | 'walkingBack'
  | 'walkingToColleague'
  | 'discussing';

export type LLMProvider = 'openai' | 'anthropic' | 'google';
export type Direction = 'up' | 'down' | 'left' | 'right';

export type RoleKey =
  | 'spPlanner'
  | 'spCopy'
  | 'spImage'
  | 'spCRO'
  | 'daStrategy'
  | 'daCopy'
  | 'daAnalysis'
  | 'daCreative'
  | 'manager'
  | 'aiImage1'
  | 'aiImage2'
  | 'aiImage3'
  | 'aiImage4'
  | 'aiImage5'
  | 'aiImage6';

export type FloorId = 1 | 2;

export interface Position {
  x: number;
  y: number;
}

export interface OfficeSlot {
  id: string;
  seat: Position;
  door: Position;
  seatDirection: Direction;
}

// === Personality System ===

export interface AgentPersonality {
  creativity: number;     // 0~100: 보수적 ↔ 창의적
  detail: number;         // 0~100: 간결 ↔ 상세
  tone: number;           // 0~100: 포멀 ↔ 캐주얼
  aggression: number;     // 0~100: 안전 ↔ 공격적 마케팅
}

export const DEFAULT_PERSONALITY: AgentPersonality = {
  creativity: 50, detail: 60, tone: 40, aggression: 50,
};

// === Worker ===

export interface Worker {
  id: string;
  charId: number;
  name: string;
  title: string;
  roleKey: RoleKey;
  role: string;
  state: WorkerState;
  position: Position;
  officeId: string;
  provider: LLMProvider;
  model: string;
  currentTask: Task | null;
  path: Position[];
  pathIndex: number;
  direction: Direction;
  animTimer: number;
  isManager: boolean;
  personality: AgentPersonality;
  streamingText: string;
  projectColor?: string;
  floor: FloorId;
}

export interface Task {
  id: string;
  workerId: string;
  workerName: string;
  instruction: string;
  result: string;
  status: 'pending' | 'in_progress' | 'completed' | 'reported';
  createdAt: number;
  completedAt?: number;
  revisions: Revision[];
  metadata?: Record<string, unknown>;
}

export interface Revision {
  feedback: string;
  result: string;
  createdAt: number;
  completedAt?: number;
}

export interface ManagerLog {
  id: string;
  workerId: string;
  workerName: string;
  taskInstruction: string;
  taskResult: string;
  timestamp: number;
  durationMs: number;
  provider: LLMProvider;
  model: string;
}

export interface TaskRecord {
  id: string;
  workerId: string;
  workerName: string;
  workerTitle: string;
  roleKey: RoleKey;
  instruction: string;
  result: string;
  revisions: Revision[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  completedAt: number;
  durationMs: number;
}

export interface ModalState {
  type: 'task' | 'report' | 'manager' | 'addWorker' | 'stats'
      | 'projectInput' | 'finalReport' | 'personality' | 'templates'
      | 'abCompare' | 'resultEditor' | 'chatPanel' | 'timeline'
      | 'competitor' | null;
  workerId: string | null;
  extra?: Record<string, unknown>;
}

// === Project System ===

export type ProjectStatus = 'idle' | 'planning' | 'in_progress' | 'compiling' | 'completed' | 'waiting_image';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'revision';

export interface WorkPhase {
  id: string;
  roleKey: RoleKey;
  workerId: string;
  task: string;
  status: PhaseStatus;
  result: string;
  dependsOn: string[];
  order: number;
  team: 'sp' | 'da';
  abVariant?: 'A' | 'B';
  streamingText?: string;
}

export interface AgentMessage {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  message: string;
  type: 'handoff' | 'feedback' | 'question' | 'approval' | 'status'
      | 'user_intervention' | 'dialogue' | 'manager_check' | 'manager_tip'
      | 'ceo_note' | 'collab' | 'casual';
  timestamp: number;
}

export interface CEONote {
  id: string;
  content: string;
  category: 'process' | 'quality' | 'efficiency' | 'team' | 'general';
  timestamp: number;
  acknowledged: boolean;
  feedback?: string;
}

export interface Project {
  id: string;
  productInfo: string;
  status: ProjectStatus;
  phases: WorkPhase[];
  messages: AgentMessage[];
  finalReport: string | null;
  createdAt: number;
  completedAt?: number;
  color: string;
  templateId?: string;
  competitorData?: string;
  abEnabled?: boolean;
  reviewed?: boolean;
  reviewFeedback?: string;
}

export interface CopyArchiveItem {
  id: string;
  title: string;
  content: string;
  source: 'project' | 'manual';
  projectId?: string;
  roleKey?: string;
  workerName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SpeechBubbleData {
  workerId: string;
  text: string;
  expiresAt: number;
}

// === Timeline Replay ===

export interface TimelineEvent {
  id: string;
  projectId: string;
  timestamp: number;
  type: 'phase_start' | 'phase_complete' | 'message' | 'walk' | 'bubble' | 'intervention';
  actorId: string;
  actorName: string;
  detail: string;
  targetId?: string;
}

// === Project Templates ===

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  spPrompt: string;
  daPrompt: string;
  description: string;
}

// === Competitor Analysis ===

export interface CompetitorInput {
  url?: string;
  brandName: string;
  productName: string;
  strengths: string;
  weaknesses: string;
  notes: string;
}

// === A/B Testing ===

export interface ABResult {
  variantA: string;
  variantB: string;
  roleKey: RoleKey;
  workerName: string;
  selectedVariant?: 'A' | 'B';
}

// === Multi-Project ===

export const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981',
  '#ec4899', '#06b6d4', '#f97316',
];

// === UI Colors ===

export const CHAR_UI_COLORS: string[] = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#c0392b', '#546e7a', '#37474f',
];

export function getCharColor(charId: number): string {
  return CHAR_UI_COLORS[(charId - 1) % CHAR_UI_COLORS.length];
}
