'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ABCompareView() {
  const modal = useOfficeStore(s => s.modal);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.floor2Project);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [votes, setVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  if (modal.type !== 'abCompare' || !project) return null;

  const roleKeys = Array.from(new Set(project.phases.map(p => p.roleKey)));
  const abPairs = roleKeys
    .map(rk => {
      const a = project.phases.find(p => p.roleKey === rk && p.abVariant === 'A');
      const b = project.phases.find(p => p.roleKey === rk && p.abVariant === 'B');
      return a && b ? { roleKey: rk, a, b } : null;
    })
    .filter(Boolean) as { roleKey: string; a: typeof project.phases[0]; b: typeof project.phases[0] }[];

  if (abPairs.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
          <p className="text-gray-400">A/B 테스트 데이터가 없습니다.</p>
          <button onClick={closeModal} className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">닫기</button>
        </div>
      </div>
    );
  }

  const safeIdx = Math.min(currentIdx, abPairs.length - 1);
  const pair = abPairs[safeIdx];
  const w = workers.find(v => v.id === pair.a.workerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {w && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2" style={{ borderColor: getCharColor(w.charId) }}>
                <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-sm">A/B 테스트 비교 — {w?.name} ({w?.title})</h3>
              <p className="text-gray-500 text-xs">{safeIdx + 1} / {abPairs.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={safeIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs disabled:opacity-30">← 이전</button>
            <button disabled={safeIdx === abPairs.length - 1} onClick={() => setCurrentIdx(i => i + 1)}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs disabled:opacity-30">다음 →</button>
            <button onClick={closeModal} className="px-3 py-1 bg-gray-800 text-gray-400 rounded-lg text-xs">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {['A', 'B'].map(variant => {
            const phase = variant === 'A' ? pair.a : pair.b;
            const isVoted = votes[pair.roleKey] === variant;
            return (
              <div key={variant} className={`flex-1 flex flex-col border-r border-gray-800 last:border-r-0 ${isVoted ? 'ring-2 ring-inset ring-green-500' : ''}`}>
                <div className={`px-4 py-2 flex items-center justify-between ${variant === 'A' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                  <span className={`font-bold text-sm ${variant === 'A' ? 'text-blue-400' : 'text-purple-400'}`}>{variant}안</span>
                  <button
                    onClick={() => setVotes(v => ({ ...v, [pair.roleKey]: variant as 'A' | 'B' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isVoted ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {isVoted ? '✓ 선택됨' : '이것으로'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 report-content text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{phase.result || '결과 대기 중...'}</ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-800 flex items-center justify-between">
          <div className="text-gray-500 text-xs">
            투표 현황: {Object.keys(votes).length} / {abPairs.length}
          </div>
          <div className="flex gap-2">
            {abPairs.map((p, i) => {
              const v = votes[p.roleKey];
              return (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    i === safeIdx ? 'bg-white text-black' :
                    v === 'A' ? 'bg-blue-500/30 text-blue-400' :
                    v === 'B' ? 'bg-purple-500/30 text-purple-400' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
