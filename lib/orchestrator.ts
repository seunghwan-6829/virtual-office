import { useOfficeStore } from './store';
import { RoleKey, WorkPhase, AgentMessage, AgentPersonality, CompetitorInput, Worker, Project } from './types';
import { saveProjectSnapshot, getAgentHistory } from './storage';
import { createClient } from './supabase/client';

async function archiveCopyToSupabase(project: Project, workers: Worker[]) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const spPhases = project.phases.filter(p => p.team === 'sp' && p.status === 'completed' && p.result);
    for (const sp of spPhases) {
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
  abEnabled?: boolean;
  competitorData?: CompetitorInput;
  templateId?: string;
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

    if (input.abEnabled) {
      phases[phases.length - 1].abVariant = 'A';
      phases.push({
        id: uid(),
        roleKey: wf.roleKey,
        workerId: worker.id,
        task: `[상품/서비스 정보]\n${prompt}\n\n[업무 지시]\n${wf.taskTemplate}\n\n[A/B 테스트 지시] 이것은 B안입니다. A안과는 완전히 다른 관점, 톤, 구조로 작성하세요. 동일한 목표를 달성하되 접근 방식을 근본적으로 다르게 하세요.`,
        status: 'pending',
        result: '',
        dependsOn: deps,
        order: wf.order,
        team,
        abVariant: 'B',
      });
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

function getLeadResult(phases: WorkPhase[], phase: WorkPhase): string {
  const deps = phases.filter(p => phase.dependsOn.includes(p.id) && p.status === 'completed' && !p.abVariant);
  if (deps.length === 0) {
    const anyDeps = phases.filter(p => phase.dependsOn.includes(p.id) && p.status === 'completed');
    if (anyDeps.length === 0) return '';
    const d = anyDeps[0];
    const w = useOfficeStore.getState().workers.find(v => v.id === d.workerId);
    return `\n\n[팀 리더 기획 결과]\n--- ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${d.result}`;
  }
  return '\n\n[팀 리더 기획 결과]\n' + deps.map(d => {
    const w = useOfficeStore.getState().workers.find(v => v.id === d.workerId);
    return `--- ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${d.result}`;
  }).join('\n\n');
}

async function callLLMStreaming(
  instruction: string,
  worker: { role: string; roleKey: string; model: string; name: string; title: string; provider?: string },
  onChunk?: (text: string) => void,
): Promise<string> {
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
      const chunk = dec.decode(value, { stream: true });
      out += chunk;
      onChunk?.(out);
    }
    return out;
  } catch {
    return `[데모 모드] ${worker.name}(${worker.title}) 작업 결과\n\n상품 분석에 기반한 전문 결과물이 여기에 표시됩니다.\n(API 키 설정 시 Claude Opus 4.6 결과가 생성됩니다)`;
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
  bubble(worker.id, `${worker.title}${variantLabel} 작업 시작!`, 6000);
  recordTimeline('phase_start', worker.id, worker.name, `${worker.title}${variantLabel} 작업 시작`);

  const context = getLeadResult(allPhases, phase);
  const history = getAgentHistory(phase.roleKey);
  const personalityPrompt = personalityToPrompt(worker.personality);
  const competitorContext = competitorToPrompt(input.competitorData);

  const fullInstruction = phase.task + context + history + personalityPrompt + competitorContext;

  const result = await callLLMStreaming(fullInstruction, worker, (streaming) => {
    useOfficeStore.getState().updatePhaseStreaming(phase.id, streaming);
    useOfficeStore.getState().updateWorkerStreaming(worker.id, streaming);
  });

  useOfficeStore.getState().completePhase(phase.id, result);
  useOfficeStore.getState().setWorkerState(worker.id, 'idle');
  useOfficeStore.getState().updateWorkerStreaming(worker.id, '');
  phase.status = 'completed';
  phase.result = result;

  recordTimeline('phase_complete', worker.id, worker.name, `${worker.title}${variantLabel} 완료`);
  msg(worker.id, worker.name, '', '전체', `${worker.title}${variantLabel} 완료!`, 'status');

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
    });

    useOfficeStore.getState().completePhase(phase.id, revised);
    useOfficeStore.getState().setWorkerState(worker.id, 'idle');
    phase.result = revised;
    msg(worker.id, worker.name, 'user', 'CEO', '수정 완료!', 'status');
  }
}

function generateDialogue(fromName: string, toName: string, context: string): string {
  const dialogues = [
    `${toName}님, 제 기획 결과 전달합니다. 핵심 포인트 확인해주세요!`,
    `${toName}님, 이번 건 좀 특별하게 가봅시다. 컨셉 잡아놨어요!`,
    `${toName}님, 분석 끝났어요. 이 방향으로 진행해주세요!`,
    `${toName}님, 데이터 기반으로 전략 세웠어요. 리뷰 부탁드려요!`,
  ];
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

async function compileReport(productInfo: string, phases: WorkPhase[], input: ProjectInput): Promise<string> {
  const s = useOfficeStore.getState();
  const mgr = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);

  const mainPhases = phases.filter(p => !p.abVariant || p.abVariant === 'A');
  const body = mainPhases.map(p => {
    const w = s.workers.find(v => v.id === p.workerId);
    return `## ${w?.name} (${w?.title})\n${p.result}`;
  }).join('\n\n---\n\n');

  const managerHistory = getAgentHistory('manager');
  const competitorCtx = competitorToPrompt(input.competitorData);

  let abSection = '';
  if (input.abEnabled) {
    const bPhases = phases.filter(p => p.abVariant === 'B');
    if (bPhases.length > 0) {
      abSection = '\n\n[A/B 테스트 B안 결과]\n' + bPhases.map(p => {
        const w = s.workers.find(v => v.id === p.workerId);
        return `## ${w?.name} B안\n${p.result.slice(0, 500)}`;
      }).join('\n\n');
    }
  }

  const instruction = `당신은 중간관리자입니다. 팀원들의 작업 결과를 종합하여 CEO 보고용 최종 보고서를 작성하세요.\n\n[상품 정보]\n${productInfo}\n\n[팀원 작업 결과]\n${body}${abSection}${competitorCtx}\n\n보고서 구성:\n1. 핵심 요약 (Executive Summary)\n2. 상세페이지 팀 종합\n3. DA 팀 종합\n4. 크로스 팀 시너지 전략\n5. 최종 제언 및 액션 아이템${managerHistory}`;

  return callLLMStreaming(instruction, {
    role: mgr?.role ?? '중간관리자',
    roleKey: 'manager',
    model: mgr?.model ?? 'claude-opus-4-6',
    name: mgr?.name ?? '윤성현',
    title: mgr?.title ?? '중간관리자',
    provider: mgr?.provider ?? 'anthropic',
  });
}

export async function runAutonomousProject(input: ProjectInput) {
  interventionQueue = [];
  const s = useOfficeStore.getState();
  const phases = createProjectPhases(input);
  const combinedInfo = [input.spPrompt, input.daPrompt].filter(Boolean).join('\n---\n');
  s.startProject(combinedInfo, phases, {
    competitorData: input.competitorData ? JSON.stringify(input.competitorData) : undefined,
    abEnabled: input.abEnabled,
    templateId: input.templateId,
  });

  const manager = s.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const ceo = s.workers.find(w => w.isManager);

  const teamLabel = input.teams === 'sp' ? '상세페이지 팀' : input.teams === 'da' ? 'DA 팀' : '전체 팀';
  if (manager) {
    msg(manager.id, manager.name, '', '전체', `${teamLabel} 프로젝트 시작! 리더부터 기획합니다.`, 'status');
    recordTimeline('message', manager.id, manager.name, `${teamLabel} 프로젝트 시작`);
  }

  if (input.competitorData?.brandName) {
    msg(manager?.id ?? '', manager?.name ?? '매니저', '', '전체', `경쟁사 "${input.competitorData.brandName}" 분석 데이터 반영합니다.`, 'status');
  }

  const wave1 = phases.filter(p => p.dependsOn.length === 0 && (!p.abVariant || p.abVariant === 'A'));
  for (const p of wave1) {
    const w = s.workers.find(v => v.id === p.workerId);
    if (w) msg(manager?.id ?? '', manager?.name ?? '', w.id, w.name, `${w.name}님, 기획부터 시작해주세요!`, 'handoff');
  }

  await Promise.all(wave1.map(p => runPhase(p, phases, input)));

  const wave1B = phases.filter(p => p.dependsOn.length === 0 && p.abVariant === 'B');
  if (wave1B.length > 0) {
    await Promise.all(wave1B.map(p => runPhase(p, phases, input)));
  }

  const wave2A = phases.filter(p => p.dependsOn.length > 0 && (!p.abVariant || p.abVariant === 'A'));

  if (manager) {
    msg(manager.id, manager.name, '', '전체', '기획 완료! 전원 동시 작업 시작합니다.', 'status');
  }

  const updatedPhases = useOfficeStore.getState().project?.phases ?? phases;
  for (const p of wave2A) {
    const dep = updatedPhases.find(d => d.id === p.dependsOn[0]);
    if (dep) {
      const fromW = s.workers.find(v => v.id === dep.workerId);
      const toW = s.workers.find(v => v.id === p.workerId);
      if (fromW && toW) {
        useOfficeStore.getState().setWorkerAutonomousWalk(fromW.id, toW.id);
        useOfficeStore.getState().setWorkerState(fromW.id, 'discussing');
        const dialogue = generateDialogue(fromW.name, toW.name, '');
        msg(fromW.id, fromW.name, toW.id, toW.name, dialogue, 'dialogue');
        recordTimeline('walk', fromW.id, fromW.name, `→ ${toW.name}에게 이동`, toW.id);
      }
    }
  }

  await delay(800);
  await Promise.all(wave2A.map(p => {
    const latest = useOfficeStore.getState().project?.phases ?? phases;
    return runPhase(p, latest, input);
  }));

  const wave2B = phases.filter(p => p.dependsOn.length > 0 && p.abVariant === 'B');
  if (wave2B.length > 0) {
    await Promise.all(wave2B.map(p => {
      const latest = useOfficeStore.getState().project?.phases ?? phases;
      return runPhase(p, latest, input);
    }));
  }

  if (manager) {
    msg(manager.id, manager.name, '', '전체', '전원 작업 완료! 최종 보고서를 작성합니다.', 'status');
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

      const spPhases = finalProject.phases.filter(p => p.team === 'sp' && p.status === 'completed' && p.result);
      for (const sp of spPhases) {
        const w = s.workers.find(v => v.id === sp.workerId);
        useOfficeStore.getState().addCopyArchiveItem({
          title: `[${w?.name ?? sp.roleKey}] ${finalProject.productInfo.slice(0, 50)}`,
          content: sp.result,
          source: 'project',
          projectId: finalProject.id,
          roleKey: sp.roleKey,
          workerName: w?.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      archiveCopyToSupabase(finalProject, s.workers);
    }
  } catch { /* noop */ }

  if (manager) {
    useOfficeStore.getState().setWorkerState(manager.id, 'idle');
    msg(manager.id, manager.name, ceo?.id ?? '', ceo?.name ?? 'CEO', 'CEO님, 최종 보고서 준비 완료!', 'approval');
    recordTimeline('phase_complete', manager.id, manager.name, '최종 보고서 완료');
    useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, 'CEO');
  }
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
  });

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
    model: mgr?.model ?? 'claude-opus-4-6',
    name: mgr?.name ?? '윤성현',
    title: '경쟁사 분석',
    provider: mgr?.provider ?? 'anthropic',
  });
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
    model: 'claude-opus-4-6',
    name: '윤성현',
    title: '에이전트 최적화',
    provider: 'anthropic',
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
