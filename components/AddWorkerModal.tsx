'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { LLM_OPTIONS } from '@/lib/llm-config';
import { OFFICES } from '@/lib/game/office-map';

export default function AddWorkerModal() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const addWorker = useOfficeStore(s => s.addWorker);
  const workers = useOfficeStore(s => s.workers);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [llmIdx, setLlmIdx] = useState(0);

  if (modal.type !== 'addWorker') return null;

  const usedOffices = new Set(workers.map(w => w.officeId));
  const freeCount = OFFICES.filter(o => !usedOffices.has(o.id)).length;

  const submit = () => {
    if (!name.trim() || !role.trim()) return;
    const llm = LLM_OPTIONS[llmIdx];
    addWorker(name.trim(), role.trim(), llm.provider, llm.model);
    setName(''); setRole(''); setLlmIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-white font-bold">새 직원 추가</h3>
          <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {freeCount <= 0 ? (
            <div className="text-center py-6 text-gray-400">사무실 자리가 모두 찼습니다 (최대 {OFFICES.length}명)</div>
          ) : (
            <>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="예: 정기획"
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">역할</label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="예: 기획자 (사업 기획, 전략 수립)"
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">LLM 모델</label>
                <div className="space-y-1">
                  {LLM_OPTIONS.map((o, i) => (
                    <button key={i} onClick={() => setLlmIdx(i)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${llmIdx === i ? 'bg-blue-600/20 border-blue-500 text-blue-300 border' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-gray-500 text-xs">남은 자리: {freeCount}석</div>
            </>
          )}
        </div>
        {freeCount > 0 && (
          <div className="p-4 border-t border-gray-800">
            <button onClick={submit} disabled={!name.trim() || !role.trim()}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
              직원 배치
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
