import { useOfficeStore } from './store';
import { AgentMessage } from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function postOfficeMsg(msg: Omit<AgentMessage, 'id' | 'timestamp'>) {
  const s = useOfficeStore.getState();
  const full: AgentMessage = { ...msg, id: uid(), timestamp: Date.now() };
  s.addOfficeMessage(full);
  if (s.project && s.project.status !== 'completed') {
    s.addProjectMessage(full);
  }
  s.setSpeechBubble(msg.fromId, msg.message, 5000);
}

// ================================================================
// MANAGER PATROL — 3~5분마다 랜덤 1명 방문, 팁/체크, 온라인 정보 습득 후 교차검증
// ================================================================

const MANAGER_CHECK_MESSAGES = [
  (name: string) => `${name}님, 진행 상황 어때요? 막히는 거 있으면 말해주세요.`,
  (name: string) => `${name}님, 지금 하고 있는 작업 방향 괜찮은 것 같아요. 계속 진행해주세요!`,
  (name: string) => `${name}님, 혹시 다른 팀원한테 필요한 자료 있어요?`,
  (name: string) => `${name}님, 퀄리티 체크 해봤는데 잘 가고 있네요. 파이팅!`,
  (name: string) => `${name}님, 잠깐 이거 한번 봐봐요. 참고하면 좋을 것 같아서요.`,
];

const MANAGER_TIP_TOPICS: { role: string; tips: string[] }[] = [
  { role: 'sp', tips: [
    '최근 상세페이지 트렌드를 분석해봤는데, 숏폼 형태의 GIF 삽입이 전환율을 15% 높이고 있어요.',
    '요즘 상페에서 후기 섹션을 상단으로 올리는 게 유행이에요. 소비자 신뢰도 먼저 확보하는 전략이죠.',
    '모바일 퍼스트로 갈 때 CTA 버튼은 thumb zone에 배치하는 게 핵심이에요.',
    '경쟁사들이 비포/애프터 이미지를 적극 활용하고 있어요. 우리도 고려해봐요.',
  ]},
  { role: 'da', tips: [
    'Meta 알고리즘이 최근 변경돼서, 리타겟팅 윈도우를 7일로 줄이는 게 효율적이래요.',
    '구글 퍼포먼스맥스 캠페인에서 에셋 다양성이 핵심이에요. 최소 15개 이상 권장.',
    'CTR 개선을 위해 광고 카피에 숫자와 괄호를 넣으면 평균 30% 향상된다는 데이터가 있어요.',
    'CPC가 높아지고 있는 추세라, 네이버 검색광고 비중을 좀 더 높여보는 것도 방법이에요.',
  ]},
];

async function callManagerLLM(instruction: string): Promise<string> {
  try {
    const s = useOfficeStore.getState();
    const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction,
        role: '중간관리자',
        roleKey: 'manager',
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

async function managerPatrol() {
  const s = useOfficeStore.getState();
  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  if (!manager || manager.state !== 'idle') return;

  const regularWorkers = s.workers.filter(w => !w.isManager && w.roleKey !== 'manager');
  if (regularWorkers.length === 0) return;

  const target = pick(regularWorkers);

  s.setWorkerAutonomousWalk(manager.id, target.id);

  postOfficeMsg({
    fromId: manager.id, fromName: manager.name,
    toId: target.id, toName: target.name,
    message: pick(MANAGER_CHECK_MESSAGES)(target.name),
    type: 'manager_check',
  });

  await delay(3000);

  const team = ['spPlanner', 'spCopy', 'spImage', 'spCRO'].includes(target.roleKey) ? 'sp' : 'da';
  const tips = MANAGER_TIP_TOPICS.find(t => t.role === team)?.tips ?? [];

  if (tips.length > 0 && Math.random() > 0.3) {
    const tipText = pick(tips);

    const verified = await callManagerLLM(
      `다음 정보를 교차 검증하세요. 사실인지 확인하고, 정확하다면 "✅ 검증 완료" 태그와 함께 ${target.name}(${target.title})에게 전달할 간결한 한국어 팁(2문장 이내)으로 다시 작성하세요. 부정확하면 "⚠️ 주의" 태그를 붙이세요.\n\n원본 정보: ${tipText}`
    );

    if (verified) {
      const shortTip = verified.length > 150 ? verified.slice(0, 150) + '...' : verified;
      postOfficeMsg({
        fromId: manager.id, fromName: manager.name,
        toId: target.id, toName: target.name,
        message: shortTip,
        type: 'manager_tip',
      });
    } else {
      postOfficeMsg({
        fromId: manager.id, fromName: manager.name,
        toId: target.id, toName: target.name,
        message: `${target.name}님, 관련 자료 찾아보고 있는데 좀 더 확인해볼게요!`,
        type: 'manager_tip',
      });
    }
  }

  await delay(4000);
  s.workerReturnToDesk(manager.id);
}

// ================================================================
// CEO PATROL — 10분마다 나와서 개선사항 스스로 찾고 기록
// ================================================================

async function ceoPatrol() {
  const s = useOfficeStore.getState();
  const ceo = s.workers.find(w => w.isManager);
  if (!ceo) return;

  const recentMessages = s.officeMessages.slice(-20);
  const workerStates = s.workers
    .filter(w => !w.isManager && w.roleKey !== 'manager')
    .map(w => `${w.name}(${w.title}): ${w.state}`)
    .join(', ');

  const chatLog = recentMessages.map(m => `[${m.fromName}→${m.toName}] ${m.message}`).join('\n');

  const instruction = `당신은 CEO(송승환)입니다. 현재 사무실 상태를 관찰하고 개선할 점을 찾으세요.

[현재 직원 상태]
${workerStates}

[최근 사내 대화]
${chatLog || '(대화 없음)'}

[완료된 프로젝트 수] ${s.projectQueue.length}건

다음 형식으로 1가지 개선사항을 작성하세요 (JSON):
{
  "category": "process|quality|efficiency|team|general",
  "content": "개선사항 내용 (2~3문장)",
  "observation": "CEO 한마디 (단톡방에 올릴 짧은 코멘트)"
}`;

  const result = await callManagerLLM(instruction);

  if (result) {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.content) {
          s.addCEONote({
            content: parsed.content,
            category: parsed.category || 'general',
            timestamp: Date.now(),
            acknowledged: false,
          });

          const observation = parsed.observation || '다들 잘 하고 있네. 한 가지만 더 신경 써보자.';
          postOfficeMsg({
            fromId: ceo.id, fromName: ceo.name,
            toId: '', toName: '전체',
            message: observation,
            type: 'ceo_note',
          });
        }
      }
    } catch {
      postOfficeMsg({
        fromId: ceo.id, fromName: ceo.name,
        toId: '', toName: '전체',
        message: '잠깐 둘러봤는데 전체적으로 잘 가고 있네. 계속 화이팅!',
        type: 'ceo_note',
      });
    }
  }
}

// ================================================================
// AGENT COLLABORATION — 에이전트끼리 자율적으로 자료 공유/의논
// ================================================================

const COLLAB_PAIRS: [string, string, string[]][] = [
  ['spPlanner', 'spCopy', [
    '서연님, 기획안에서 이 부분 카피 방향 잡을 때 참고해주세요.',
    '하늘님, 이 섹션 카피 길이는 어느 정도가 좋을까요?',
  ]],
  ['spPlanner', 'spImage', [
    '지민님, 히어로 이미지 구도 이렇게 잡으면 어떨까요?',
    '하늘님, 제품 촬영 각도는 어떤 게 좋을까요?',
  ]],
  ['spCopy', 'spCRO', [
    '유진님, CTA 문구 이거랑 저거 중에 어떤 게 전환율 높을까요?',
    '서연님, 이 카피 A/B 테스트 추천드려요.',
  ]],
  ['daStrategy', 'daCopy', [
    '다현님, 이 채널 타겟팅에 맞는 톤 잡아주세요.',
    '민수님, 카피 스타일은 좀 더 직접적으로 갈까요?',
  ]],
  ['daStrategy', 'daCreative', [
    '인기님, 이 캠페인 메인 비주얼 방향 공유해요.',
    '민수님, 배너 사이즈별 레이아웃 정리해둘게요.',
  ]],
  ['daCopy', 'daAnalysis', [
    '재호님, 이전 카피 CTR 데이터 있으면 공유해주세요.',
    '다현님, 이 카피 셋이 성과 좋았어요. 비슷한 톤으로 가보세요.',
  ]],
  ['spImage', 'spCRO', [
    '유진님, 이미지 배치가 전환에 영향 주는 부분 체크해주세요.',
    '지민님, 이 위치에 제품 이미지 넣으면 체류시간 늘어날 거예요.',
  ]],
];

const CASUAL_MESSAGES = [
  (name: string) => `${name}님, 커피 한잔 하실래요? ☕`,
  (name: string) => `${name}님, 오늘 점심 뭐 먹을까요?`,
  (name: string) => `${name}님, 이거 재밌는 아티클인데 한번 읽어보세요!`,
  (name: string) => `다들 오늘도 수고하고 있네요 💪`,
  (name: string) => `${name}님, 어제 보내준 자료 잘 봤어요. 감사합니다!`,
];

async function agentCollaboration() {
  const s = useOfficeStore.getState();
  const available = s.workers.filter(w =>
    !w.isManager && w.roleKey !== 'manager' && w.state === 'idle'
  );
  if (available.length < 2) return;

  if (Math.random() < 0.4) {
    const w = pick(available);
    postOfficeMsg({
      fromId: w.id, fromName: w.name,
      toId: '', toName: '전체',
      message: pick(CASUAL_MESSAGES)(pick(available.filter(v => v.id !== w.id)).name),
      type: 'casual',
    });
    return;
  }

  const validPairs = COLLAB_PAIRS.filter(([a, b]) =>
    available.some(w => w.roleKey === a) && available.some(w => w.roleKey === b)
  );
  if (validPairs.length === 0) return;

  const [roleA, roleB, messages] = pick(validPairs);
  const workerA = available.find(w => w.roleKey === roleA);
  const workerB = available.find(w => w.roleKey === roleB);
  if (!workerA || !workerB) return;

  s.setWorkerAutonomousWalk(workerA.id, workerB.id);

  postOfficeMsg({
    fromId: workerA.id, fromName: workerA.name,
    toId: workerB.id, toName: workerB.name,
    message: pick(messages),
    type: 'collab',
  });

  await delay(5000);

  const replies = [
    `네, 알겠습니다! 바로 반영할게요.`,
    `좋은 의견이에요. 제가 수정해서 다시 보여드릴게요.`,
    `감사합니다! 이거 참고해서 진행할게요.`,
    `오 이거 좋네요. 잠깐 같이 얘기해봐요.`,
  ];

  postOfficeMsg({
    fromId: workerB.id, fromName: workerB.name,
    toId: workerA.id, toName: workerA.name,
    message: pick(replies),
    type: 'collab',
  });

  await delay(3000);
  s.workerReturnToDesk(workerA.id);
}

// ================================================================
// LIFECYCLE CONTROLLER
// ================================================================

let managerTimer: ReturnType<typeof setTimeout> | null = null;
let ceoTimer: ReturnType<typeof setTimeout> | null = null;
let collabTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function scheduleManager() {
  if (!running) return;
  const interval = randRange(180000, 300000); // 3~5분
  managerTimer = setTimeout(async () => {
    try { await managerPatrol(); } catch { /* noop */ }
    scheduleManager();
  }, interval);
}

function scheduleCEO() {
  if (!running) return;
  const interval = randRange(600000, 660000); // 10~11분
  ceoTimer = setTimeout(async () => {
    try { await ceoPatrol(); } catch { /* noop */ }
    scheduleCEO();
  }, interval);
}

function scheduleCollab() {
  if (!running) return;
  const interval = randRange(60000, 120000); // 1~2분
  collabTimer = setTimeout(async () => {
    try { await agentCollaboration(); } catch { /* noop */ }
    scheduleCollab();
  }, interval);
}

export function startOfficeLife() {
  if (running) return;
  running = true;

  setTimeout(() => scheduleManager(), randRange(15000, 30000));
  setTimeout(() => scheduleCEO(), randRange(30000, 60000));
  setTimeout(() => scheduleCollab(), randRange(10000, 20000));

  setTimeout(() => {
    const s = useOfficeStore.getState();
    const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
    if (mgr) {
      postOfficeMsg({
        fromId: mgr.id, fromName: mgr.name,
        toId: '', toName: '전체',
        message: '좋은 아침이에요! 오늘도 화이팅합시다. 필요한 거 있으면 언제든 말해주세요 😊',
        type: 'casual',
      });
    }
  }, 3000);
}

export function stopOfficeLife() {
  running = false;
  if (managerTimer) { clearTimeout(managerTimer); managerTimer = null; }
  if (ceoTimer) { clearTimeout(ceoTimer); ceoTimer = null; }
  if (collabTimer) { clearTimeout(collabTimer); collabTimer = null; }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
