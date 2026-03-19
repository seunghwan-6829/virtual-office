'use client';

import { useOfficeStore } from '@/lib/store';
import { PROVIDER_COLORS } from '@/lib/llm-config';
import { getCharColor } from '@/lib/types';

export default function ReportModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const workerFinishReport = useOfficeStore(s => s.workerFinishReport);

  if (modal.type !== 'report' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker?.currentTask) return null;

  const task = worker.currentTask;
  const dur = task.completedAt ? Math.round((task.completedAt - task.createdAt) / 1000) : 0;
  const color = getCharColor(worker.charId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: color }}>{worker.name[0]}</div>
          <div className="flex-1">
            <h3 className="text-white font-bold">{worker.name} — 업무 보고</h3>
            <p className="text-gray-400 text-xs">
              소요시간: {dur}초 · <span style={{ color: PROVIDER_COLORS[worker.provider] }}>{worker.model}</span>
            </p>
          </div>
        </div>
        <div className="px-4 pt-4">
          <div className="text-xs text-gray-500 mb-1 font-medium">📋 지시 내용</div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300">{task.instruction}</div>
        </div>
        <div className="px-4 pt-3 pb-4">
          <div className="text-xs text-gray-500 mb-1 font-medium">📝 작업 결과</div>
          <div className="bg-gray-800 rounded-lg px-3 py-3 text-sm text-gray-200 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {task.result || '결과를 불러오는 중...'}
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button onClick={() => workerFinishReport(worker.id)}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">
            확인 (자리로 복귀)
          </button>
        </div>
      </div>
    </div>
  );
}
