'use client';

import { useEffect, useCallback } from 'react';
import OfficeCanvas from '@/components/OfficeCanvas';
import TaskAssignModal from '@/components/TaskAssignModal';
import ReportModal from '@/components/ReportModal';
import ManagerDashboard from '@/components/ManagerDashboard';
import AddWorkerModal from '@/components/AddWorkerModal';
import WorkerStatsModal from '@/components/WorkerStatsModal';
import ProjectInputModal from '@/components/ProjectInputModal';
import ProjectProgressPanel from '@/components/ProjectProgressPanel';
import FinalReportModal from '@/components/FinalReportModal';
import WorkerPeekCard from '@/components/WorkerPeekCard';
import { useOfficeStore } from '@/lib/store';

export default function Home() {
  const workers = useOfficeStore(s => s.workers);
  const project = useOfficeStore(s => s.project);
  const completeTask = useOfficeStore(s => s.completeTask);
  const sendWorkerToCEO = useOfficeStore(s => s.sendWorkerToCEO);
  const openProjectInput = useOfficeStore(s => s.openProjectInput);
  const openFinalReport = useOfficeStore(s => s.openFinalReport);

  const executeWorkerTask = useCallback(async (workerId: string) => {
    const worker = useOfficeStore.getState().workers.find(w => w.id === workerId);
    if (!worker || !worker.currentTask) return;

    const task = worker.currentTask;
    const lastRevision = task.revisions.length > 0 ? task.revisions[task.revisions.length - 1] : null;
    const isRevision = lastRevision && !lastRevision.result;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: task.instruction,
          role: worker.role,
          roleKey: worker.roleKey,
          model: worker.model,
          provider: worker.provider,
          previousResult: isRevision ? task.result : undefined,
          revisionFeedback: isRevision ? lastRevision.feedback : undefined,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      if (isRevision) {
        const store = useOfficeStore.getState();
        const w = store.workers.find(v => v.id === workerId);
        if (w?.currentTask) {
          const revisions = [...w.currentTask.revisions];
          revisions[revisions.length - 1] = { ...revisions[revisions.length - 1], result, completedAt: Date.now() };
          store.updateWorker(workerId, {
            currentTask: { ...w.currentTask, result, revisions, status: 'completed', completedAt: Date.now() },
          });
        }
      }

      completeTask(workerId, result);
      await new Promise(r => setTimeout(r, 1500));
      sendWorkerToCEO(workerId);
    } catch {
      const fallbackResult = `[데모 모드] API 키가 설정되지 않았거나 오류가 발생했습니다.\n\n업무 내용: "${task.instruction}"\n\n---\n예시 결과:\n${worker.role}로서 요청하신 업무를 완료했습니다.`;
      completeTask(workerId, fallbackResult);
      await new Promise(r => setTimeout(r, 1500));
      sendWorkerToCEO(workerId);
    }
  }, [completeTask, sendWorkerToCEO]);

  useEffect(() => {
    const unsub = useOfficeStore.subscribe((state, prev) => {
      for (const worker of state.workers) {
        const prevWorker = prev.workers.find(w => w.id === worker.id);
        if (prevWorker?.state !== 'working' && worker.state === 'working' && worker.currentTask) {
          executeWorkerTask(worker.id);
        }
      }
    });
    return unsub;
  }, [executeWorkerTask]);

  const waitingCount = workers.filter(w => w.state === 'waitingAtCEO').length;
  const isProjectRunning = project && project.status !== 'idle' && project.status !== 'completed';
  const isProjectDone = project?.status === 'completed';

  return (
    <main className="h-screen flex flex-col bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-sm tracking-wide">VIRTUAL OFFICE</h1>
          <span className="text-gray-600 text-xs">AI Agent Simulation</span>
        </div>
        <div className="flex items-center gap-3">
          {isProjectRunning && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full animate-pulse font-medium">
              ⚡ 에이전트 자율 협업 중
            </span>
          )}
          {isProjectDone && (
            <button onClick={openFinalReport}
              className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-medium hover:bg-green-500/30 transition-colors">
              ✅ 보고서 완성 — 클릭하여 확인
            </button>
          )}
          {waitingCount > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full animate-pulse">
              보고 대기: {waitingCount}명
            </span>
          )}
          {!isProjectRunning && (
            <button onClick={openProjectInput}
              className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-full font-bold hover:from-blue-500 hover:to-purple-500 transition-all">
              🚀 프로젝트 시작
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <OfficeCanvas />
      </div>

      <ProjectProgressPanel />

      <TaskAssignModal />
      <ReportModal />
      <ManagerDashboard />
      <AddWorkerModal />
      <WorkerStatsModal />
      <ProjectInputModal />
      <FinalReportModal />
      <WorkerPeekCard />
    </main>
  );
}
