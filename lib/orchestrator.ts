import { useOfficeStore } from './store';
import { RoleKey, WorkPhase, AgentMessage, AgentPersonality, CompetitorInput, Worker, Project, FloorId } from './types';
import { saveProjectSnapshot, getAgentHistory } from './storage';
import { createClient } from './supabase/client';

async function archiveCopyToSupabase(project: Project, workers: Worker[]) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const completed = project.phases.filter(p => p.status === 'completed' && p.result);
    for (const sp of completed) {
      const w = workers.find(v => v.id === sp.workerId);
      await supabase.from('copy_archive').insert({
        user_id: user.id,
        title: `[${w?.name ?? sp.roleKey}] ${project.productInfo.slice(0, 50)}`,
        content: sp.result,
        source: 'project',
        project_id: project.id,
        role_key: sp.roleKey,
        worker_name: w?.name ?? '',
      });
    }
  } catch { /* noop */ }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ================================================================
   1F 상세페이지 제작 파이프라인 (순차 실행)
   실행 순서: 1→2→3→4→6→7→8(A/B)→5(선택)
   ================================================================ */

interface PipelineStep {
  roleKey: RoleKey;
  step: number;
  label: string;
  taskTemplate: string;
  isOptional?: boolean;
  runsLast?: boolean;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    roleKey: 'spPlanner', step: 1, label: '시장조사·리서치',
    taskTemplate: `시장 조사 및 니즈 파악, 제품 장단점 분석을 수행하세요.

[수행 항목]
1. 해당 제품/서비스의 시장 트렌드 및 고객 니즈 파악
2. 제품의 장점과 단점을 객관적으로 분석
3. 비슷한 상품의 상세페이지 사례 3~4개 조사
4. 타사(경쟁사)는 어떻게 상세페이지를 구성하고 있는지 분석
5. 수집한 모든 데이터에 대해 교차 검증 수행 (기사/자료 하나당 추가 3~4개 소스 확인)

[주의사항]
- 허위 사실이나 날조된 데이터 절대 금지
- 2년 이상 오래된 자료는 배제
- 검증되지 않은 통계/수치 사용 금지

다음 단계(데이터 정리) 담당자가 바로 활용할 수 있도록 구조화된 보고서 형태로 작성하세요.`,
  },
  {
    roleKey: 'spCopy', step: 2, label: '데이터 정리·분석',
    taskTemplate: `이전 단계에서 수집된 데이터를 논리적으로 분석하고 정리하세요.

[수행 항목]
1. 수집된 데이터를 논리적으로 분류 및 정리
2. 해당 상품과 잘 어울리는 데이터를 선별하고 논리적 설명 추가
3. 다음 단계(기획안 설계) 담당자가 이해하기 쉽게 구성
4. 잘못된 자료가 없는지 최종 팩트 체크
5. 핵심 인사이트와 활용 방향을 명시

[주의사항]
- 정보 과다 금지 — 다음 단계에서 혼란을 줄 수 있는 불필요한 정보는 제거
- 중복 데이터 정리
- 출처가 불분명한 데이터 제거

깔끔하게 정리된 데이터 문서를 작성하세요. 다음 단계 기획자가 바로 작업에 들어갈 수 있도록 사전 구성까지 포함하세요.`,
  },
  {
    roleKey: 'spImage', step: 3, label: '기획안 설계',
    taskTemplate: `본격적인 상세페이지 기획안 작업을 시작하세요.

[수행 항목]
1. 타사(경쟁사)의 상세페이지 구성 방식을 다시 한번 분석
2. 전반적인 상세페이지 플로우와 구성을 설계
3. 제품 카테고리에 가장 적합한 스토리텔링 구조 선택 및 적용
   - AIDA, PAS, FAB, 문제-해결, Before/After, 감성 스토리, 데이터 기반 등
4. 섹션별 목적, 핵심 메시지, 예상 체류시간 명시
5. 타사 대비 확실히 퀄리티가 나은 구성 설계

[스토리텔링 가이드]
- 히어로 섹션: 강력한 첫인상 + 핵심 가치 전달
- 문제 제기: 타겟 고객의 pain point 자극
- 솔루션: 제품이 해결책인 이유
- 특장점: 경쟁사 대비 차별화 포인트
- 사회적 증거: 리뷰, 인증, 데이터
- CTA: 최종 전환 유도

이 단계는 전체 상세페이지의 뼈대를 잡는 핵심 작업입니다. 충분히 상세하게 작성하세요.`,
  },
  {
    roleKey: 'spCRO', step: 4, label: '카피·후킹',
    taskTemplate: `전달받은 상세페이지 기획안의 플로우와 구성을 카피로 디벨롭 시키세요.

[수행 항목]
1. 기획안의 스토리텔링 구조를 기반으로 전체 상세페이지 카피 작성
2. 상세페이지 초반 후킹성 강하게 설계 (첫 3초 안에 스크롤 멈추기)
3. 중간중간 지루해질 타이밍에 후킹 요소 삽입
4. 섹션별 헤드라인, 서브헤드, 본문, CTA 작성
5. 심리 트리거 활용: 호기심, 위기감, 이익, 사회적 증거, 희소성

[핵심 원칙]
- 상세페이지는 이탈율 줄이면 전환율이 올라가는 구조
- 카피가 지루해지거나 후킹성이 낮아지면 이탈율 급증
- 전구간에 걸쳐 긴장감과 흥미를 유지
- 고객의 언어로 작성, 혜택 중심 카피

각 섹션의 카피를 완성하되, 후킹 포인트를 명확히 표시하세요.`,
  },
  {
    roleKey: 'daCopy', step: 6, label: '중간 컨펌',
    taskTemplate: `지금까지 작업된 상세페이지 카피라이팅을 확인하고 보완하세요.

[수행 항목]
1. 전체 카피의 흐름과 일관성 점검
2. 카피의 톤, 강도, 후킹성이 전구간에서 유지되는지 확인
3. 추가적인 보완이 필요한 부분 수정
4. 오탈자, 문맥 오류, 논리적 비약 체크
5. 보완된 기획안 + 수정 내역 요약 작성

[주의사항]
- 기반이 되는 스토리텔링 구조나 전반적인 흐름을 크게 변경하지 마세요
- 부분 개선에 집중하되, 전체가 이상해지지 않도록 유의
- 수정한 부분은 명확하게 표시

중간 컨펌 완료된 상세페이지 기획안을 출력하세요.`,
  },
  {
    roleKey: 'daAnalysis', step: 7, label: '단점 지적·검수',
    taskTemplate: `중간 컨펌까지 완료된 기획안의 문제점과 약한 부분을 지적하세요.

[수행 항목]
1. 전체 기획안의 약점 분석
2. 전환율에 영향을 미칠 수 있는 문제점 지적
3. 이탈율을 높일 수 있는 구간 식별
4. 각 문제점에 대한 개선 방향 제안

[핵심 규칙]
- 이상하다고 무조건 잘라내라고 하지 마세요
- 단점이 없으면 "특별한 약점이 발견되지 않았습니다"라고 솔직하게 답하세요
- 사소한 부분을 과장해서 큰 문제로 만들지 마세요
- 실질적으로 전환율/이탈율에 영향을 미치는 부분만 지적
- 삭제가 아닌 보완 방향을 제시

최종 컨펌 담당자가 참고할 수 있도록 약점 분석 리포트를 작성하세요.`,
  },
  {
    roleKey: 'daCreative', step: 8, label: '최종 컨펌·A/B',
    taskTemplate: `모든 이전 단계의 작업을 종합하여 최종 컨펌 작업을 수행하세요. 이것은 A안(최종 수정본)입니다.

[수행 항목]
1. 약점 분석 리포트의 지적 사항 중 타당한 것 반영
2. 전체 기획안의 완성도를 높이는 최종 수정
3. 카피의 일관성, 후킹성, 전환 유도력 최종 점검
4. 부족한 부분 추가 작성

[핵심 규칙]
- 수정하기 전에 반드시 충분히 고민하세요 — 모든 단계의 마무리이므로 신중한 판단 필요
- 전체 흐름의 일관성을 해치지 않으면서 퀄리티를 높이세요

최종 확정된 상세페이지 기획안(A안)을 완성하세요.`,
  },
];

const STEP8_B_TEMPLATE = `모든 이전 단계의 작업을 종합하여 B안(변형본)을 작성하세요.

[B안 작성 지침]
1. A안과 동일한 상품 정보와 데이터를 기반으로 하되, 접근 방식을 다르게 하세요
2. 스토리텔링 구조, 톤앤매너, 후킹 방식 등에서 차별화
3. A안의 핵심 가치는 유지하면서 표현 방식만 변형
4. 완전히 다른 결과물이 아닌, 같은 목표를 다른 방식으로 달성하는 대안

[핵심 규칙]
- 내용이 산으로 가면 절대 안 됩니다
- A안의 핵심 메시지와 데이터는 유지
- 구성이나 순서, 톤, 카피 스타일만 변형

최종 확정된 상세페이지 기획안(B안)을 완성하세요.`;

const FLOOR2_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string; wave: number }[] = [
  { roleKey: 'aiImage1', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. 주어진 상품 정보를 기반으로 다양한 컨셉의 제품 이미지를 만들어주세요.' },
  { roleKey: 'aiImage2', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. 창의적인 배경과 라이팅으로 상품의 매력을 극대화하세요.' },
  { roleKey: 'aiImage3', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. 라이프스타일 연출 이미지를 중심으로 제작하세요.' },
  { roleKey: 'aiImage4', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. SNS 광고용 비주얼을 제작하세요.' },
  { roleKey: 'aiImage5', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. 상세페이지용 컨셉 이미지를 제작하세요.' },
  { roleKey: 'aiImage6', order: 0, wave: 1, taskTemplate: 'AI 제품 이미지를 생성해주세요. 프리미엄 감성의 제품 이미지를 제작하세요.' },
];

const FLOOR3_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string; wave: number }[] = [
  { roleKey: 'daDesign1', order: 0, wave: 1, taskTemplate: 'DA 광고 소재를 디자인해주세요. 주어진 상품 정보를 기반으로 클릭율을 높일 수 있는 배너/카드 소재를 기획하세요.' },
  { roleKey: 'daDesign2', order: 0, wave: 1, taskTemplate: 'DA 광고 카피를 작성해주세요. 짧고 임팩트 있는 헤드라인과 서브카피를 다양한 버전으로 만들어주세요.' },
  { roleKey: 'daDesign3', order: 0, wave: 1, taskTemplate: 'DA 매체 전략을 수립해주세요. 타겟 오디언스 분석, 매체별 전략, 예산 배분 방안을 제시하세요.' },
  { roleKey: 'daDesign4', order: 0, wave: 1, taskTemplate: 'DA 성과 예측 및 KPI를 설정해주세요. CTR, CVR, CPA 등 핵심 지표 목표를 수립하세요.' },
  { roleKey: 'daDesign5', order: 0, wave: 1, taskTemplate: 'DA 소재 A/B 테스트 플랜을 수립해주세요. 테스트 변수, 기간, 성공 기준을 설계하세요.' },
  { roleKey: 'daDesign6', order: 0, wave: 1, taskTemplate: 'DA 캠페인 운영 가이드를 작성해주세요. 일별 운영 체크리스트, 예산 관리, 소재 로테이션 전략을 포함하세요.' },
];

export type TeamSelection = 'both' | 'sp' | 'da';

export interface ProjectInput {
  teams: TeamSelection;
  spPrompt: string;
  daPrompt: string;
  abEnabled?: boolean;
  competitorData?: CompetitorInput;
  templateId?: string;
  floor?: FloorId;
}

function personalityToPrompt(p: AgentPersonality): string {
  const parts: string[] = [];
  if (p.creativity > 70) parts.push('혁신적이고 파격적인 아이디어를 적극 제안하세요.');
  else if (p.creativity < 30) parts.push('안정적이고 검증된 접근 방식을 사용하세요.');
  if (p.detail > 70) parts.push('매우 상세하고 구체적으로 작성하세요. 예시와 수치를 풍부하게 포함하세요.');
  else if (p.detail < 30) parts.push('핵심만 간결하게 전달하세요.');
  if (p.tone > 70) parts.push('친근하고 캐주얼한 톤으로 작성하세요.');
  else if (p.tone < 30) parts.push('격식 있고 전문적인 톤을 유지하세요.');
  if (p.aggression > 70) parts.push('공격적이고 도발적인 마케팅 전략을 사용하세요. 강한 클릭 유도와 FOMO를 적극 활용하세요.');
  else if (p.aggression < 30) parts.push('신뢰감을 주는 차분한 마케팅 접근을 사용하세요.');
  return parts.length > 0 ? `\n\n[작업 스타일 지시]\n${parts.join('\n')}` : '';
}

function competitorToPrompt(c?: CompetitorInput): string {
  if (!c || (!c.brandName && !c.strengths)) return '';
  const parts = ['[경쟁사 분석 데이터]'];
  if (c.brandName) parts.push(`경쟁 브랜드: ${c.brandName}`);
  if (c.productName) parts.push(`경쟁 상품: ${c.productName}`);
  if (c.url) parts.push(`참고 URL: ${c.url}`);
  if (c.strengths) parts.push(`경쟁사 강점: ${c.strengths}`);
  if (c.weaknesses) parts.push(`경쟁사 약점 (활용 가능): ${c.weaknesses}`);
  if (c.notes) parts.push(`추가 메모: ${c.notes}`);
  parts.push('위 경쟁사 정보를 반드시 참고하여, 경쟁사 대비 차별화 전략을 결과물에 반영하세요.');
  return '\n\n' + parts.join('\n');
}

export function createProjectPhases(input: ProjectInput): WorkPhase[] {
  const workers = useOfficeStore.getState().workers;
  const phases: WorkPhase[] = [];

  if (input.floor === 2 || input.floor === 3) {
    const workflow = input.floor === 3 ? FLOOR3_WORKFLOW : FLOOR2_WORKFLOW;
    for (const wf of workflow) {
      const worker = workers.find(w => w.roleKey === wf.roleKey);
      if (!worker) continue;
      const phaseId = uid();
      phases.push({
        id: phaseId,
        roleKey: wf.roleKey,
        workerId: worker.id,
        task: `[상품/서비스 정보]\n${input.spPrompt}\n\n[업무 지시]\n${wf.taskTemplate}`,
        status: 'pending',
        result: '',
        dependsOn: [],
        order: wf.order,
        team: 'sp',
      });
    }
    return phases;
  }

  const executionOrder = [...PIPELINE_STEPS].sort((a, b) => a.step - b.step);

  let prevId: string | undefined;

  for (const step of executionOrder) {
    const worker = workers.find(w => w.roleKey === step.roleKey && w.floor === 1);
    if (!worker) continue;

    const phaseId = uid();

    phases.push({
      id: phaseId,
      roleKey: step.roleKey,
      workerId: worker.id,
      task: `[상품/서비스 정보]\n${input.spPrompt}\n\n[업무 지시]\n${step.taskTemplate}`,
      status: 'pending',
      result: '',
      dependsOn: prevId ? [prevId] : [],
      order: step.step,
      team: 'sp',
    });

    if (step.roleKey === 'daCreative') {
      phases[phases.length - 1].abVariant = 'A';
      const bId = uid();
      phases.push({
        id: bId,
        roleKey: step.roleKey,
        workerId: worker.id,
        task: `[상품/서비스 정보]\n${input.spPrompt}\n\n[업무 지시]\n${STEP8_B_TEMPLATE}`,
        status: 'pending',
        result: '',
        dependsOn: prevId ? [prevId] : [],
        order: step.step,
        team: 'sp',
        abVariant: 'B',
      });
      prevId = phaseId;
    } else {
      prevId = phaseId;
    }
  }

  return phases;
}

function bubble(workerId: string, text: string, ms = 4000) {
  useOfficeStore.getState().setSpeechBubble(workerId, text, ms);
}

function msg(fromId: string, fromName: string, toId: string, toName: string, message: string, type: AgentMessage['type']) {
  const m: AgentMessage = { id: uid(), fromId, fromName, toId, toName, message, type, timestamp: Date.now() };
  useOfficeStore.getState().addProjectMessage(m);
  bubble(fromId, message);
}

function recordTimeline(type: string, actorId: string, actorName: string, detail: string, targetId?: string) {
  const proj = useOfficeStore.getState().project;
  if (!proj) return;
  useOfficeStore.getState().addTimelineEvent({
    projectId: proj.id,
    timestamp: Date.now(),
    type: type as 'phase_start',
    actorId, actorName, detail, targetId,
  });
}

function getAccumulatedResults(allPhases: WorkPhase[], currentPhase: WorkPhase): string {
  const completed = allPhases
    .filter(p => p.status === 'completed' && p.order < currentPhase.order && !p.abVariant)
    .sort((a, b) => a.order - b.order);
  if (completed.length === 0) {
    const anyCompleted = allPhases.filter(p =>
      p.status === 'completed' && currentPhase.dependsOn.includes(p.id)
    );
    if (anyCompleted.length === 0) return '';
    return '\n\n[이전 단계 작업 결과]\n' + anyCompleted.map(p => {
      const w = useOfficeStore.getState().workers.find(v => v.id === p.workerId);
      return `--- ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${p.result}`;
    }).join('\n\n');
  }
  return '\n\n[이전 단계 작업 결과]\n' + completed.map(p => {
    const w = useOfficeStore.getState().workers.find(v => v.id === p.workerId);
    return `--- [순서${p.order}] ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${p.result}`;
  }).join('\n\n');
}

function detectTruncation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;

  const properEndings = ['.', '!', '?', ')', ']', '」', '>', '|', '-', '~', '※'];
  const lastChar = trimmed[trimmed.length - 1];
  const endsClean = properEndings.includes(lastChar)
    || trimmed.endsWith('---')
    || trimmed.endsWith('```')
    || /\n#{1,3}\s/.test(trimmed.slice(-50));

  if (endsClean) return false;

  const lastLine = trimmed.split('\n').pop() ?? '';
  if (lastLine.length > 10 && !lastLine.endsWith('.') && !lastLine.endsWith('!') && !lastLine.endsWith('?')) {
    return true;
  }
  return false;
}

const MAX_CONTINUATION_ROUNDS = 3;

async function callLLMStreaming(
  instruction: string,
  worker: { role: string; roleKey: string; model: string; name: string; title: string; provider?: string },
  onChunk?: (text: string) => void,
  maxTokens?: number,
): Promise<string> {
  const effectiveMax = maxTokens ?? 16384;

  const MAX_API_RETRIES = 6;

  let streamPrefix = '';

  async function singleCallOnce(prompt: string, tokens: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: prompt,
          role: worker.role,
          roleKey: worker.roleKey,
          model: worker.model,
          provider: worker.provider,
          maxTokens: tokens,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const dec = new TextDecoder();
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        out += chunk;
        onChunk?.(streamPrefix + out);
      }
      return out;
    } finally {
      clearTimeout(timeout);
    }
  }

  function isRetryable(msg: string): boolean {
    return msg.includes('Overloaded') || msg.includes('529') || msg.includes('504')
      || msg.includes('503') || msg.includes('rate') || msg.includes('TIMEOUT')
      || msg.includes('timeout') || msg.includes('abort') || msg.includes('FUNCTION_INVOCATION');
  }

  async function singleCall(prompt: string, tokens: number): Promise<string> {
    for (let attempt = 0; attempt < MAX_API_RETRIES; attempt++) {
      try {
        return await singleCallOnce(prompt, tokens);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isRetryable(msg) && attempt < MAX_API_RETRIES - 1) {
          const waitSec = Math.min(10 + attempt * 10, 60);
          onChunk?.(`[서버 과부하/타임아웃] ${waitSec}초 후 재시도합니다... (${attempt + 1}/${MAX_API_RETRIES})`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('최대 재시도 횟수 초과');
  }

  try {
    let accumulated = '';
    let currentInstruction = instruction;

    for (let round = 0; round <= MAX_CONTINUATION_ROUNDS; round++) {
      streamPrefix = accumulated;
      const chunk = await singleCall(currentInstruction, effectiveMax);
      accumulated += chunk;
      onChunk?.(accumulated);

      if (!detectTruncation(accumulated)) break;
      if (round === MAX_CONTINUATION_ROUNDS) break;

      currentInstruction = `${instruction}\n\n[이전까지 작성된 내용 — 여기서부터 이어서 작성하세요]\n${accumulated.slice(-3000)}\n\n위 내용에 이어서 나머지를 완성하세요. 중복 없이 자연스럽게 이어쓰세요.`;
    }

    return accumulated;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return `[API 오류] ${worker.name}(${worker.title})\n\n오류: ${errMsg}`;
  }
}

let interventionQueue: { phaseId: string; feedback: string }[] = [];

export function addIntervention(phaseId: string, feedback: string) {
  interventionQueue.push({ phaseId, feedback });
}

async function runPhase(phase: WorkPhase, allPhases: WorkPhase[], input: ProjectInput) {
  const s = useOfficeStore.getState();
  const worker = s.workers.find(w => w.id === phase.workerId);
  if (!worker) return;

  s.updatePhaseStatus(phase.id, 'in_progress');
  s.setWorkerState(worker.id, 'working');
  const variantLabel = phase.abVariant ? ` (${phase.abVariant}안)` : '';
  const stepLabel = `[순서${phase.order}] ${worker.title}`;
  bubble(worker.id, `${stepLabel}${variantLabel} 작업 시작!`, 6000);
  recordTimeline('phase_start', worker.id, worker.name, `${stepLabel}${variantLabel} 작업 시작`);

  const context = getAccumulatedResults(allPhases, phase);
  const history = getAgentHistory(phase.roleKey);
  const personalityPrompt = personalityToPrompt(worker.personality);
  const competitorContext = competitorToPrompt(input.competitorData);

  const fullInstruction = phase.task + context + history + personalityPrompt + competitorContext;

  const result = await callLLMStreaming(fullInstruction, worker, (streaming) => {
    useOfficeStore.getState().updatePhaseStreaming(phase.id, streaming);
    useOfficeStore.getState().updateWorkerStreaming(worker.id, streaming);
  }, 16384);

  useOfficeStore.getState().completePhase(phase.id, result);
  useOfficeStore.getState().setWorkerState(worker.id, 'idle');
  useOfficeStore.getState().updateWorkerStreaming(worker.id, '');
  phase.status = 'completed';
  phase.result = result;

  recordTimeline('phase_complete', worker.id, worker.name, `${stepLabel}${variantLabel} 완료`);
  msg(worker.id, worker.name, '', '전체', `${stepLabel}${variantLabel} 완료!`, 'status');

  const intervention = interventionQueue.find(i => i.phaseId === phase.id);
  if (intervention) {
    interventionQueue = interventionQueue.filter(i => i.phaseId !== phase.id);
    msg('user', 'CEO', worker.id, worker.name, intervention.feedback, 'user_intervention');
    recordTimeline('intervention', 'user', 'CEO', intervention.feedback, worker.id);

    s.updatePhaseStatus(phase.id, 'in_progress');
    s.setWorkerState(worker.id, 'working');
    bubble(worker.id, '수정 지시 반영 중...', 6000);

    const revisionInstruction = `${fullInstruction}\n\n[이전 결과]\n${result}\n\n[CEO 수정 지시]\n${intervention.feedback}\n\n위 수정 지시를 반영하여 전체 결과를 다시 작성하세요.`;
    const revised = await callLLMStreaming(revisionInstruction, worker, (streaming) => {
      useOfficeStore.getState().updatePhaseStreaming(phase.id, streaming);
    }, 16384);

    useOfficeStore.getState().completePhase(phase.id, revised);
    useOfficeStore.getState().setWorkerState(worker.id, 'idle');
    phase.result = revised;
    msg(worker.id, worker.name, 'user', 'CEO', '수정 완료!', 'status');
  }
}

function generateDialogue(fromName: string, toName: string): string {
  const dialogues = [
    `${toName}님, 제 작업 결과 전달합니다. 핵심 포인트 확인해주세요!`,
    `${toName}님, 이번 건 꼼꼼하게 작업했어요. 확인 부탁드려요!`,
    `${toName}님, 분석 끝났어요. 이 방향으로 진행해주세요!`,
    `${toName}님, 전 단계 결과 기반으로 작업하시면 됩니다!`,
  ];
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

async function compileReport(productInfo: string, phases: WorkPhase[], input: ProjectInput): Promise<string> {
  const s = useOfficeStore.getState();
  const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const mgrConfig = {
    role: mgr?.role ?? '중간관리자',
    roleKey: 'manager' as const,
    model: mgr?.model ?? 'claude-sonnet-4-20250514',
    name: mgr?.name ?? '윤성현',
    title: mgr?.title ?? '중간관리자',
    provider: mgr?.provider ?? 'anthropic',
  };

  const mainPhases = phases.filter(p => !p.abVariant || p.abVariant === 'A').sort((a, b) => a.order - b.order);
  const competitorCtx = competitorToPrompt(input.competitorData);

  const formatPhases = (ps: WorkPhase[]) => ps.map(p => {
    const w = s.workers.find(v => v.id === p.workerId);
    return `### [순서${p.order}] ${w?.name} (${w?.title})\n${p.result}`;
  }).join('\n\n');

  const allBody = formatPhases(mainPhases);

  const bPhase = phases.find(p => p.abVariant === 'B');
  let abSummary = '';
  if (bPhase) {
    const bWorker = s.workers.find(v => v.id === bPhase.workerId);
    abSummary = `\n\n[B안 (변형본)]\n--- ${bWorker?.name} B안 ---\n${bPhase.result?.slice(0, 2000)}`;
  }

  const managerHistory = getAgentHistory('manager');
  const commonCtx = `[상품 정보]\n${productInfo}${competitorCtx}${abSummary}${managerHistory}`;

  const updateStream = (accumulated: string) => {
    const project = useOfficeStore.getState().project;
    if (project) {
      useOfficeStore.getState().completeProject(accumulated);
      useOfficeStore.getState().setProjectStatus('compiling');
    }
  };

  bubble(mgr?.id ?? '', '섹션 1/4: 핵심 요약 작성 중...', 8000);
  const sec1 = await callLLMStreaming(
    `당신은 중간관리자입니다. CEO 보고용 최종 보고서의 "핵심 요약" 섹션만 작성하세요.

${commonCtx}

[전체 파이프라인 결과 요약]
${allBody.slice(0, 3000)}

작성 지침:
- "# 1. 핵심 요약 (Executive Summary)" 제목으로 시작
- 프로젝트 개요, 파이프라인 진행 경과, 핵심 결과물 정리
- 각 단계별 주요 성과를 불릿으로 정리
- 마크다운 형식으로 작성`,
    mgrConfig, undefined, 4096,
  );

  let accumulated = sec1;
  updateStream(accumulated);

  bubble(mgr?.id ?? '', '섹션 2/4: 리서치 & 기획 종합...', 8000);
  const sec2 = await callLLMStreaming(
    `당신은 중간관리자입니다. CEO 보고용 최종 보고서의 "리서치 & 기획 종합" 섹션만 작성하세요.

${commonCtx}

[순서1~3 작업 결과]
${mainPhases.filter(p => p.order <= 3).map(p => {
  const w = s.workers.find(v => v.id === p.workerId);
  return `### [순서${p.order}] ${w?.name} (${w?.title})\n${p.result}`;
}).join('\n\n')}

작성 지침:
- "# 2. 리서치 & 기획 종합" 제목으로 시작
- 시장조사 핵심 발견사항 정리
- 데이터 분석 인사이트
- 기획안 설계의 핵심 구성과 스토리텔링 방향
- 마크다운 형식으로 작성, 표/리스트 활용`,
    mgrConfig, undefined, 4096,
  );

  accumulated += '\n\n---\n\n' + sec2;
  updateStream(accumulated);

  bubble(mgr?.id ?? '', '섹션 3/4: 카피 & 컨펌 종합...', 8000);
  const sec3 = await callLLMStreaming(
    `당신은 중간관리자입니다. CEO 보고용 최종 보고서의 "카피라이팅 & 컨펌 종합" 섹션만 작성하세요.

${commonCtx}

[순서4~8 작업 결과]
${mainPhases.filter(p => p.order >= 4).map(p => {
  const w = s.workers.find(v => v.id === p.workerId);
  return `### [순서${p.order}] ${w?.name} (${w?.title})\n${p.result?.slice(0, 1500)}`;
}).join('\n\n')}

작성 지침:
- "# 3. 카피라이팅 & 컨펌 종합" 제목으로 시작
- 카피라이팅의 핵심 포인트와 후킹 전략 정리
- 중간 컨펌 결과 및 보완 사항
- 약점 지적 반영 결과
- 최종 A안의 완성도 평가
${bPhase ? '- A안 vs B안 비교 분석 (어떤 안이 왜 더 적합한지)' : ''}
- 마크다운 형식으로 작성, 표/리스트 활용`,
    mgrConfig, undefined, 4096,
  );

  accumulated += '\n\n---\n\n' + sec3;
  updateStream(accumulated);

  bubble(mgr?.id ?? '', '섹션 4/4: 최종 제언 및 액션 아이템...', 8000);
  const sec4 = await callLLMStreaming(
    `당신은 중간관리자입니다. CEO 보고용 최종 보고서의 "최종 제언 및 액션 아이템" 섹션만 작성하세요.

${commonCtx}

[이전 섹션 핵심 요약]
${sec1.slice(0, 1000)}

작성 지침:
- "# 4. 최종 제언 및 액션 아이템" 제목으로 시작
- 단기(1주), 중기(1개월), 장기(3개월) 액션 플랜 테이블
- 우선순위별 실행 로드맵
- 리스크 요인과 대응 방안
- 예상 성과 기대치
- 마크다운 형식으로 작성, 표 활용`,
    mgrConfig, undefined, 4096,
  );

  accumulated += '\n\n---\n\n' + sec4;
  return accumulated;
}

async function runFloor2Project(input: ProjectInput, phases: WorkPhase[], combinedInfo: string) {
  const s = useOfficeStore.getState();

  useOfficeStore.getState().setFloor2ProjectStatus('in_progress');

  for (const p of phases) {
    const w = s.workers.find(v => v.id === p.workerId);
    if (w) bubble(w.id, 'AI 이미지 작업 시작!', 6000);
  }

  await Promise.all(phases.map(async (p) => {
    const worker = s.workers.find(v => v.id === p.workerId);
    if (!worker) return;

    useOfficeStore.getState().setWorkerState(worker.id, 'working');
    const instruction = p.task + `\n\n[상품 정보]\n${combinedInfo}`;

    const result = await callLLMStreaming(instruction, worker, (streaming) => {
      useOfficeStore.getState().updateWorkerStreaming(worker.id, streaming);
    }, 4096);

    p.status = 'completed';
    p.result = result;
    useOfficeStore.getState().setWorkerState(worker.id, 'idle');
    useOfficeStore.getState().updateWorkerStreaming(worker.id, '');
    bubble(worker.id, '작업 완료!', 4000);
  }));

  const reportLines = phases.map(p => {
    const w = s.workers.find(v => v.id === p.workerId);
    return `### ${w?.name} (${w?.title})\n${p.result}`;
  });

  const report = `# AI 제작 부서 프로젝트 결과\n\n${reportLines.join('\n\n---\n\n')}`;
  useOfficeStore.getState().completeFloor2Project(report);
}

async function runFloor3Project(input: ProjectInput, phases: WorkPhase[], combinedInfo: string) {
  const s = useOfficeStore.getState();
  useOfficeStore.getState().setFloor3ProjectStatus('in_progress');

  for (const p of phases) {
    const w = s.workers.find(v => v.id === p.workerId);
    if (w) bubble(w.id, 'DA 제작 작업 시작!', 6000);
  }

  await Promise.all(phases.map(async (p) => {
    const worker = s.workers.find(v => v.id === p.workerId);
    if (!worker) return;

    useOfficeStore.getState().setWorkerState(worker.id, 'working');
    const instruction = p.task + `\n\n[상품 정보]\n${combinedInfo}`;

    const result = await callLLMStreaming(instruction, worker, (streaming) => {
      useOfficeStore.getState().updateWorkerStreaming(worker.id, streaming);
    }, 8192);

    p.status = 'completed';
    p.result = result;
    useOfficeStore.getState().setWorkerState(worker.id, 'idle');
    useOfficeStore.getState().updateWorkerStreaming(worker.id, '');
    bubble(worker.id, '작업 완료!', 4000);
  }));

  const reportLines = phases.map(p => {
    const w = s.workers.find(v => v.id === p.workerId);
    return `### ${w?.name} (${w?.title})\n${p.result}`;
  });

  const report = `# DA 제작 부서 프로젝트 결과\n\n${reportLines.join('\n\n---\n\n')}`;
  useOfficeStore.getState().completeFloor3Project(report);
}

export async function runAutonomousProject(input: ProjectInput) {
  interventionQueue = [];
  const s = useOfficeStore.getState();
  const phases = createProjectPhases(input);
  const combinedInfo = [input.spPrompt, input.daPrompt].filter(Boolean).join('\n---\n');

  if (input.floor === 2) {
    s.startFloor2Project(combinedInfo, phases, {
      templateId: input.templateId,
    });
    await runFloor2Project(input, phases, combinedInfo);
    return;
  }

  if (input.floor === 3) {
    s.startFloor3Project(combinedInfo, phases, {
      templateId: input.templateId,
    });
    await runFloor3Project(input, phases, combinedInfo);
    return;
  }

  s.startProject(combinedInfo, phases, {
    competitorData: input.competitorData ? JSON.stringify(input.competitorData) : undefined,
    abEnabled: true,
    templateId: input.templateId,
  });

  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const ceo = s.workers.find(w => w.isManager);

  if (manager) {
    msg(manager.id, manager.name, '', '전체', '상세페이지 제작 프로젝트 시작! 순서대로 진행합니다.', 'status');
    recordTimeline('message', manager.id, manager.name, '상세페이지 제작 프로젝트 시작');
  }

  if (input.competitorData?.brandName) {
    msg(manager?.id ?? '', manager?.name ?? '매니저', '', '전체', `경쟁사 "${input.competitorData.brandName}" 분석 데이터 반영합니다.`, 'status');
  }

  const mainPhases = phases
    .filter(p => !p.abVariant || p.abVariant === 'A')
    .sort((a, b) => a.order - b.order);

  for (let i = 0; i < mainPhases.length; i++) {
    const phase = mainPhases[i];
    const worker = s.workers.find(w => w.id === phase.workerId);

    if (i > 0) {
      const prevPhase = mainPhases[i - 1];
      const prevWorker = s.workers.find(w => w.id === prevPhase.workerId);
      if (prevWorker && worker) {
        useOfficeStore.getState().setWorkerAutonomousWalk(prevWorker.id, worker.id);
        useOfficeStore.getState().setWorkerState(prevWorker.id, 'discussing');
        const dialogue = generateDialogue(prevWorker.name, worker.name);
        msg(prevWorker.id, prevWorker.name, worker.id, worker.name, dialogue, 'dialogue');
        recordTimeline('walk', prevWorker.id, prevWorker.name, `→ ${worker.name}에게 이동`, worker.id);
        await delay(800);
      }
    }

    if (manager && worker) {
      msg(manager.id, manager.name, worker.id, worker.name, `${worker.name}님, [순서${phase.order}] 작업 시작해주세요!`, 'handoff');
    }

    try {
      const latestPhases = useOfficeStore.getState().project?.phases ?? phases;
      await runPhase(phase, latestPhases, input);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const fallback = `[순서${phase.order} 오류] ${worker?.name ?? '에이전트'}: ${errMsg}`;
      useOfficeStore.getState().completePhase(phase.id, fallback);
      useOfficeStore.getState().setWorkerState(worker?.id ?? '', 'idle');
      phase.status = 'completed';
      phase.result = fallback;
      msg(worker?.id ?? '', worker?.name ?? '', '', '전체', `순서${phase.order} 작업 중 오류 발생 — 다음 단계로 진행합니다.`, 'status');
    }

    try {
      const bPhase = phases.find(p => p.abVariant === 'B' && p.order === phase.order);
      if (bPhase) {
        if (manager && worker) {
          msg(manager.id, manager.name, worker.id, worker.name, `${worker.name}님, B안 작성도 시작해주세요!`, 'handoff');
        }
        const latestPhasesB = useOfficeStore.getState().project?.phases ?? phases;
        await runPhase(bPhase, latestPhasesB, input);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      msg(worker?.id ?? '', worker?.name ?? '', '', '전체', `B안 작업 중 오류: ${errMsg}`, 'status');
    }
  }

  if (manager) {
    msg(manager.id, manager.name, '', '전체', '전 단계 작업 완료! 최종 보고서를 작성합니다.', 'status');
    useOfficeStore.getState().setWorkerState(manager.id, 'working');
    bubble(manager.id, '최종 보고서 작성 중...', 15000);
    recordTimeline('phase_start', manager.id, manager.name, '최종 보고서 작성 시작');
  }

  useOfficeStore.getState().setProjectStatus('compiling');
  const finalPhases = useOfficeStore.getState().project?.phases ?? phases;
  const report = await compileReport(combinedInfo, finalPhases, input);

  useOfficeStore.getState().completeProject(report);

  try {
    const finalProject = useOfficeStore.getState().project;
    if (finalProject) {
      const nameMap: Record<string, string> = {};
      s.workers.forEach(w => { nameMap[w.id] = w.name; });
      saveProjectSnapshot(finalProject, nameMap);
      archiveCopyToSupabase(finalProject, s.workers);
    }
  } catch { /* noop */ }

  if (manager) {
    useOfficeStore.getState().setWorkerState(manager.id, 'idle');
    recordTimeline('phase_complete', manager.id, manager.name, '최종 보고서 완료');

    const jungminsu = s.workers.find(w => w.roleKey === 'daStrategy' && w.floor === 1);
    if (jungminsu) {
      msg(manager.id, manager.name, jungminsu.id, jungminsu.name,
        `${jungminsu.name}님, 보고서 작업 완료됐습니다! AI 이미지 작업이 필요하면 준비해주세요.`, 'handoff');
      useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, jungminsu.id);
      recordTimeline('walk', manager.id, manager.name, `→ ${jungminsu.name}에게 이동 (이미지 작업 요청)`, jungminsu.id);
      useOfficeStore.getState().setProjectStatus('waiting_image');
      bubble(jungminsu.id, '이미지 작업 대기 중... 클릭해서 시작하세요!', 10000);
    } else {
      msg(manager.id, manager.name, ceo?.id ?? '', ceo?.name ?? 'CEO', 'CEO님, 최종 보고서 준비 완료!', 'approval');
      useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, 'CEO');
    }
  }
}

export function completeImageWorkAndDeliver() {
  const s = useOfficeStore.getState();
  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager && w.floor === 1);
  const ceo = s.workers.find(w => w.isManager);
  const jungminsu = s.workers.find(w => w.roleKey === 'daStrategy' && w.floor === 1);

  if (!manager) return;

  if (jungminsu) {
    msg(jungminsu.id, jungminsu.name, manager.id, manager.name,
      `${manager.name}님, AI 이미지 작업 완료했습니다! 결과물 전달드립니다.`, 'dialogue');
    recordTimeline('phase_complete', jungminsu.id, jungminsu.name, 'AI 이미지 작업 완료');
  }

  useOfficeStore.getState().setWorkerState(manager.id, 'working');
  bubble(manager.id, '이미지 포함 최종 자료 취합 중...', 8000);
  recordTimeline('phase_start', manager.id, manager.name, '이미지 포함 최종 자료 취합');

  setTimeout(() => {
    useOfficeStore.getState().setWorkerState(manager.id, 'idle');
    msg(manager.id, manager.name, ceo?.id ?? '', ceo?.name ?? 'CEO',
      'CEO님, AI 이미지까지 포함된 최종 자료 준비 완료입니다!', 'approval');
    recordTimeline('phase_complete', manager.id, manager.name, '최종 자료 취합 완료 → CEO 전달');
    useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, 'CEO');
    useOfficeStore.getState().setProjectStatus('completed');
  }, 3000);
}

export async function regenerateSection(phaseId: string, sectionFeedback: string): Promise<string> {
  const s = useOfficeStore.getState();
  const phase = s.project?.phases.find(p => p.id === phaseId);
  if (!phase) return '';
  const worker = s.workers.find(w => w.id === phase.workerId);
  if (!worker) return '';

  const instruction = `[이전 결과]\n${phase.result}\n\n[부분 수정 요청]\n${sectionFeedback}\n\n요청된 부분만 수정하고 나머지는 유지하세요.`;

  s.updatePhaseStatus(phaseId, 'in_progress');
  s.setWorkerState(worker.id, 'working');

  const result = await callLLMStreaming(instruction, worker, (streaming) => {
    useOfficeStore.getState().updatePhaseStreaming(phaseId, streaming);
  }, 16384);

  useOfficeStore.getState().completePhase(phaseId, result);
  useOfficeStore.getState().setWorkerState(worker.id, 'idle');

  return result;
}

export async function analyzeCompetitor(input: CompetitorInput): Promise<string> {
  const s = useOfficeStore.getState();
  const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);

  const instruction = `당신은 경쟁사 분석 전문가입니다. 아래 경쟁사 정보를 심층 분석하세요.

[경쟁사 정보]
브랜드: ${input.brandName}
상품: ${input.productName}
${input.url ? `URL: ${input.url}` : ''}
강점: ${input.strengths}
약점: ${input.weaknesses}
${input.notes ? `메모: ${input.notes}` : ''}

분석 항목:
1. 경쟁사 포지셔닝 분석
2. 경쟁사 대비 차별화 포인트 5가지
3. 경쟁사의 마케팅 메시지 패턴
4. 활용 가능한 약점 공략 전략
5. 우리만의 USP(Unique Selling Proposition) 제안`;

  return callLLMStreaming(instruction, {
    role: mgr?.role ?? '중간관리자',
    roleKey: 'manager',
    model: mgr?.model ?? 'claude-sonnet-4-20250514',
    name: mgr?.name ?? '윤성현',
    title: '경쟁사 분석',
    provider: mgr?.provider ?? 'anthropic',
  }, undefined, 16384);
}

export async function autoOptimizeAgent(workerId: string): Promise<string> {
  const s = useOfficeStore.getState();
  const worker = s.workers.find(w => w.id === workerId);
  if (!worker) return '';

  const history = getAgentHistory(worker.roleKey, 5);
  const instruction = `에이전트 "${worker.name}" (${worker.title})의 과거 작업 히스토리를 분석하고 성격 파라미터 최적화를 제안하세요.
${history}

현재 성격 설정:
- 창의성: ${worker.personality.creativity}/100
- 상세도: ${worker.personality.detail}/100
- 톤: ${worker.personality.tone}/100 (0=포멀, 100=캐주얼)
- 공격성: ${worker.personality.aggression}/100

JSON 형식으로 제안하세요:
{
  "creativity": 숫자,
  "detail": 숫자,
  "tone": 숫자,
  "aggression": 숫자,
  "reason": "변경 이유 설명"
}`;

  return callLLMStreaming(instruction, {
    role: '중간관리자',
    roleKey: 'manager',
    model: 'claude-sonnet-4-20250514',
    name: '윤성현',
    title: '에이전트 최적화',
    provider: 'anthropic',
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
