'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { RoleKey } from '@/lib/types';
import { OFFICES } from '@/lib/game/office-map';

const ROLE_OPTIONS: { key: RoleKey; title: string; role: string }[] = [
  { key: 'spPlanner', title: '상페 기획', role: '상세페이지 기획 (구성·레이아웃·스토리보드)' },
  { key: 'spCopy', title: '상페 카피', role: '상세페이지 카피라이터 (헤드라인·본문·CTA)' },
  { key: 'spHook', title: '상페 후킹', role: '상세페이지 후킹 전문 (고객 유인·pain point)' },
  { key: 'spCRO', title: '상페 전환최적화', role: '상세페이지 CRO (전환율 분석·A/B테스트)' },
  { key: 'daStrategy', title: 'DA 전략기획', role: 'DA 전략기획 (캠페인·타겟팅·매체선정)' },
  { key: 'daCopy', title: 'DA 카피', role: 'DA 광고카피 (소재 헤드라인·본문·CTA)' },
  { key: 'daAnalysis', title: 'DA 퍼포먼스', role: 'DA 퍼포먼스 분석 (ROAS·CTR·리포트)' },
  { key: 'daCreative', title: 'DA 소재디자인', role: 'DA 소재 디자이너 (배너·이미지·크리에이티브)' },
];

export default function AddWorkerModal() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const addWorker = useOfficeStore(s => s.addWorker);
  const workers = useOfficeStore(s => s.workers);

  const [name, setName] = useState('');
  const [roleIdx, setRoleIdx] = useState(0);

  if (modal.type !== 'addWorker') return null;

  const usedOffices = new Set(workers.map(w => w.officeId));
  const freeCount = OFFICES.filter(o => !usedOffices.has(o.id)).length;
  const sel = ROLE_OPTIONS[roleIdx];

  const submit = () => {
    if (!name.trim()) return;
    addWorker(name.trim(), sel.title, sel.key, sel.role, 'anthropic', 'claude-opus-4-6');
    setName(''); setRoleIdx(0);
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
                <label className="text-gray-400 text-xs font-medium block mb-1">직무</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {ROLE_OPTIONS.map((o, i) => (
                    <button key={o.key} onClick={() => setRoleIdx(i)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${roleIdx === i ? 'bg-blue-600/20 border-blue-500 text-blue-300 border' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750'}`}>
                      {o.title} <span className="text-gray-500 text-xs">{o.role}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-gray-500 text-xs">남은 자리: {freeCount}석 · 모델: Claude Opus 4.6</div>
            </>
          )}
        </div>
        {freeCount > 0 && (
          <div className="p-4 border-t border-gray-800">
            <button onClick={submit} disabled={!name.trim()}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
              직원 배치
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
