'use client';

import { useOfficeStore } from '@/lib/store';
import { WorkerState, getCharColor } from '@/lib/types';

const STATE_LABELS: Record<WorkerState, { text: string; color: string }> = {
  idle: { text: '대기', color: '#6b7280' },
  chatting: { text: '대화 중', color: '#3b82f6' },
  working: { text: '작업 중', color: '#f59e0b' },
  walkingToCEO: { text: '이동 중', color: '#8b5cf6' },
  waitingAtCEO: { text: '보고 대기', color: '#ef4444' },
  reporting: { text: '보고 중', color: '#10b981' },
  revising: { text: '수정 중', color: '#f97316' },
  walkingBack: { text: '복귀 중', color: '#8b5cf6' },
  walkingToColleague: { text: '동료에게 이동 중', color: '#a855f7' },
  discussing: { text: '대화 중', color: '#06b6d4' },
};

export default function WorkerStatusBar() {
  const workers = useOfficeStore(s => s.workers);
  const openAddWorkerModal = useOfficeStore(s => s.openAddWorkerModal);
  const openStatsModal = useOfficeStore(s => s.openStatsModal);

  return (
    <div className="bg-gray-900/90 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-gray-500 text-xs font-medium flex-shrink-0 mr-1">직원</span>
        {workers.filter(w => !w.isManager).map(w => {
          const si = STATE_LABELS[w.state];
          const color = getCharColor(w.charId);
          return (
            <button key={w.id} onClick={() => openStatsModal(w.id)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-750 rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors cursor-pointer border border-transparent hover:border-gray-600">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border"
                style={{ borderColor: color }}>
                <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt={w.name}
                  className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="text-white text-xs font-medium">{w.name} <span className="text-gray-500 font-normal">{w.title}</span></div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: si.color }} />
                  <span className="text-gray-400 text-[10px]">{si.text}</span>
                </div>
              </div>
            </button>
          );
        })}
        <button onClick={openAddWorkerModal}
          className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2.5 flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs">
          <span className="text-lg leading-none">+</span><span>추가</span>
        </button>
      </div>
    </div>
  );
}
