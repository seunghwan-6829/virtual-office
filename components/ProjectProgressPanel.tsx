'use client';

import { useEffect, useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { loadProjectHistory } from '@/lib/storage';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'text-gray-500' },
  in_progress: { label: '작업 중', color: 'text-blue-400' },
  completed: { label: '완료', color: 'text-green-400' },
  revision: { label: '수정 중', color: 'text-amber-400' },
};

export default function ProjectProgressPanel() {
  const project = useOfficeStore(s => s.project);
  const workers = useOfficeStore(s => s.workers);
  const openFinalReport = useOfficeStore(s => s.openFinalReport);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    try { setHistoryCount(loadProjectHistory().length); } catch { /* noop */ }
  }, [project?.status]);

  if (!project || project.status === 'idle') return null;

  const spPhases = project.phases.filter(p => p.team === 'sp');
  const daPhases = project.phases.filter(p => p.team === 'da');
  const totalDone = project.phases.filter(p => p.status === 'completed').length;
  const totalPhases = project.phases.length;
  const progress = totalPhases > 0 ? totalDone / totalPhases : 0;
  const messages = project.messages.slice(-5).reverse();

  return (
    <div className="fixed right-4 top-16 w-80 z-40 flex flex-col gap-2 max-h-[calc(100vh-100px)] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold text-xs">
            {project.status === 'completed' ? '✅ 프로젝트 완료' :
             project.status === 'compiling' ? '📝 최종 보고서 작성 중...' :
             '⚡ 프로젝트 진행 중'}
          </span>
          <div className="flex items-center gap-2">
            {historyCount > 0 && (
              <span className="text-xs text-amber-400/70" title={`${historyCount}건의 과거 프로젝트 학습 데이터`}>🧠 {historyCount}</span>
            )}
            <span className="text-gray-500 text-xs">{totalDone}/{totalPhases}</span>
          </div>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${project.status === 'completed' ? 100 : Math.max(progress * 90, 5)}%` }}
          />
        </div>
        {project.status === 'completed' && (
          <button onClick={openFinalReport}
            className="w-full mt-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors">
            📋 최종 보고서 보기
          </button>
        )}
      </div>

      {/* Team Progress */}
      <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-2">
        <div className="text-blue-400 text-xs font-bold">📄 상세페이지 팀</div>
        {spPhases.map(phase => {
          const w = workers.find(v => v.id === phase.workerId);
          const st = STATUS_LABELS[phase.status] ?? STATUS_LABELS.pending;
          return (
            <div key={phase.id} className="flex items-center gap-2">
              {w && (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
                  style={{ borderColor: getCharColor(w.charId) }}>
                  <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-gray-300 text-xs flex-1 truncate">{w?.name}</span>
              <span className={`text-xs font-medium ${st.color}`}>
                {phase.status === 'in_progress' && <span className="inline-block animate-pulse mr-1">●</span>}
                {st.label}
              </span>
            </div>
          );
        })}

        <div className="text-purple-400 text-xs font-bold mt-3">📊 DA 팀</div>
        {daPhases.map(phase => {
          const w = workers.find(v => v.id === phase.workerId);
          const st = STATUS_LABELS[phase.status] ?? STATUS_LABELS.pending;
          return (
            <div key={phase.id} className="flex items-center gap-2">
              {w && (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
                  style={{ borderColor: getCharColor(w.charId) }}>
                  <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-gray-300 text-xs flex-1 truncate">{w?.name}</span>
              <span className={`text-xs font-medium ${st.color}`}>
                {phase.status === 'in_progress' && <span className="inline-block animate-pulse mr-1">●</span>}
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Messages */}
      {messages.length > 0 && (
        <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-1.5 overflow-y-auto max-h-40">
          <div className="text-gray-500 text-xs font-bold">💬 실시간 대화</div>
          {messages.map(msg => (
            <div key={msg.id} className="text-xs">
              <span className="text-white font-medium">{msg.fromName}</span>
              <span className="text-gray-500"> → </span>
              <span className="text-gray-400">{msg.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
