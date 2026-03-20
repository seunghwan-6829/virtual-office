'use client';

import { useEffect } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';

const STATE_EMOJI: Record<string, string> = {
  idle: '💤', working: '⚡', walkingToCEO: '🚶', waitingAtCEO: '📋',
  walkingBack: '🚶', walkingToColleague: '🤝', discussing: '💬',
  chatting: '💬', reporting: '📊', revising: '🔄',
};

export default function WorkerPeekCard() {
  const peekId = useOfficeStore(s => s.peekWorkerId);
  const workers = useOfficeStore(s => s.workers);
  const project = useOfficeStore(s => s.project);
  const close = useOfficeStore(s => s.setWorkerPeek);

  useEffect(() => {
    if (!peekId) return;
    const t = setTimeout(() => close(null), 5000);
    return () => clearTimeout(t);
  }, [peekId, close]);

  if (!peekId) return null;

  const w = workers.find(v => v.id === peekId);
  if (!w) return null;

  const phase = project?.phases.find(p => p.workerId === peekId);
  const emoji = STATE_EMOJI[w.state] ?? '💤';

  const stateLabel =
    w.state === 'working' ? '작업 중' :
    w.state === 'idle' ? '대기 중' :
    w.state === 'walkingToColleague' ? '동료에게 이동 중' :
    w.state === 'walkingToCEO' ? 'CEO에게 이동 중' :
    w.state === 'waitingAtCEO' ? '보고 대기' :
    w.state === 'walkingBack' ? '자리로 복귀 중' :
    w.state === 'discussing' ? '대화 중' :
    w.state;

  const phaseLabel =
    !phase ? null :
    phase.status === 'completed' ? '✅ 완료' :
    phase.status === 'in_progress' ? '🔄 진행 중' :
    phase.status === 'revision' ? '📝 수정 중' :
    '⏳ 대기';

  return (
    <div
      className="fixed left-1/2 bottom-24 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-200"
      onClick={() => close(null)}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-600 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[320px] cursor-pointer hover:border-gray-500 transition-colors">
        <div
          className="w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0"
          style={{ borderColor: getCharColor(w.charId) }}
        >
          <img
            src={`/sprites/characters/CH_${w.charId}_Front.png`}
            alt={w.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{w.name}</span>
            <span className="text-gray-500 text-xs">{w.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">{emoji}</span>
            <span className="text-gray-300 text-xs">{stateLabel}</span>
            {phaseLabel && (
              <>
                <span className="text-gray-600 text-xs">·</span>
                <span className="text-gray-400 text-xs">{phaseLabel}</span>
              </>
            )}
          </div>
          {phase?.status === 'completed' && phase.result && (
            <p className="text-gray-500 text-xs mt-1 truncate">{phase.result.slice(0, 60)}...</p>
          )}
        </div>

        <span className="text-gray-600 text-xs flex-shrink-0">탭하여 닫기</span>
      </div>
    </div>
  );
}
