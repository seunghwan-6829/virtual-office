'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const ANALYSIS_TYPES = ['전체 페이지 진단', 'CTA 최적화', '이탈률 개선', '체류시간 분석', 'A/B 테스트 설계'];
const FUNNEL_STAGES = ['상단 (인지/유입)', '중단 (관심/고려)', '하단 (결정/전환)', '전체 퍼널'];

export default function SPCROModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [currentIssue, setCurrentIssue] = useState('');
  const [analysisType, setAnalysisType] = useState('전체 페이지 진단');
  const [funnelStage, setFunnelStage] = useState('전체 퍼널');
  const [hasData, setHasData] = useState(false);
  const [performanceData, setPerformanceData] = useState('');

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      currentIssue ? `현재 문제점: ${currentIssue}` : '',
      `분석 유형: ${analysisType}`,
      `퍼널 단계: ${funnelStage}`,
      hasData && performanceData ? `현재 성과 데이터:\n${performanceData}` : '성과 데이터 없음 (일반적 가이드라인 기반으로 분석)',
      '구체적인 개선 액션아이템, A/B 테스트 가설, 예상 개선 효과를 포함해주세요.',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spCRO', analysisType, funnelStage });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 상세페이지 전환율을 개선해드릴게요.
          현재 상황을 알려주시면 진단과 최적화 방안을 제시하겠습니다.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 페이지 URL" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={currentIssue} onChange={e => setCurrentIssue(e.target.value)}
          placeholder="현재 겪고 있는 문제 (예: 이탈률 80%, 전환율 0.5%)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">분석 유형</div>
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_TYPES.map(t => (
            <button key={t} onClick={() => setAnalysisType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${analysisType === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">퍼널 단계</div>
        <div className="flex flex-wrap gap-2">
          {FUNNEL_STAGES.map(s => (
            <button key={s} onClick={() => setFunnelStage(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${funnelStage === s ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={hasData} onChange={e => setHasData(e.target.checked)}
            className="rounded bg-gray-800 border-gray-600" />
          <span className="text-xs text-gray-400">성과 데이터 입력하기</span>
        </label>

        {hasData && (
          <textarea value={performanceData} onChange={e => setPerformanceData(e.target.value)}
            placeholder="CTR, 전환율, 이탈률, 체류시간 등 현재 수치를 입력해주세요" rows={3}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700" />
        )}

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          📊 전환율 분석 시작
        </button>
      </div>
    </ModalShell>
  );
}
