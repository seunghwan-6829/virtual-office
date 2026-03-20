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
  | 'manager';

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
  type: 'task' | 'report' | 'manager' | 'addWorker' | 'stats' | 'projectInput' | 'finalReport' | null;
  workerId: string | null;
}

export type ProjectStatus = 'idle' | 'planning' | 'in_progress' | 'compiling' | 'completed';
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
}

export interface AgentMessage {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  message: string;
  type: 'handoff' | 'feedback' | 'question' | 'approval' | 'status';
  timestamp: number;
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
}

export interface SpeechBubbleData {
  workerId: string;
  text: string;
  expiresAt: number;
}

export const CHAR_UI_COLORS: string[] = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#c0392b', '#546e7a', '#37474f',
];

export function getCharColor(charId: number): string {
  return CHAR_UI_COLORS[(charId - 1) % CHAR_UI_COLORS.length];
}
