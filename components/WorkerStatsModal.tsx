'use client';

import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { getWorkerRecords } from '@/lib/storage';

export default function WorkerStatsModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const tasks = useOfficeStore(s => s.tasks);
  const managerLogs = useOfficeStore(s => s.managerLogs);
  const closeModal = useOfficeStore(s => s.closeModal);

  if (modal.type !== 'stats' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker) return null;

  const workerTasks = tasks.filter(t => t.workerId === worker.id);
  const completedTasks = workerTasks.filter(t => t.status === 'completed' || t.status === 'reported');
  const workerLogs = managerLogs.filter(l => l.workerId === worker.id);
  const savedRecords = getWorkerRecords(worker.id);
  const allCompleted = workerLogs.length + savedRecords.length;

  const totalTime = workerLogs.reduce((sum, l) => sum + l.durationMs, 0);
  const avgTime = workerLogs.length > 0 ? totalTime / workerLogs.length : 0;
  const totalRevisions = savedRecords.reduce((sum, r) => sum + r.revisions.length, 0);

  const color = getCharColor(worker.charId);

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}초`;
    return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-700 flex items-center gap-4 flex-shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: color }}>
            <img src={`/sprites/characters/CH_${worker.charId}_Front.png`} alt={worker.name}
              className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">{worker.name}</h3>
            <p className="text-gray-400 text-sm">{worker.title} · {worker.role}</p>
          </div>
          <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-800 flex-shrink-0">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{allCompleted}</div>
            <div className="text-xs text-gray-500 mt-1">완료</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{workerLogs.length}</div>
            <div className="text-xs text-gray-500 mt-1">보고</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{totalRevisions}</div>
            <div className="text-xs text-gray-500 mt-1">수정</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-purple-400">{avgTime > 0 ? formatDuration(avgTime) : '-'}</div>
            <div className="text-xs text-gray-500 mt-1">평균</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">업무 히스토리</h4>
          {workerLogs.length === 0 && completedTasks.length === 0 && savedRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">아직 완료된 업무가 없습니다</div>
          ) : (
            [...workerLogs].reverse().map(log => (
              <div key={log.id} className="bg-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate flex-1">{log.taskInstruction}</span>
                  <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{log.taskResult.slice(0, 150)}</p>
                <span className="text-gray-600 text-xs">소요: {formatDuration(log.durationMs)}</span>
              </div>
            ))
          )}
          {workerTasks.filter(t => t.status === 'in_progress').map(t => (
            <div key={t.id} className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 text-sm font-medium">{t.instruction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
