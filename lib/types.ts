export const BG_WIDTH = 2752;
export const BG_HEIGHT = 1536;
export const CHAR_HEIGHT = 128;
export const MOVE_SPEED = 320;

export type WorkerState =
  | 'idle'
  | 'chatting'
  | 'working'
  | 'walkingToCEO'
  | 'waitingAtCEO'
  | 'reporting'
  | 'walkingBack';

export type LLMProvider = 'openai' | 'anthropic' | 'google';
export type Direction = 'up' | 'down' | 'left' | 'right';

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

export interface ModalState {
  type: 'task' | 'report' | 'manager' | 'addWorker' | 'stats' | null;
  workerId: string | null;
}

export const CHAR_UI_COLORS: string[] = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#c0392b', '#546e7a', '#37474f',
];

export function getCharColor(charId: number): string {
  return CHAR_UI_COLORS[(charId - 1) % CHAR_UI_COLORS.length];
}
