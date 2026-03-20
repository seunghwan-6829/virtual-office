'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const REPORT_TYPES = ['주간 리포트', '월간 리포트', '캠페인 성과 분석', '소재별 비교 분석', '채널별 비교 분석'];
const METRICS_FOCUS = ['ROAS', 'CTR', 'CPC/CPA', 'CPM', '전환율', 'LTV'];

export default function DAAnalysisModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [campaignName, setCampaignName] = useState('');
  const [performanceData, setPerformanceData] = useState('');
  const [reportType, setReportType] = useState('주간 리포트');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['ROAS', 'CTR']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleMetric = (m: string) => {
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const submit = () => {
    if (!campaignName.trim()) return;
    const instruction = [
      `캠페인: ${campaignName}`,
      `리포트 유형: ${reportType}`,
      `핵심 지표: ${selectedMetrics.join(', ')}`,
      performanceData ? `성과 데이터:\n${performanceData}` : '데이터 없음 - 리포트 템플릿과 분석 가이드를 작성해주세요.',
      '성과 요약, 문제점 진단, 개선 방안, 다음 주 액션아이템을 포함해주세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daAnalysis', reportType, metrics: selectedMetrics });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          DA 퍼포먼스를 분석하겠습니다. 캠페인 정보를 알려주세요.
        </div>
        <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)}
          placeholder="캠페인명 / 프로젝트명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={performanceData} onChange={e => setPerformanceData(e.target.value)}
          placeholder="성과 데이터 붙여넣기 (노출수, 클릭수, 비용, 전환수 등) - 없으면 비워두세요" rows={3}
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

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!campaignName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          📈 리포트 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
