'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import AgentChatPanel from '@/components/AgentChatPanel';
import LiveStreamPanel from '@/components/LiveStreamPanel';
import PersonalityModal from '@/components/PersonalityModal';
import TemplateSelector from '@/components/TemplateSelector';
import ABCompareView from '@/components/ABCompareView';
import ResultEditor from '@/components/ResultEditor';
import CompetitorModal, { CompetitorResultNotification } from '@/components/CompetitorModal';
import TimelineReplay from '@/components/TimelineReplay';
import CopyArchivePanel from '@/components/CopyArchivePanel';
import DataStoragePanel from '@/components/DataStoragePanel';
import AdminPanel from '@/components/AdminPanel';
import { useOfficeStore } from '@/lib/store';
import { ProjectTemplate, CompetitorInput } from '@/lib/types';
import { loadProjectHistory, initStorageFromSupabase } from '@/lib/storage';
import { startOfficeLife, stopOfficeLife } from '@/lib/office-life';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const workers = useOfficeStore(s => s.workers);
  const project = useOfficeStore(s => s.project);
  const projectQueue = useOfficeStore(s => s.projectQueue);
  const completeTask = useOfficeStore(s => s.completeTask);
  const sendWorkerToCEO = useOfficeStore(s => s.sendWorkerToCEO);
  const openProjectInput = useOfficeStore(s => s.openProjectInput);
  const openFinalReport = useOfficeStore(s => s.openFinalReport);
  const openTimeline = useOfficeStore(s => s.openTimelineModal);
  const openABCompare = useOfficeStore(s => s.openABCompare);
  const setCopyArchiveOpen = useOfficeStore(s => s.setCopyArchiveOpen);
  const setDataStorageOpen = useOfficeStore(s => s.setDataStorageOpen);
  const updateWorkerStreaming = useOfficeStore(s => s.updateWorkerStreaming);
  const [historyCount, setHistoryCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => { if (d.role === 'admin') setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { setHistoryCount(loadProjectHistory().length); } catch { /* noop */ }
  }, [project?.status]);

  useEffect(() => {
    initStorageFromSupabase().then(() => {
      try { setHistoryCount(loadProjectHistory().length); } catch { /* noop */ }
    });
    startOfficeLife();
    return () => stopOfficeLife();
  }, []);

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
        updateWorkerStreaming(workerId, result);
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
      const fallbackResult = `[데모 모드] API 키가 설정되지 않았거나 오류가 발생했습니다.\n\n업무 내용: "${task.instruction}"`;
      completeTask(workerId, fallbackResult);
      await new Promise(r => setTimeout(r, 1500));
      sendWorkerToCEO(workerId);
    }
  }, [completeTask, sendWorkerToCEO, updateWorkerStreaming]);

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
  const hasAB = project?.phases.some(p => p.abVariant === 'B');

  const handleTemplateSelect = (t: ProjectTemplate) => {
    const fn = (window as unknown as Record<string, unknown>).__applyTemplate;
    if (typeof fn === 'function') (fn as (t: ProjectTemplate) => void)(t);
  };

  const handleCompetitorComplete = (data: CompetitorInput, analysis: string) => {
    const fn = (window as unknown as Record<string, unknown>).__applyCompetitor;
    if (typeof fn === 'function') (fn as (d: CompetitorInput) => void)(data);
    const showFn = (window as unknown as Record<string, unknown>).__showCompetitorResult;
    if (typeof showFn === 'function') (showFn as (r: string) => void)(analysis);
  };

  return (
    <main className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => setAdminOpen(true)}
              className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-bold hover:bg-amber-500/30 transition-colors">
              관리자
            </button>
          )}
          <h1 className="text-white font-bold text-sm tracking-wide">VIRTUAL OFFICE</h1>
          <span className="text-gray-600 text-xs">AI Agent Simulation</span>
          {historyCount > 0 && (
            <span className="text-amber-400/50 text-xs" title={`${historyCount}건의 프로젝트 학습 데이터`}>🧠 {historyCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCopyArchiveOpen(true)}
            className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium hover:bg-emerald-500/30 transition-colors">
            📁 카피 보관함
          </button>
          <button onClick={() => setDataStorageOpen(true)}
            className="text-xs bg-violet-500/20 text-violet-400 px-2.5 py-1 rounded-full font-medium hover:bg-violet-500/30 transition-colors">
            🧠 데이터 저장소
          </button>
          {isProjectRunning && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full animate-pulse font-medium">
              ⚡ 에이전트 자율 협업 중
            </span>
          )}
          {isProjectDone && (
            <div className="flex items-center gap-1.5">
              <button onClick={openFinalReport}
                className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-medium hover:bg-green-500/30 transition-colors">
                ✅ 보고서
              </button>
              {hasAB && (
                <button onClick={() => openABCompare()}
                  className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-medium hover:bg-purple-500/30 transition-colors">
                  A/B
                </button>
              )}
              <button onClick={openTimeline}
                className="text-xs bg-gray-500/20 text-gray-400 px-2.5 py-1 rounded-full font-medium hover:bg-gray-500/30 transition-colors">
                🎬
              </button>
            </div>
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
          {projectQueue.length > 0 && (
            <span className="text-gray-500 text-xs" title="완료된 프로젝트">📁 {projectQueue.length}</span>
          )}
          <button onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
          }}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <OfficeCanvas />
      </div>

      {/* Panels */}
      <ProjectProgressPanel />
      <AgentChatPanel />
      <LiveStreamPanel />

      {/* Modals */}
      <TaskAssignModal />
      <ReportModal />
      <ManagerDashboard />
      <AddWorkerModal />
      <WorkerStatsModal />
      <ProjectInputModal />
      <FinalReportModal />
      <WorkerPeekCard />
      <PersonalityModal />
      <TemplateSelector onSelect={handleTemplateSelect} />
      <ABCompareView />
      <ResultEditor />
      <CompetitorModal onComplete={handleCompetitorComplete} />
      <CompetitorResultNotification />
      <TimelineReplay />
      <CopyArchivePanel />
      <DataStoragePanel />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </main>
  );
}
