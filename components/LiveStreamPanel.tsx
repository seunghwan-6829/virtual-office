'use client';

import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function LiveStreamPanel() {
  const liveId = useOfficeStore(s => s.liveStreamWorkerId);
  const setLive = useOfficeStore(s => s.setLiveStreamWorker);
  const workers = useOfficeStore(s => s.workers);
  const project = useOfficeStore(s => s.project);

  if (!liveId) return null;

  const worker = workers.find(w => w.id === liveId);
  if (!worker) return null;

  const phase = project?.phases.find(p => p.workerId === liveId && p.status === 'in_progress');
  const completedPhase = project?.phases.find(p => p.workerId === liveId && p.status === 'completed');
  const streamText = phase?.streamingText || worker.streamingText;
  const displayText = streamText || completedPhase?.result || '';

  const isStreaming = !!streamText && worker.state === 'working';

  return (
    <div className="fixed left-4 top-16 z-40 w-[420px] max-h-[70vh] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-gray-700">
        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 flex-shrink-0"
          style={{ borderColor: getCharColor(worker.charId) }}>
          <img src={`/sprites/characters/CH_${worker.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{worker.name}</span>
            <span className="text-gray-500 text-xs">{worker.title}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isStreaming ? (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                실시간 작업 중
              </span>
            ) : displayText ? (
              <span className="text-blue-400 text-xs">작업 완료</span>
            ) : (
              <span className="text-gray-500 text-xs">대기 중</span>
            )}
          </div>
        </div>
        <button onClick={() => setLive(null)} className="text-gray-500 hover:text-white text-sm p-1">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {displayText ? (
          <div className="report-content text-xs leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
            {isStreaming && <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />}
          </div>
        ) : (
          <div className="text-gray-600 text-sm text-center py-8">
            작업이 시작되면 실시간으로 표시됩니다
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-800 flex gap-1">
        {workers.filter(w => !w.isManager && w.roleKey !== 'manager').map(w => (
          <button
            key={w.id}
            onClick={() => setLive(w.id)}
            className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
              w.id === liveId ? 'border-white ring-2 ring-blue-500' : 'border-transparent opacity-50 hover:opacity-100'
            }`}
            style={{ borderColor: w.id === liveId ? getCharColor(w.charId) : undefined }}
            title={`${w.name} (${w.title})`}
          >
            <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
