'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

type Step = 'input' | 'analyzing' | 'result' | 'confirm';

const TRIGGER_TYPES = ['호기심', '공포/불안', '이익/혜택', '사회적 증거', '긴급성', '반전/의외'];
const HOOK_POSITIONS = ['최상단 오프닝', '스크롤 중간 리훅', 'CTA 직전 마감 훅', '전체 후킹 전략'];

export default function SPHookModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [step, setStep] = useState<Step>('input');
  const [productName, setProductName] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [triggerType, setTriggerType] = useState('호기심');
  const [hookPosition, setHookPosition] = useState('최상단 오프닝');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis, setAnalysis] = useState<any>(null);
  const [extraNotes, setExtraNotes] = useState('');
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!productName.trim()) return;
    setStep('analyzing');
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: `${productName} - 타겟: ${targetCustomer}`, roleKey: 'spHook' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
      setStep('result');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '분석 실패');
      setStep('input');
    }
  };

  const submit = () => {
    const instruction = [
      `상품명: ${productName}`,
      targetCustomer ? `타겟 고객: ${targetCustomer}` : '',
      `심리 트리거: ${triggerType}`,
      `후킹 위치: ${hookPosition}`,
      analysis?.painPoints ? `고객 Pain Points: ${(analysis.painPoints as string[]).join(', ')}` : '',
      analysis?.hookAngles ? `후킹 접근각도: ${(analysis.hookAngles as string[]).join(', ')}` : '',
      '후킹 문구를 5개 이상 버전별로 작성해주세요. 각 문구에 대해 효과 예측과 사용 위치를 명시하세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spHook', triggerType, hookPosition });
  };

  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      {step === 'input' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
            CEO님! 스크롤을 멈추게 할 후킹 문구를 만들어드릴게요.
            상품과 타겟 정보를 알려주세요.
          </div>
          {error && <div className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2">{error}</div>}
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

          <button onClick={analyze} disabled={!productName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
            🎯 Pain Point 분석하기
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">고객 심리를 분석 중입니다...</p>
        </div>
      )}

      {step === 'result' && analysis && (
        <div className="p-5 space-y-4">
          {analysis.painPoints && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">고객 Pain Points</div>
              <div className="space-y-1">
                {(analysis.painPoints as string[]).map((p, i) => (
                  <div key={i} className="bg-red-900/20 border border-red-800/20 rounded-lg px-3 py-2 text-xs text-red-300">🔥 {p}</div>
                ))}
              </div>
            </>
          )}
          {analysis.hookAngles && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">후킹 접근 각도</div>
              <div className="space-y-1">
                {(analysis.hookAngles as string[]).map((a, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300">🎯 {a}</div>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setStep('confirm')}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
            다음: 추가 지시사항
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
            <div>상품: <span className="text-white">{productName}</span></div>
            <div>트리거: <span className="text-red-400">{triggerType}</span> · 위치: <span className="text-orange-400">{hookPosition}</span></div>
          </div>
          <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="추가 지시사항 (선택)" rows={2}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <div className="flex gap-2">
            <button onClick={() => setStep('result')} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">← 이전</button>
            <button onClick={submit} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">🔥 후킹 문구 작성 시작</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
