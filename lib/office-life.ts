import { useOfficeStore } from './store';
import { AgentMessage } from './types';
import { createClient } from './supabase/client';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CHAT_STORAGE_KEY = 'virtual-office-chat';
const CEO_NOTES_KEY = 'virtual-office-ceo-notes';
const MIGRATION_KEY = 'virtual-office-migration-v2';

let cachedUid: string | null = null;

async function getUid(): Promise<string | null> {
  if (cachedUid) return cachedUid;
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user?.id) cachedUid = user.id;
    return cachedUid;
  } catch { return null; }
}

export async function loadPersistedChat() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const msgs: AgentMessage[] = JSON.parse(raw);
      const s = useOfficeStore.getState();
      const existingIds = new Set(s.officeMessages.map(m => m.id));
      for (const m of msgs) {
        if (!existingIds.has(m.id)) s.addOfficeMessage(m);
      }
    }
    const notesRaw = localStorage.getItem(CEO_NOTES_KEY);
    if (notesRaw) {
      const notes = JSON.parse(notesRaw);
      const s = useOfficeStore.getState();
      const existingNoteIds = new Set(s.ceoNotes.map(n => n.id));
      for (const n of notes) {
        if (!existingNoteIds.has(n.id)) s.addCEONote(n);
      }
    }
  } catch { /* noop */ }

  try {
    const userId = await getUid();
    if (!userId) return;
    const sb = createClient();
    const { data: msgs } = await sb
      .from('office_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (msgs && msgs.length > 0) {
      const s = useOfficeStore.getState();
      const existingIds = new Set(s.officeMessages.map(m => m.id));
      for (const d of msgs.reverse()) {
        if (!existingIds.has(d.id)) {
          s.addOfficeMessage({
            id: d.id, fromId: d.from_id, fromName: d.from_name,
            toId: d.to_id, toName: d.to_name,
            message: d.message, type: d.type,
            timestamp: new Date(d.created_at).getTime(),
          });
        }
      }
    }
    const { data: notes } = await sb
      .from('ceo_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (notes && notes.length > 0) {
      const s = useOfficeStore.getState();
      const existingNoteIds = new Set(s.ceoNotes.map(n => n.id));
      for (const n of notes.reverse()) {
        if (!existingNoteIds.has(n.id)) {
          s.addCEONote({
            content: n.content, category: n.category,
            timestamp: new Date(n.created_at).getTime(),
            acknowledged: n.acknowledged, feedback: n.feedback,
          });
        }
      }
    }
  } catch { /* noop */ }
}

function persistChat() {
  try {
    const msgs = useOfficeStore.getState().officeMessages.slice(-300);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
    const notes = useOfficeStore.getState().ceoNotes;
    localStorage.setItem(CEO_NOTES_KEY, JSON.stringify(notes));
  } catch { /* noop */ }
}

const msgQueue: AgentMessage[] = [];
let flushing = false;

async function saveMsgToSupabase(msg: AgentMessage) {
  msgQueue.push(msg);
  if (flushing) return;
  flushing = true;

  await new Promise(r => setTimeout(r, 2000));

  const batch = msgQueue.splice(0);
  if (batch.length === 0) { flushing = false; return; }

  try {
    const userId = await getUid();
    if (!userId) { flushing = false; return; }
    const sb = createClient();
    const rows = batch.map(m => ({
      id: m.id, user_id: userId,
      from_id: m.fromId, from_name: m.fromName,
      to_id: m.toId, to_name: m.toName,
      message: m.message.slice(0, 5000), type: m.type,
    }));
    const { error } = await sb.from('office_messages').upsert(rows);
    if (error) console.warn('[office-msg] save error:', error.message);
  } catch (e) {
    console.warn('[office-msg] save exception:', e);
  }
  flushing = false;

  if (msgQueue.length > 0) saveMsgToSupabase(msgQueue[0]);
}

function bubbleText(text: string): string {
  return text.length > 10 ? text.slice(0, 10) + '...' : text;
}

const recentMsgHashes = new Set<string>();
const DEDUP_WINDOW_MS = 30_000;

function postOfficeMsg(msg: Omit<AgentMessage, 'id' | 'timestamp'>) {
  const hash = `${msg.fromId}|${msg.toId}|${msg.message.slice(0, 60)}`;
  if (recentMsgHashes.has(hash)) return;

  recentMsgHashes.add(hash);
  setTimeout(() => recentMsgHashes.delete(hash), DEDUP_WINDOW_MS);

  const s = useOfficeStore.getState();
  const full: AgentMessage = { ...msg, id: uid(), timestamp: Date.now() };
  s.addOfficeMessage(full);
  if (s.project && s.project.status !== 'completed') {
    s.addProjectMessage(full);
  }
  s.setSpeechBubble(msg.fromId, bubbleText(msg.message), 5000);
  persistChat();
  saveMsgToSupabase(full);
}

function walkBack(workerId: string) {
  const s = useOfficeStore.getState();
  s.workerWalkBackToDesk(workerId);
}

/* ================================================================
   AGENT HARMONY — 에이전트 간 가벼운 인사/격려 (정보 공유 없음)
   ================================================================ */

async function agentHarmony() {
  const s = useOfficeStore.getState();
  const available = s.workers.filter(w =>
    !w.isManager && w.roleKey !== 'manager' && w.state === 'idle' && w.floor === 1
  );
  if (available.length < 2) return;

  const w = pick(available);
  const other = pick(available.filter(v => v.id !== w.id));

  const greetings = [
    `${other.name}님, 오늘도 수고하고 있네요!`,
    `${other.name}님, 힘내세요! 화이팅!`,
    `${other.name}님, 오늘 컨디션 좋아 보여요!`,
    `${other.name}님, 같이 열심히 해봐요!`,
    `${other.name}님, 점심 맛있게 드셨어요?`,
    `${other.name}님, 요즘 잘 되고 계시죠?`,
    `${other.name}님, 오늘도 멋진 하루 보내세요!`,
  ];

  postOfficeMsg({
    fromId: w.id, fromName: w.name,
    toId: other.id, toName: other.name,
    message: pick(greetings),
    type: 'casual',
  });
}

/* ================================================================
   LIFECYCLE CONTROLLER
   ================================================================ */

let harmonyTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function scheduleHarmony() {
  if (!running) return;
  harmonyTimer = setTimeout(async () => {
    try { await agentHarmony(); } catch { /* noop */ }
    if (running) scheduleHarmony();
  }, randRange(90000, 180000));
}

export function startOfficeLife() {
  if (running) return;
  running = true;

  if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CEO_NOTES_KEY);
    localStorage.setItem(MIGRATION_KEY, '1');
  }

  loadPersistedChat();

  setTimeout(() => scheduleHarmony(), randRange(15000, 30000));
}

export function stopOfficeLife() {
  running = false;
  if (harmonyTimer) { clearTimeout(harmonyTimer); harmonyTimer = null; }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
