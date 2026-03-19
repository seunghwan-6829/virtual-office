'use client';

import { useEffect, useCallback } from 'react';
import OfficeCanvas from '@/components/OfficeCanvas';
import TaskAssignModal from '@/components/TaskAssignModal';
import ReportModal from '@/components/ReportModal';
import ManagerDashboard from '@/components/ManagerDashboard';
import WorkerStatusBar from '@/components/WorkerStatusBar';
import AddWorkerModal from '@/components/AddWorkerModal';
import WorkerStatsModal from '@/components/WorkerStatsModal';
import { useOfficeStore } from '@/lib/store';

export default function Home() {
  const workers = useOfficeStore(s => s.workers);
  const completeTask = useOfficeStore(s => s.completeTask);
  const sendWorkerToCEO = useOfficeStore(s => s.sendWorkerToCEO);

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
      const fallbackResult = `[데모 모드] API 키가 설정되지 않았거나 오류가 발생했습니다.\n\n업무 내용: "${task.instruction}"\n\n---\n예시 결과:\n${worker.role}로서 요청하신 업무를 완료했습니다.\n\n1. 핵심 분석 결과\n2. 세부 내용 정리\n3. 추가 제안 사항`;

      completeTask(workerId, fallbackResult);
      await new Promise(r => setTimeout(r, 1500));
      sendWorkerToCEO(workerId);
    }
  }, [completeTask, sendWorkerToCEO]);

  useEffect(() => {
    const unsub = useOfficeStore.subscribe((state, prev) => {
      for (const worker of state.workers) {
        const prevWorker = prev.workers.find(w => w.id === worker.id);
        if (prevWorker?.state !== 'working' && worker.state === 'working') {
          executeWorkerTask(worker.id);
        }
      }
    });
    return unsub;
  }, [executeWorkerTask]);

  const waitingCount = workers.filter(w => w.state === 'waitingAtCEO').length;

  return (
    <main className="h-screen flex flex-col bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-sm tracking-wide">VIRTUAL OFFICE</h1>
          <span className="text-gray-600 text-xs">AI Agent Simulation</span>
        </div>
        <div className="flex items-center gap-3">
          {waitingCount > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full animate-pulse">
              보고 대기: {waitingCount}명
            </span>
          )}
          <span className="text-gray-500 text-xs">직원을 클릭하여 업무를 지시하세요</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <OfficeCanvas />
      </div>

      <WorkerStatusBar />

      <TaskAssignModal />
      <ReportModal />
      <ManagerDashboard />
      <AddWorkerModal />
      <WorkerStatsModal />
    </main>
  );
}
