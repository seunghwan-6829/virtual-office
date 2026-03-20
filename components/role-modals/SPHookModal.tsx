'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const TRIGGER_TYPES = ['호기심', '공포/불안', '이익/혜택', '사회적 증거', '긴급성', '반전/의외'];
const HOOK_POSITIONS = ['최상단 오프닝', '스크롤 중간 리훅', 'CTA 직전 마감 훅', '전체 후킹 전략'];

export default function SPHookModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [triggerType, setTriggerType] = useState('호기심');
  const [hookPosition, setHookPosition] = useState('최상단 오프닝');
  const [extraNotes, setExtraNotes] = useState('');

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      targetCustomer ? `타겟 고객: ${targetCustomer}` : '',
      `심리 트리거: ${triggerType}`,
      `후킹 위치: ${hookPosition}`,
      '후킹 문구를 5개 이상 버전별로 작성해주세요.',
      '각 문구에 대해 효과 예측, 사용 위치, 고객 Pain Point 연결을 명시하세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spHook', triggerType, hookPosition });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          스크롤을 멈추게 할 후킹 문구를 만들어드릴게요.
        </div>
        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <input type="text" value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)}
          placeholder="타겟 고객 (예: 30대 직장인 여성)"
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <div className="text-xs text-gray-500 font-medium">심리 트리거</div>
        <div className="flex flex-wrap gap-2">
          {TRIGGER_TYPES.map(t => (
            <button key={t} onClick={() => setTriggerType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${triggerType === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 font-medium">후킹 위치</div>
        <div className="flex flex-wrap gap-2">
          {HOOK_POSITIONS.map(p => (
            <button key={p} onClick={() => setHookPosition(p)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${hookPosition === p ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🔥 후킹 문구 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
