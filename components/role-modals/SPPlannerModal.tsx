'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

type Step = 'input' | 'analyzing' | 'result' | 'confirm';

const FRAMEWORKS = ['AIDA', 'PAS', 'FAB', 'BAB', '스토리텔링'];
const PAGE_TYPES = ['단독 상품', '세트/번들', '서비스 소개', '구독형', '이벤트/프로모션'];

export default function SPPlannerModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [step, setStep] = useState<Step>('input');
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [pageType, setPageType] = useState('단독 상품');
  const [framework, setFramework] = useState('AIDA');
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
        body: JSON.stringify({ topic: `${productName} - ${productInfo}`, roleKey: 'spPlanner' }),
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
      productInfo ? `상품 정보: ${productInfo}` : '',
      `페이지 유형: ${pageType}`,
      `프레임워크: ${framework}`,
      analysis?.sections ? `추천 섹션: ${(analysis.sections as string[]).join(' → ')}` : '',
      '각 섹션별 목적, 핵심 메시지, 예상 콘텐츠, 레이아웃 가이드를 포함한 상세 기획서를 작성해주세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spPlanner', pageType, framework });
  };

  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      {step === 'input' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
            CEO님! 상세페이지를 기획할 상품 정보를 알려주세요.
            구성과 스토리보드를 설계해드리겠습니다.
          </div>
          {error && <div className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2">{error}</div>}
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="상품명 / 서비스명" autoFocus
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <textarea value={productInfo} onChange={e => setProductInfo(e.target.value)}
            placeholder="상품 특징, 가격대, 타겟 고객 등" rows={3}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <div className="text-xs text-gray-500 font-medium">페이지 유형</div>
          <div className="flex flex-wrap gap-2">
            {PAGE_TYPES.map(t => (
              <button key={t} onClick={() => setPageType(t)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pageType === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 font-medium">프레임워크</div>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map(f => (
              <button key={f} onClick={() => setFramework(f)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${framework === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={analyze} disabled={!productName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
            📐 구성 분석하기
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">상세페이지 구성을 분석 중입니다...</p>
        </div>
      )}

      {step === 'result' && analysis && (
        <div className="p-5 space-y-4">
          {analysis.sections && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">추천 섹션 구성</div>
              <div className="space-y-1">
                {(analysis.sections as string[]).map((s, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 flex items-center gap-2">
                    <span className="text-blue-400 font-bold">{i + 1}</span> {s}
                  </div>
                ))}
              </div>
            </>
          )}
          {analysis.targetPainPoints && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">타겟 Pain Points</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.targetPainPoints as string[]).map((p, i) => (
                  <span key={i} className="bg-red-900/20 text-red-300 px-3 py-1 rounded-full text-xs">{p}</span>
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
            <div>유형: <span className="text-blue-400">{pageType}</span> · 프레임워크: <span className="text-purple-400">{framework}</span></div>
          </div>
          <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="추가 지시사항 (선택)" rows={2}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <div className="flex gap-2">
            <button onClick={() => setStep('result')} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">← 이전</button>
            <button onClick={submit} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">📐 기획서 작성 시작</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
