'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const CONTENT_TYPES = ['블로그 포스트', '상세페이지', '랜딩페이지', '키워드 분석만'];
const ANALYSIS_OPTIONS = ['키워드 난이도 분석', '검색량 추정', '롱테일 키워드 추천', 'SEO 최적화 콘텐츠'];

export default function SEOExpertModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [keywords, setKeywords] = useState('');
  const [contentType, setContentType] = useState('');
  const [analyses, setAnalyses] = useState<string[]>(['SEO 최적화 콘텐츠']);

  const toggleAnalysis = (a: string) => {
    setAnalyses(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const submit = () => {
    if (!keywords.trim()) return;
    const instruction = [
      `타겟 키워드: ${keywords}`,
      contentType ? `콘텐츠 유형: ${contentType}` : '',
      `분석 항목: ${analyses.join(', ')}`,
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'seo', contentType, analyses });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 키워드를 분석하고 최적화할까요?
        </div>

        <textarea value={keywords} onChange={e => setKeywords(e.target.value)}
          placeholder="타겟 키워드를 입력해주세요 (쉼표로 구분, 최대 5개)" autoFocus rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">콘텐츠 유형</div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(ct => (
            <button key={ct} onClick={() => setContentType(ct)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                contentType === ct ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {ct}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">분석 항목</div>
        <div className="space-y-1">
          {ANALYSIS_OPTIONS.map(a => (
            <button key={a} onClick={() => toggleAnalysis(a)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                analyses.includes(a) ? 'bg-green-600/20 border-green-500 text-green-300 border' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-750'
              }`}>
              {analyses.includes(a) ? '✓' : '○'} {a}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!keywords.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🔍 SEO 분석 시작
        </button>
      </div>
    </ModalShell>
  );
}
