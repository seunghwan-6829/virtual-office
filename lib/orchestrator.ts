import { useOfficeStore } from './store';
import { RoleKey, WorkPhase, AgentMessage, PhaseStatus } from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const SP_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string }[] = [
  { roleKey: 'spPlanner', order: 0, taskTemplate: '상세페이지 전체 구성을 기획해주세요. 섹션별 목적, 핵심 메시지, 레이아웃 가이드를 포함하세요.' },
  { roleKey: 'spHook', order: 1, taskTemplate: '기획안을 기반으로 강력한 후킹 문구 5개 이상과 상단 오프닝 전략을 작성해주세요.' },
  { roleKey: 'spCopy', order: 2, taskTemplate: '기획안과 후킹 전략을 기반으로 전체 상세페이지 카피를 작성해주세요. 헤드라인, 서브헤드, 본문, CTA를 포함하세요.' },
  { roleKey: 'spCRO', order: 3, taskTemplate: '기획안, 후킹, 카피를 종합 검토하고 전환율 최적화 관점에서 피드백과 최종 개선안을 제시해주세요.' },
];

const DA_WORKFLOW: { roleKey: RoleKey; order: number; taskTemplate: string }[] = [
  { roleKey: 'daStrategy', order: 0, taskTemplate: 'DA 캠페인 전략을 수립해주세요. 매체 선정, 타겟팅, 예산 배분, 퍼널 구조를 포함하세요.' },
  { roleKey: 'daCopy', order: 1, taskTemplate: '캠페인 전략을 기반으로 매체별 광고 카피를 작성해주세요. 헤드라인, 본문, CTA를 포함하세요.' },
  { roleKey: 'daCreative', order: 2, taskTemplate: '전략과 카피를 기반으로 광고 소재 디자인 기획서를 작성해주세요. 레이아웃, 색상, 이미지 방향을 포함하세요.' },
  { roleKey: 'daAnalysis', order: 3, taskTemplate: '전략, 카피, 소재를 종합 검토하고 성과 예측 및 KPI 대시보드 설계를 해주세요.' },
];

export function createProjectPhases(productInfo: string): WorkPhase[] {
  const store = useOfficeStore.getState();
  const workers = store.workers;
  const phases: WorkPhase[] = [];

  for (const wf of SP_WORKFLOW) {
    const worker = workers.find(w => w.roleKey === wf.roleKey);
    if (!worker) continue;
    const prevPhases = phases.filter(p => p.team === 'sp').map(p => p.id);
    phases.push({
      id: uid(),
      roleKey: wf.roleKey,
      workerId: worker.id,
      task: `[상품 정보]\n${productInfo}\n\n[업무 지시]\n${wf.taskTemplate}`,
      status: wf.order === 0 ? 'pending' : 'pending',
      result: '',
      dependsOn: prevPhases.length > 0 ? [prevPhases[prevPhases.length - 1]] : [],
      order: wf.order,
      team: 'sp',
    });
  }

  for (const wf of DA_WORKFLOW) {
    const worker = workers.find(w => w.roleKey === wf.roleKey);
    if (!worker) continue;
    const prevPhases = phases.filter(p => p.team === 'da').map(p => p.id);
    phases.push({
      id: uid(),
      roleKey: wf.roleKey,
      workerId: worker.id,
      task: `[상품 정보]\n${productInfo}\n\n[업무 지시]\n${wf.taskTemplate}`,
      status: wf.order === 0 ? 'pending' : 'pending',
      result: '',
      dependsOn: prevPhases.length > 0 ? [prevPhases[prevPhases.length - 1]] : [],
      order: wf.order,
      team: 'da',
    });
  }

  return phases;
}

function addMessage(fromId: string, fromName: string, toId: string, toName: string, message: string, type: AgentMessage['type']) {
  const store = useOfficeStore.getState();
  const msg: AgentMessage = { id: uid(), fromId, fromName, toId, toName, message, type, timestamp: Date.now() };
  store.addProjectMessage(msg);
  store.setSpeechBubble(fromId, message, 4000);
}

function getPhaseContext(phases: WorkPhase[], phase: WorkPhase): string {
  const deps = phases.filter(p => phase.dependsOn.includes(p.id) && p.status === 'completed');
  if (deps.length === 0) return '';
  return '\n\n[이전 동료의 작업 결과]\n' + deps.map(d => {
    const store = useOfficeStore.getState();
    const w = store.workers.find(v => v.id === d.workerId);
    return `--- ${w?.name ?? '동료'} (${w?.title ?? ''}) ---\n${d.result}`;
  }).join('\n\n');
}

async function executePhase(phase: WorkPhase): Promise<string> {
  const store = useOfficeStore.getState();
  const worker = store.workers.find(w => w.id === phase.workerId);
  if (!worker) return '[에러: 작업자를 찾을 수 없음]';

  const allPhases = store.project?.phases ?? [];
  const context = getPhaseContext(allPhases, phase);
  const fullInstruction = phase.task + context;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: fullInstruction,
        role: worker.role,
        roleKey: worker.roleKey,
        model: worker.model,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');

    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    return result;
  } catch {
    return `[데모 모드] ${worker.name}의 ${worker.title} 작업 결과입니다.\n\n상세페이지/DA 관련 전문적인 결과물이 여기에 표시됩니다.\n(API 키가 설정되면 실제 Claude Opus 결과가 생성됩니다)`;
  }
}

function findNextPhases(phases: WorkPhase[]): WorkPhase[] {
  return phases.filter(p => {
    if (p.status !== 'pending') return false;
    return p.dependsOn.every(depId => {
      const dep = phases.find(d => d.id === depId);
      return dep?.status === 'completed';
    });
  });
}

async function compileReport(productInfo: string, phases: WorkPhase[]): Promise<string> {
  const store = useOfficeStore.getState();
  const manager = store.workers.find(w => w.roleKey === 'manager' && !w.isManager);

  const allResults = phases.map(p => {
    const w = store.workers.find(v => v.id === p.workerId);
    return `## ${w?.name} (${w?.title})\n${p.result}`;
  }).join('\n\n---\n\n');

  const instruction = `당신은 중간관리자입니다. 아래는 팀원들이 작업한 결과물입니다.\n\n[상품 정보]\n${productInfo}\n\n[팀원 작업 결과]\n${allResults}\n\n위 결과를 종합하여 CEO에게 보고할 최종 보고서를 작성해주세요.\n1. 상세페이지 팀 종합 결과\n2. DA 팀 종합 결과\n3. 두 팀 간 시너지 및 통합 전략\n4. 최종 제언`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction,
        role: manager?.role ?? '중간관리자',
        roleKey: 'manager',
        model: manager?.model ?? 'claude-opus-4-6',
      }),
    });
    if (!response.ok) throw new Error('API error');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    return result;
  } catch {
    return `# 최종 보고서\n\n## 상세페이지 팀\n${phases.filter(p => p.team === 'sp').map(p => `- ${p.roleKey}: 완료`).join('\n')}\n\n## DA 팀\n${phases.filter(p => p.team === 'da').map(p => `- ${p.roleKey}: 완료`).join('\n')}\n\n(API 키 설정 시 상세 보고서가 생성됩니다)`;
  }
}

export async function runAutonomousProject(productInfo: string) {
  const store = useOfficeStore.getState();
  const phases = createProjectPhases(productInfo);

  store.startProject(productInfo, phases);

  const manager = store.workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const ceo = store.workers.find(w => w.isManager);

  if (manager) {
    addMessage(manager.id, manager.name, '', '전체', '프로젝트를 시작합니다. 업무를 배분하겠습니다.', 'status');
  }

  await delay(2000);

  let currentPhases = [...phases];
  let safety = 0;

  while (safety++ < 20) {
    const nextBatch = findNextPhases(currentPhases);
    if (nextBatch.length === 0) break;

    const promises = nextBatch.map(async (phase) => {
      const worker = store.workers.find(w => w.id === phase.workerId);
      if (!worker) return;

      const prevPhase = currentPhases.find(p => p.id === phase.dependsOn[0]);
      const prevWorker = prevPhase ? store.workers.find(w => w.id === prevPhase.workerId) : null;

      if (prevWorker && worker) {
        addMessage(prevWorker.id, prevWorker.name, worker.id, worker.name,
          `${worker.name}님, 제 작업 결과 전달드립니다.`, 'handoff');
        useOfficeStore.getState().setWorkerAutonomousWalk(prevWorker.id, worker.id);
        await delay(3000);
        addMessage(worker.id, worker.name, prevWorker.id, prevWorker.name,
          '네, 확인하겠습니다!', 'approval');
        await delay(1500);
      }

      useOfficeStore.getState().updatePhaseStatus(phase.id, 'in_progress');
      useOfficeStore.getState().setWorkerState(worker.id, 'working');

      if (worker) {
        store.setSpeechBubble(worker.id, `${worker.title} 작업 중...`, 8000);
      }

      const result = await executePhase(phase);

      useOfficeStore.getState().completePhase(phase.id, result);
      useOfficeStore.getState().setWorkerState(worker.id, 'idle');

      if (worker) {
        addMessage(worker.id, worker.name, '', '전체', `${worker.title} 작업 완료!`, 'status');
      }

      phase.status = 'completed';
      phase.result = result;
    });

    await Promise.all(promises);
    currentPhases = useOfficeStore.getState().project?.phases ?? currentPhases;
    await delay(1500);
  }

  if (manager) {
    addMessage(manager.id, manager.name, '', '전체', '모든 팀 작업이 완료되었습니다. 최종 보고서를 작성합니다.', 'status');
    useOfficeStore.getState().setWorkerState(manager.id, 'working');
    store.setSpeechBubble(manager.id, '최종 보고서 작성 중...', 10000);
  }

  useOfficeStore.getState().setProjectStatus('compiling');
  const finalPhases = useOfficeStore.getState().project?.phases ?? phases;
  const report = await compileReport(productInfo, finalPhases);

  useOfficeStore.getState().completeProject(report);
  if (manager) {
    useOfficeStore.getState().setWorkerState(manager.id, 'idle');
    addMessage(manager.id, manager.name, ceo?.id ?? '', ceo?.name ?? 'CEO',
      'CEO님, 최종 보고서가 준비되었습니다!', 'approval');

    useOfficeStore.getState().setWorkerAutonomousWalk(manager.id, 'CEO');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
