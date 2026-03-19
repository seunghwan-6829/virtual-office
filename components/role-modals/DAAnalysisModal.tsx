'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

type Step = 'input' | 'analyzing' | 'result' | 'confirm';

const REPORT_TYPES = ['주간 리포트', '월간 리포트', '캠페인 성과 분석', '소재별 비교 분석', '채널별 비교 분석'];
const METRICS_FOCUS = ['ROAS', 'CTR', 'CPC/CPA', 'CPM', '전환율', 'LTV'];

export default function DAAnalysisModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [step, setStep] = useState<Step>('input');
  const [campaignName, setCampaignName] = useState('');
  const [performanceData, setPerformanceData] = useState('');
  const [reportType, setReportType] = useState('주간 리포트');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['ROAS', 'CTR']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis, setAnalysis] = useState<any>(null);
  const [extraNotes, setExtraNotes] = useState('');
  const [error, setError] = useState('');

  const toggleMetric = (m: string) => {
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const analyze = async () => {
    if (!campaignName.trim()) return;
    setStep('analyzing');
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: `${campaignName} - ${reportType}, 주요지표: ${selectedMetrics.join(',')}`, roleKey: 'daAnalysis' }),
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
      `캠페인: ${campaignName}`,
      `리포트 유형: ${reportType}`,
      `핵심 지표: ${selectedMetrics.join(', ')}`,
      performanceData ? `성과 데이터:\n${performanceData}` : '데이터 없음 - 리포트 템플릿과 분석 가이드를 작성해주세요.',
      analysis?.analysisAngles ? `분석 관점: ${(analysis.analysisAngles as string[]).join(', ')}` : '',
      '성과 요약, 문제점 진단, 개선 방안, 다음 주 액션아이템을 포함해주세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daAnalysis', reportType, metrics: selectedMetrics });
  };

  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      {step === 'input' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
            CEO님! DA 퍼포먼스를 분석하겠습니다.
            캠페인 정보와 성과 데이터를 알려주세요.
          </div>
          {error && <div className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2">{error}</div>}
          <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)}
            placeholder="캠페인명 / 프로젝트명" autoFocus
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

          <textarea value={performanceData} onChange={e => setPerformanceData(e.target.value)}
            placeholder="성과 데이터 붙여넣기 (노출수, 클릭수, 비용, 전환수 등) - 없으면 비워두세요" rows={4}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700 font-mono" />

          <div className="text-xs text-gray-500 font-medium">리포트 유형</div>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map(t => (
              <button key={t} onClick={() => setReportType(t)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${reportType === t ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">핵심 지표 (복수 선택)</div>
          <div className="flex flex-wrap gap-2">
            {METRICS_FOCUS.map(m => (
              <button key={m} onClick={() => toggleMetric(m)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedMetrics.includes(m) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {m}
              </button>
            ))}
          </div>

          <button onClick={analyze} disabled={!campaignName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
            📈 분석 구조 설계
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">분석 구조를 설계 중입니다...</p>
        </div>
      )}

      {step === 'result' && analysis && (
        <div className="p-5 space-y-4">
          {analysis.reportSections && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">리포트 섹션 구성</div>
              <div className="space-y-1">
                {(analysis.reportSections as string[]).map((s, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{i + 1}</span> {s}
                  </div>
                ))}
              </div>
            </>
          )}
          {analysis.optimizationAreas && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">최적화 영역</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.optimizationAreas as string[]).map((a, i) => (
                  <span key={i} className="bg-amber-900/20 text-amber-300 px-3 py-1 rounded-full text-xs">{a}</span>
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
            <div>캠페인: <span className="text-white">{campaignName}</span></div>
            <div>유형: <span className="text-sky-400">{reportType}</span> · 지표: <span className="text-emerald-400">{selectedMetrics.join(', ')}</span></div>
          </div>
          <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="추가 지시사항 (선택)" rows={2}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
          <div className="flex gap-2">
            <button onClick={() => setStep('result')} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">← 이전</button>
            <button onClick={submit} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">📈 리포트 작성 시작</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
