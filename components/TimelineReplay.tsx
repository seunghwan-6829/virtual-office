'use client';

import { useState, useEffect, useRef } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';

const TYPE_ICONS: Record<string, string> = {
  phase_start: '▶️', phase_complete: '✅', message: '💬',
  walk: '🚶', bubble: '💭', intervention: '🎯',
};

export default function TimelineReplay() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const timeline = useOfficeStore(s => s.timeline);
  const workers = useOfficeStore(s => s.workers);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.floor2Project);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen = modal.type === 'timeline';
  const events = isOpen && project ? timeline.filter(e => e.projectId === project.id) : [];
  const startTime = events.length > 0 ? events[0].timestamp : 0;
  const endTime = events.length > 0 ? events[events.length - 1].timestamp : 0;
  const duration = endTime - startTime;

  useEffect(() => {
    if (!isOpen || !playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIdx(i => {
        if (i >= events.length - 1) {
          setPlaying(false);
          return events.length - 1;
        }
        return i + 1;
      });
    }, 1000 / speed);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, playing, speed, events.length]);

  if (!isOpen) return null;

  const progress = events.length > 1
    ? ((events[currentIdx]?.timestamp ?? startTime) - startTime) / Math.max(duration, 1) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">🎬 프로젝트 타임라인 리플레이</h3>
            <p className="text-gray-500 text-xs mt-0.5">{events.length}개 이벤트 · {Math.round(duration / 1000)}초</p>
          </div>
          <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="p-3 border-b border-gray-800 flex items-center gap-3">
          <button onClick={() => { setPlaying(!playing); }}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-lg">
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => { setCurrentIdx(0); setPlaying(false); }}
            className="text-gray-400 hover:text-white text-xs">⏮ 처음</button>

          <div className="flex-1 relative h-2 bg-gray-800 rounded-full">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
            <input type="range" min={0} max={Math.max(events.length - 1, 1)} value={currentIdx}
              onChange={e => setCurrentIdx(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>

          <div className="flex items-center gap-1">
            {[0.5, 1, 2, 4].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs ${speed === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {events.map((ev, i) => {
            const w = workers.find(v => v.id === ev.actorId);
            const isActive = i === currentIdx;
            const isPast = i < currentIdx;

            return (
              <div key={ev.id}
                onClick={() => setCurrentIdx(i)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'bg-blue-500/20 border border-blue-500/50' :
                  isPast ? 'opacity-60' : 'opacity-30'
                } hover:opacity-100`}>
                <span className="text-gray-600 text-[10px] w-12 text-right flex-shrink-0">
                  {Math.round((ev.timestamp - startTime) / 1000)}s
                </span>
                <span className="text-sm">{TYPE_ICONS[ev.type] ?? '📌'}</span>
                {w ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border flex-shrink-0"
                    style={{ borderColor: getCharColor(w.charId) }}>
                    <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                    {ev.actorName.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-white text-xs font-medium">{ev.actorName}</span>
                  {ev.targetId && (
                    <span className="text-gray-500 text-xs"> → {workers.find(v => v.id === ev.targetId)?.name ?? ''}</span>
                  )}
                  <p className="text-gray-400 text-xs truncate">{ev.detail}</p>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-12">
              프로젝트를 실행하면 타임라인이 기록됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
