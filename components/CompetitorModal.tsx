'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { CompetitorInput } from '@/lib/types';
import { analyzeCompetitor } from '@/lib/orchestrator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  onComplete: (data: CompetitorInput, analysis: string) => void;
}

export default function CompetitorModal({ onComplete }: Props) {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [form, setForm] = useState<CompetitorInput>({
    url: '', brandName: '', productName: '', strengths: '', weaknesses: '', notes: '',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');

  if (modal.type !== 'competitor') return null;

  const canAnalyze = form.brandName.trim() || form.strengths.trim();

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    const res = await analyzeCompetitor(form);
    setResult(res);
    setAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">🔍 경쟁사 분석</h3>
            <p className="text-gray-500 text-xs mt-0.5">경쟁사 정보를 입력하면 AI가 분석하고 프로젝트에 반영합니다</p>
          </div>
          <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">경쟁 브랜드명 *</label>
              <input value={form.brandName}
                onChange={e => setForm({ ...form, brandName: e.target.value })}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
                placeholder="예: 닥터자르트" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">경쟁 상품명</label>
              <input value={form.productName}
                onChange={e => setForm({ ...form, productName: e.target.value })}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
                placeholder="예: 시카페어 세럼" />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">참고 URL</label>
            <input value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
              placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">경쟁사 강점</label>
              <textarea value={form.strengths}
                onChange={e => setForm({ ...form, strengths: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 resize-none"
                placeholder="가격 경쟁력, 브랜드 인지도..." />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">경쟁사 약점 (활용 가능)</label>
              <textarea value={form.weaknesses}
                onChange={e => setForm({ ...form, weaknesses: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 resize-none"
                placeholder="성분 미표기, CS 불만..." />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">추가 메모</label>
            <textarea value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 resize-none"
              placeholder="기타 참고사항..." />
          </div>

          {result && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="text-green-400 text-xs font-bold mb-2">AI 분석 결과</h4>
              <div className="report-content text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-2">
          {!result ? (
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl text-sm font-bold transition-all"
            >
              {analyzing ? '🔍 분석 중...' : '🔍 AI 경쟁사 분석 실행'}
            </button>
          ) : (
            <button
              onClick={() => { onComplete(form, result); closeModal(); }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold transition-all"
            >
              ✅ 프로젝트에 반영하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
