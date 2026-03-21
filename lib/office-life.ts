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

async function saveAsTrainingData(fromName: string, fromRoleKey: string, toName: string, toRoleKey: string, message: string, type: string) {
  if (type === 'casual' || type === 'status' || !message || message.length < 15) return;
  try {
    const userId = await getUid();
    if (!userId) return;
    const sb = createClient();
    const roleKey = type === 'manager_tip' ? toRoleKey : fromRoleKey;
    const trainingType = type === 'manager_tip' ? 'reference' : type === 'collab' ? 'reference' : 'feedback';
    const prefix = type === 'manager_tip'
      ? `[관리자 팁 from ${fromName}]`
      : `[${fromName} → ${toName} 협업 대화]`;
    await sb.from('agent_training').insert({
      user_id: userId,
      role_key: roleKey,
      training_type: trainingType,
      content: `${prefix}\n${message}`,
    });
  } catch { /* noop */ }
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

async function callLLM(instruction: string, role = '중간관리자', roleKey = 'manager'): Promise<string> {
  try {
    const s = useOfficeStore.getState();
    const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction, role, roleKey,
        model: mgr?.model ?? 'claude-opus-4-6',
        provider: mgr?.provider ?? 'anthropic',
      }),
    });
    if (!res.ok) return '';
    const reader = res.body?.getReader();
    if (!reader) return '';
    const dec = new TextDecoder();
    let out = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
    }
    return out;
  } catch {
    return '';
  }
}

function walkBack(workerId: string) {
  const s = useOfficeStore.getState();
  s.workerWalkBackToDesk(workerId);
}

// ================================================================
// MANAGER PATROL — 3~5분마다: 리서치 3분 → 대상에게 전달 → 대상 응답 → 걸어서 복귀
// ================================================================

async function managerPatrol() {
  const s = useOfficeStore.getState();
  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  if (!manager || manager.state !== 'idle') return;

  const regularWorkers = s.workers.filter(w => !w.isManager && w.roleKey !== 'manager' && w.state === 'idle');
  if (regularWorkers.length === 0) return;

  const target = pick(regularWorkers);
  const team = ['spPlanner', 'spCopy', 'spImage', 'spCRO'].includes(target.roleKey) ? 'sp' : 'da';
  const teamLabel = team === 'sp' ? '상세페이지' : 'DA';

  postOfficeMsg({
    fromId: manager.id, fromName: manager.name,
    toId: '', toName: '전체',
    message: `${target.name}님을 위한 ${teamLabel} 관련 자료를 리서치 중입니다...`,
    type: 'status',
  });

  const recentChat = s.officeMessages.slice(-10).map(m => `${m.fromName}: ${m.message}`).join('\n');

  const researchResult = await callLLM(
    `당신은 중간관리자(윤성현)입니다. ${target.name}(${target.title})에게 업무에 도움이 될 조언을 해주세요.

[대상] ${target.name} (${target.title} / ${target.role})
[팀] ${teamLabel} 팀
[최근 사내 대화]
${recentChat || '(없음)'}

중요 규칙:
- 실제로 존재하지 않는 데이터나 수치를 만들어내지 마세요
- "~데이터를 공유합니다" 같은 실제로 하지 않은 행동을 언급하지 마세요
- 일반적인 업계 트렌드나 방법론 기반의 실용적 조언만 하세요
- "~해보시면 어떨까요?", "~을 고려해보세요" 형태의 제안을 하세요

다음 형식으로 응답하세요 (JSON):
{
  "research": "업무 관련 일반적 조언 (3~4문장, 날조된 수치 없이)",
  "verification": "해당 조언의 근거 (1문장)",
  "tip": "${target.name}님에게 전달할 핵심 팁 (2문장 이내, 존댓말)"
}
반드시 위 JSON만 반환하세요.`
  );

  let tipMessage = `${target.name}님, 관련 자료를 찾아봤는데 좀 더 정리해서 다시 알려드릴게요.`;

  if (researchResult) {
    try {
      const jsonMatch = researchResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tip) tipMessage = parsed.tip;
      }
    } catch { /* noop */ }
  }

  s.setWorkerAutonomousWalk(manager.id, target.id);
  await delay(4000);

  postOfficeMsg({
    fromId: manager.id, fromName: manager.name,
    toId: target.id, toName: target.name,
    message: tipMessage,
    type: 'manager_tip',
  });

  saveAsTrainingData(manager.name, 'manager', target.name, target.roleKey, tipMessage, 'manager_tip');

  await delay(3000);

  const targetResponse = await callLLM(
    `당신은 ${target.name}(${target.title})입니다. 중간관리자 윤성현님이 다음 팁을 알려줬습니다:

"${tipMessage}"

이에 대해 감사하면서 구체적으로 어떻게 적용할지 1~2문장으로 짧게 답변하세요. 존댓말로 답변하세요.`,
    target.role, target.roleKey,
  );

  const shortResponse = targetResponse?.trim() || '감사합니다! 바로 적용해볼게요.';

  postOfficeMsg({
    fromId: target.id, fromName: target.name,
    toId: manager.id, toName: manager.name,
    message: shortResponse,
    type: 'collab',
  });

  await delay(2000);
  walkBack(manager.id);
}

// CEO PATROL 제거 — CEO 메모는 수동으로만 관리

// ================================================================
// AGENT COLLABORATION — 실제 LLM 대화로 자료 교환 + 걸어서 복귀
// ================================================================

const COLLAB_TOPICS: [string, string, string][] = [
  ['spPlanner', 'spCopy', '상세페이지 기획 방향과 카피 톤앤매너'],
  ['spPlanner', 'spImage', '페이지 레이아웃과 이미지 구도 방향'],
  ['spCopy', 'spCRO', 'CTA 문구 최적화와 전환율'],
  ['spImage', 'spCRO', '이미지 배치와 사용자 체류 시간'],
  ['daStrategy', 'daCopy', '캠페인 전략에 맞는 광고 카피 톤'],
  ['daStrategy', 'daCreative', '캠페인 비주얼 방향과 매체별 소재'],
  ['daCopy', 'daAnalysis', '광고 카피 성과 데이터와 개선 방향'],
  ['daCreative', 'daAnalysis', '소재 디자인과 퍼포먼스 지표 연계'],
];

async function agentCollaboration() {
  const s = useOfficeStore.getState();
  const available = s.workers.filter(w =>
    !w.isManager && w.roleKey !== 'manager' && w.state === 'idle'
  );
  if (available.length < 2) return;

  if (Math.random() < 0.1) {
    const w = pick(available);
    const other = pick(available.filter(v => v.id !== w.id));
    postOfficeMsg({
      fromId: w.id, fromName: w.name,
      toId: '', toName: '전체',
      message: `${other.name}님, 오늘도 수고하고 있네요!`,
      type: 'casual',
    });
    return;
  }

  const validTopics = COLLAB_TOPICS.filter(([a, b]) =>
    available.some(w => w.roleKey === a) && available.some(w => w.roleKey === b)
  );
  if (validTopics.length === 0) return;

  const [roleA, roleB, topic] = pick(validTopics);
  const workerA = available.find(w => w.roleKey === roleA);
  const workerB = available.find(w => w.roleKey === roleB);
  if (!workerA || !workerB) return;

  s.setWorkerAutonomousWalk(workerA.id, workerB.id);

  const questionResult = await callLLM(
    `당신은 ${workerA.name}(${workerA.title})입니다. 동료 ${workerB.name}(${workerB.title})에게 "${topic}" 관련으로 질문하거나 의견을 구하세요.

중요 규칙:
- 실제로 하지 않은 작업을 했다고 말하지 마세요 (예: "데이터를 분석해봤는데" 같은 거짓 언급 금지)
- 구체적 수치나 결과를 날조하지 마세요
- "~하면 어떨까요?", "~에 대해 어떻게 생각하세요?" 같은 질문/제안 형태로 말하세요
- 2문장 이내, 존댓말 사용`,
    workerA.role, workerA.roleKey,
  );

  const question = questionResult?.trim() || `${workerB.name}님, ${topic} 관련해서 의견 좀 나눌 수 있을까요?`;

  await delay(3000);

  postOfficeMsg({
    fromId: workerA.id, fromName: workerA.name,
    toId: workerB.id, toName: workerB.name,
    message: question,
    type: 'collab',
  });

  await delay(4000);

  const answerResult = await callLLM(
    `당신은 ${workerB.name}(${workerB.title})입니다. 동료 ${workerA.name}(${workerA.title})이 다음과 같이 물었습니다: "${question}".

중요 규칙:
- 실제로 하지 않은 작업을 했다고 말하지 마세요
- 구체적 수치를 날조하지 마세요 (일반적인 업계 상식은 가능)
- "~해보면 좋을 것 같아요", "~방향으로 진행해볼까요?" 같은 제안 형태로 답변하세요
- 2~3문장, 존댓말 사용`,
    workerB.role, workerB.roleKey,
  );

  const answer = answerResult?.trim() || `좋은 질문이에요! 제가 확인해보고 자료 정리해서 공유드릴게요.`;

  postOfficeMsg({
    fromId: workerB.id, fromName: workerB.name,
    toId: workerA.id, toName: workerA.name,
    message: answer,
    type: 'collab',
  });

  saveAsTrainingData(workerA.name, workerA.roleKey, workerB.name, workerB.roleKey, question, 'collab');
  saveAsTrainingData(workerB.name, workerB.roleKey, workerA.name, workerA.roleKey, answer, 'collab');

  await delay(3000);
  walkBack(workerA.id);
}

// ================================================================
// LIFECYCLE CONTROLLER
// ================================================================

let managerTimer: ReturnType<typeof setTimeout> | null = null;
let collabTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function scheduleManager() {
  if (!running) return;
  managerTimer = setTimeout(async () => {
    try { await managerPatrol(); } catch { /* noop */ }
    if (running) scheduleManager();
  }, randRange(180000, 300000));
}

function scheduleCollab() {
  if (!running) return;
  collabTimer = setTimeout(async () => {
    try { await agentCollaboration(); } catch { /* noop */ }
    if (running) scheduleCollab();
  }, randRange(90000, 150000));
}

export function startOfficeLife() {
  if (running) return;
  running = true;

  loadPersistedChat();

  setTimeout(() => scheduleManager(), randRange(20000, 40000));
  setTimeout(() => scheduleCollab(), randRange(15000, 30000));
}

export function stopOfficeLife() {
  running = false;
  if (managerTimer) { clearTimeout(managerTimer); managerTimer = null; }
  if (collabTimer) { clearTimeout(collabTimer); collabTimer = null; }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
