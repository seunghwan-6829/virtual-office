'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

type Step = 'input' | 'analyzing' | 'result' | 'confirm';

const CHANNELS = ['Meta (Facebook/Instagram)', 'Google Ads', '네이버 SA/DA', '카카오모먼트', 'TikTok', 'YouTube'];
const OBJECTIVES = ['브랜드 인지도', '트래픽 유입', '전환/구매', '리타겟팅', '앱 설치', 'LTV 최적화'];
const BUDGETS = ['월 100만 이하', '월 100~300만', '월 300~1000만', '월 1000만 이상'];

export default function DAStrategyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [step, setStep] = useState<Step>('input');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [objective, setObjective] = useState('전환/구매');
  const [budget, setBudget] = useState('월 100~300만');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis, setAnalysis] = useState<any>(null);
  const [extraNotes, setExtraNotes] = useState('');
  const [error, setError] = useState('');

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const analyze = async () => {
    if (!productName.trim()) return;
    setStep('analyzing');
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: `${productName} - 타겟: ${targetAudience}, 목표: ${objective}, 예산: ${budget}`, roleKey: 'daStrategy' }),
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
      `상품/서비스: ${productName}`,
      targetAudience ? `타겟 오디언스: ${targetAudience}` : '',
      `캠페인 목표: ${objective}`,
      `예산 규모: ${budget}`,
      selectedChannels.length > 0 ? `선호 매체: ${selectedChannels.join(', ')}` : '',
      analysis?.recommendedChannels ? `AI 추천 매체: ${(analysis.recommendedChannels as string[]).join(', ')}` : '',
      '퍼널별 캠페인 구조, 타겟팅 전략, 예산 배분, 일정, KPI를 포함한 미디어 플랜을 작성해주세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daStrategy', objective, budget, channels: selectedChannels });
  };

  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      {step === 'input' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
            CEO님! DA 캠페인 전략을 수립하겠습니다.
            상품과 목표를 알려주세요.
          </div>
          {error && <div className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2">{error}</div>}
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="상품명 / 서비스명" autoFocus
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <input type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
            placeholder="타겟 오디언스 (예: 25~35 여성, 뷰티 관심)"
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

          <div className="text-xs text-gray-500 font-medium">캠페인 목표</div>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map(o => (
              <button key={o} onClick={() => setObjective(o)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${objective === o ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {o}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">광고 매체 (복수 선택)</div>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(ch => (
              <button key={ch} onClick={() => toggleChannel(ch)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedChannels.includes(ch) ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {ch}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">월 예산 규모</div>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map(b => (
              <button key={b} onClick={() => setBudget(b)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${budget === b ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {b}
              </button>
            ))}
          </div>

          <button onClick={analyze} disabled={!productName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
            📊 캠페인 전략 분석
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">캠페인 전략을 분석 중입니다...</p>
        </div>
      )}

      {step === 'result' && analysis && (
        <div className="p-5 space-y-4">
          {analysis.recommendedChannels && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">AI 추천 매체</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.recommendedChannels as string[]).map((ch, i) => (
                  <span key={i} className="bg-cyan-900/30 text-cyan-300 px-3 py-1 rounded-full text-xs">{ch}</span>
                ))}
              </div>
            </>
          )}
          {analysis.targetSegments && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">타겟 세그먼트</div>
              <div className="space-y-1">
                {(analysis.targetSegments as string[]).map((s, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300">👥 {s}</div>
                ))}
              </div>
            </>
          )}
          {analysis.kpis && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">핵심 KPI</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.kpis as string[]).map((k, i) => (
                  <span key={i} className="bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full text-xs">{k}</span>
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
            <div>목표: <span className="text-indigo-400">{objective}</span> · 예산: <span className="text-amber-400">{budget}</span></div>
          </div>
          <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="추가 지시사항 (선택)" rows={2}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <div className="flex gap-2">
            <button onClick={() => setStep('result')} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">← 이전</button>
            <button onClick={submit} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">🚀 미디어 플랜 작성 시작</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
