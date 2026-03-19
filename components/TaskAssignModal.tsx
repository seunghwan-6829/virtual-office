'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { PROVIDER_COLORS } from '@/lib/llm-config';
import { getCharColor } from '@/lib/types';

export default function TaskAssignModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);
  const startTask = useOfficeStore(s => s.startTask);
  const [instruction, setInstruction] = useState('');

  if (modal.type !== 'task' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker) return null;

  const handleSubmit = () => {
    if (!instruction.trim()) return;
    startTask(worker.id, instruction.trim());
    setInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const color = getCharColor(worker.charId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: color }}>{worker.name[0]}</div>
          <div className="flex-1">
            <h3 className="text-white font-bold">{worker.name}</h3>
            <p className="text-gray-400 text-xs">{worker.role}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ backgroundColor: PROVIDER_COLORS[worker.provider] + '22', color: PROVIDER_COLORS[worker.provider] }}>
            {worker.model}
          </span>
          <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors ml-1">✕</button>
        </div>
        <div className="p-4 space-y-3 min-h-[120px]">
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: color }}>{worker.name[0]}</div>
            <div className="bg-gray-800 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-200">
              CEO님, 안녕하세요! <strong>{worker.name}</strong>입니다. 어떤 업무를 맡겨주시겠어요?
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="업무를 지시해주세요..." autoFocus rows={2}
              className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
            <button onClick={handleSubmit} disabled={!instruction.trim()}
              className="self-end px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
              지시
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-2">Enter로 전송 · Shift+Enter로 줄바꿈</p>
        </div>
      </div>
    </div>
  );
}
