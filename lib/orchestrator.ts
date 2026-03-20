import { useOfficeStore } from './store';
import { RoleKey, WorkPhase, AgentMessage, PhaseStatus } from './types';
import { saveProjectSnapshot, getAgentHistory } from './storage';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const SP_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string; wave: number }[] = [
  { roleKey: 'spPlanner', order: 0, wave: 1, taskTemplate: '상세페이지 전체 구성을 기획해주세요. 섹션별 목적, 핵심 메시지, 레이아웃 가이드를 포함하세요.' },
  { roleKey: 'spCopy',    order: 1, wave: 2, taskTemplate: '기획안을 기반으로 전체 상세페이지 카피 + 후킹 문구를 작성해주세요. 헤드라인, 서브헤드, 본문, CTA, 그리고 스크롤을 멈추게 하는 후킹 문구 5개 이상을 포함하세요.' },
  { roleKey: 'spImage',   order: 2, wave: 2, taskTemplate: '기획안을 기반으로 상세페이지에 필요한 제품 이미지를 기획해주세요. 이미지 유형별 컨셉, 구도, 색감 방향, Gemini 3 Pro용 이미지 생성 프롬프트(영어)를 포함하세요.' },
  { roleKey: 'spCRO',     order: 3, wave: 2, taskTemplate: '기획안을 기반으로 전환율 최적화 관점에서 구조 피드백과 CTA 개선안을 제시해주세요.' },
];

const DA_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string; wave: number }[] = [
  { roleKey: 'daStrategy', order: 0, wave: 1, taskTemplate: 'DA 캠페인 전략을 수립해주세요. 매체 선정, 타겟팅, 예산 배분, 퍼널 구조를 포함하세요.' },
  { roleKey: 'daCopy',     order: 1, wave: 2, taskTemplate: '캠페인 전략을 기반으로 매체별 광고 카피를 작성해주세요. 헤드라인, 본문, CTA를 포함하세요.' },
  { roleKey: 'daCreative', order: 2, wave: 2, taskTemplate: '전략을 기반으로 광고 소재 디자인 기획서를 작성해주세요. 레이아웃, 색상, 이미지 방향을 포함하세요.' },
  { roleKey: 'daAnalysis', order: 3, wave: 2, taskTemplate: '전략을 기반으로 성과 예측 프레임워크 및 KPI 대시보드를 설계해주세요.' },
];

export type TeamSelection = 'both' | 'sp' | 'da';

export interface ProjectInput {
  teams: TeamSelection;
  spPrompt: string;
  daPrompt: string;
}

export function createProjectPhases(input: ProjectInput): WorkPhase[] {
  const workers = useOfficeStore.getState().workers;
  const phases: WorkPhase[] = [];
  const wave1Ids: Record<string, string> = {};

  const workflows: { wf: typeof SP_WORKFLOW[number]; team: 'sp' | 'da'; prompt: string }[] = [];

  if (input.teams === 'both' || input.teams === 'sp') {
    for (const wf of SP_WORKFLOW) workflows.push({ wf, team: 'sp', prompt: input.spPrompt });
  }
  if (input.teams === 'both' || input.teams === 'da') {
    for (const wf of DA_WORKFLOW) workflows.push({ wf, team: 'da', prompt: input.daPrompt });
  }

  for (const { wf, team, prompt } of workflows) {
    const worker = workers.find(w => w.roleKey === wf.roleKey);
    if (!worker) continue;

    const phaseId = uid();
    const leadId = wave1Ids[team];
    const deps = wf.wave === 2 && leadId ? [leadId] : [];
    if (wf.wave === 1) wave1Ids[team] = phaseId;

    phases.push({
      id: phaseId,
      roleKey: wf.roleKey,
      workerId: worker.id,
      task: `[상품/서비스 정보]\n${prompt}\n\n[업무 지시]\n${wf.taskTemplate}`,
      status: 'pending',
      result: '',
      dependsOn: deps,
      order: wf.order,
      team,
    });
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

function getLeadResult(phases: WorkPhase[], phase: WorkPhase): string {
  const deps = phases.filter(p => phase.dependsOn.includes(p.id) && p.status === 'completed');
  if (deps.length === 0) return '';
  return '\n\n[팀 리더 기획 결과]\n' + deps.map(d => {
    const w = useOfficeStore.getState().workers.find(v => v.id === d.workerId);
    return `--- ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${d.result}`;
  }).join('\n\n');
}

async function callLLM(instruction: string, worker: { role: string; roleKey: string; model: string; name: string; title: string; provider?: string }): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction, role: worker.role, roleKey: worker.roleKey, model: worker.model, provider: worker.provider }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No body');
    const dec = new TextDecoder();
    let out = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
    }
    return out;
  } catch {
    return `[데모 모드] ${worker.name}(${worker.title}) 작업 결과\n\n상품 분석에 기반한 전문 결과물이 여기에 표시됩니다.\n(API 키 설정 시 Claude Opus 4.6 결과가 생성됩니다)`;
  }
}

async function runPhase(phase: WorkPhase, allPhases: WorkPhase[]) {
  const s = useOfficeStore.getState();
  const worker = s.workers.find(w => w.id === phase.workerId);
  if (!worker) return;

  s.updatePhaseStatus(phase.id, 'in_progress');
  s.setWorkerState(worker.id, 'working');
  bubble(worker.id, `${worker.title} 작업 시작!`, 6000);

  const context = getLeadResult(allPhases, phase);
  const history = getAgentHistory(phase.roleKey);
  const result = await callLLM(phase.task + context + history, worker);

  useOfficeStore.getState().completePhase(phase.id, result);
  useOfficeStore.getState().setWorkerState(worker.id, 'idle');
  phase.status = 'completed';
  phase.result = result;

  msg(worker.id, worker.name, '', '전체', `${worker.title} 완료!`, 'status');
}

async function compileReport(productInfo: string, phases: WorkPhase[]): Promise<string> {
  const s = useOfficeStore.getState();
  const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);

  const body = phases.map(p => {
    const w = s.workers.find(v => v.id === p.workerId);
    return `## ${w?.name} (${w?.title})\n${p.result}`;
  }).join('\n\n---\n\n');

  const managerHistory = getAgentHistory('manager');
  const instruction = `당신은 중간관리자입니다. 팀원들의 작업 결과를 종합하여 CEO 보고용 최종 보고서를 작성하세요.\n\n[상품 정보]\n${productInfo}\n\n[팀원 작업 결과]\n${body}\n\n보고서 구성:\n1. 핵심 요약 (Executive Summary)\n2. 상세페이지 팀 종합\n3. DA 팀 종합\n4. 크로스 팀 시너지 전략\n5. 최종 제언 및 액션 아이템${managerHistory}`;

  return callLLM(instruction, {
    role: mgr?.role ?? '중간관리자',
    roleKey: 'manager',
    model: mgr?.model ?? 'claude-opus-4-6',
    name: mgr?.name ?? '윤성현',
    title: mgr?.title ?? '중간관리자',
    provider: mgr?.provider ?? 'anthropic',
  });
}

export async function runAutonomousProject(input: ProjectInput) {
  const s = useOfficeStore.getState();
  const phases = createProjectPhases(input);
  const combinedInfo = [input.spPrompt, input.daPrompt].filter(Boolean).join('\n---\n');
  s.startProject(combinedInfo, phases);

  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const ceo = s.workers.find(w => w.isManager);

  const teamLabel = input.teams === 'sp' ? '상세페이지 팀' : input.teams === 'da' ? 'DA 팀' : '전체 팀';
  if (manager) {
    msg(manager.id, manager.name, '', '전체', `${teamLabel} 프로젝트 시작! 리더부터 기획합니다.`, 'status');
  }

  const wave1 = phases.filter(p => p.dependsOn.length === 0);
  for (const p of wave1) {
    const w = s.workers.find(v => v.id === p.workerId);
    if (w) msg(manager?.id ?? '', manager?.name ?? '', w.id, w.name, `${w.name}님, 기획부터 시작해주세요!`, 'handoff');
  }

  await Promise.all(wave1.map(p => runPhase(p, phases)));

  // === WAVE 2: 나머지 6명 동시 (각자 리더 결과를 컨텍스트로) ===
  const wave2 = phases.filter(p => p.dependsOn.length > 0);

  if (manager) {
    msg(manager.id, manager.name, '', '전체', '기획 완료! 전원 동시 작업 시작합니다.', 'status');
  }

  const updatedPhases = useOfficeStore.getState().project?.phases ?? phases;
  for (const p of wave2) {
    const dep = updatedPhases.find(d => d.id === p.dependsOn[0]);
    if (dep) {
      p.result = '';
      const fromW = s.workers.find(v => v.id === dep.workerId);
      const toW = s.workers.find(v => v.id === p.workerId);
      if (fromW && toW) {
        useOfficeStore.getState().setWorkerAutonomousWalk(fromW.id, toW.id);
        msg(fromW.id, fromW.name, toW.id, toW.name, `${toW.name}님, 기획 결과 전달합니다!`, 'handoff');
      }
    }
  }

  await delay(800);
  await Promise.all(wave2.map(p => {
    const latest = useOfficeStore.getState().project?.phases ?? phases;
    return runPhase(p, latest);
  }));

  // === WAVE 3: 매니저 최종 보고서 ===
  if (manager) {
    msg(manager.id, manager.name, '', '전체', '전원 작업 완료! 최종 보고서를 작성합니다.', 'status');
    useOfficeStore.getState().setWorkerState(manager.id, 'working');
    bubble(manager.id, '최종 보고서 작성 중...', 15000);
  }

  useOfficeStore.getState().setProjectStatus('compiling');
  const finalPhases = useOfficeStore.getState().project?.phases ?? phases;
  const report = await compileReport(combinedInfo, finalPhases);

  useOfficeStore.getState().completeProject(report);

  // 히스토리 저장
  try {
    const finalProject = useOfficeStore.getState().project;
    if (finalProject) {
      const nameMap: Record<string, string> = {};
      s.workers.forEach(w => { nameMap[w.id] = w.name; });
      saveProjectSnapshot(finalProject, nameMap);
    }
  } catch { /* noop */ }

  if (manager) {
    useOfficeStore.getState().setWorkerState(manager.id, 'idle');
    msg(manager.id, manager.name, ceo?.id ?? '', ceo?.name ?? 'CEO', 'CEO님, 최종 보고서 준비 완료!', 'approval');
    useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, 'CEO');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
