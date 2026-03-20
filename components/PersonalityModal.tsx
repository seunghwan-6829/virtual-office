'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor, AgentPersonality } from '@/lib/types';
import { autoOptimizeAgent } from '@/lib/orchestrator';

const SLIDERS: { key: keyof AgentPersonality; label: string; low: string; high: string; color: string }[] = [
  { key: 'creativity', label: '창의성', low: '보수적', high: '혁신적', color: 'blue' },
  { key: 'detail', label: '상세도', low: '간결', high: '상세', color: 'green' },
  { key: 'tone', label: '톤', low: '포멀', high: '캐주얼', color: 'purple' },
  { key: 'aggression', label: '공격성', low: '안전', high: '공격적', color: 'red' },
];

export default function PersonalityModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const updatePersonality = useOfficeStore(s => s.updatePersonality);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [optimizing, setOptimizing] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  if (modal.type !== 'personality' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker) return null;

  const handleAutoOptimize = async () => {
    setOptimizing(true);
    setSuggestion('');
    try {
      const result = await autoOptimizeAgent(worker.id);
      setSuggestion(result);
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.creativity !== undefined) {
            updatePersonality(worker.id, {
              creativity: parsed.creativity,
              detail: parsed.detail,
              tone: parsed.tone,
              aggression: parsed.aggression,
            });
          }
        }
      } catch { /* noop */ }
    } catch { setSuggestion('최적화 분석 실패'); }
    setOptimizing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2" style={{ borderColor: getCharColor(worker.charId) }}>
            <img src={`/sprites/characters/CH_${worker.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{worker.name} — 성격 설정</h3>
            <p className="text-gray-500 text-xs">{worker.title}</p>
          </div>
          <button onClick={closeModal} className="ml-auto text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {SLIDERS.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-300 text-xs font-medium">{s.label}</span>
                <span className="text-gray-500 text-xs">{worker.personality[s.key]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-[10px] w-10 text-right">{s.low}</span>
                <input
                  type="range" min={0} max={100} step={5}
                  value={worker.personality[s.key]}
                  onChange={e => updatePersonality(worker.id, { [s.key]: Number(e.target.value) })}
                  className="flex-1 accent-blue-500 h-1.5"
                />
                <span className="text-gray-600 text-[10px] w-10">{s.high}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={handleAutoOptimize}
            disabled={optimizing}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            {optimizing ? '🧠 AI 분석 중...' : '🧠 AI 자동 최적화'}
          </button>
          {suggestion && (
            <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 max-h-32 overflow-y-auto">
              {suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
