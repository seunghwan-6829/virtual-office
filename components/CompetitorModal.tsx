'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { CompetitorInput } from '@/lib/types';
import { analyzeCompetitor } from '@/lib/orchestrator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};

interface Props {
  onComplete: (data: CompetitorInput, analysis: string) => void;
}

type Phase = 'form' | 'done';

export default function CompetitorModal({ onComplete }: Props) {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [form, setForm] = useState<CompetitorInput>({
    url: '', brandName: '', productName: '', strengths: '', weaknesses: '', notes: '',
  });
  const [phase, setPhase] = useState<Phase>('form');
  const [result, setResult] = useState('');

  if (modal.type !== 'competitor') return null;

  const canAnalyze = form.brandName.trim() || form.strengths.trim();

  const handleSubmit = () => {
    if (!canAnalyze) return;
    const input = { ...form };
    closeModal();

    useOfficeStore.getState().setSpeechBubble(
      useOfficeStore.getState().workers.find(w => w.roleKey === 'manager' && !w.isManager)?.id ?? '',
      '경쟁사 분석 중...', 10000,
    );

    analyzeCompetitor(input).then(res => {
      onComplete(input, res);
      setResult(res);
      setPhase('done');
    });
  };

  const handleViewResult = () => {
    setPhase('form');
    setResult('');
  };

  if (phase === 'done' && result) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">🔍 경쟁사 분석</h3>
            <p className="text-gray-500 text-xs mt-0.5">경쟁사 정보를 입력하면 AI가 백그라운드에서 분석합니다</p>
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
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleSubmit}
            disabled={!canAnalyze}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl text-sm font-bold transition-all"
          >
            🔍 분석 요청 후 닫기
          </button>
          <p className="text-gray-600 text-[10px] text-center mt-1.5">분석이 완료되면 화면 우측 상단에 알림이 표시됩니다</p>
        </div>
      </div>
    </div>
  );
}

export function CompetitorResultNotification() {
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__showCompetitorResult = (res: string) => {
      setResult(res);
      setVisible(true);
    };
  }

  if (!visible) return null;

  if (showDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) { setShowDetail(false); setVisible(false); } }}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-bold">🔍 경쟁사 분석 결과</h3>
            <button onClick={() => { setShowDetail(false); setVisible(false); }}
              className="text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 report-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{result}</ReactMarkdown>
          </div>
          <div className="p-4 border-t border-gray-800">
            <button onClick={() => { setShowDetail(false); setVisible(false); }}
              className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors">
              확인 완료
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <button onClick={() => setShowDetail(true)}
        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-all hover:scale-105">
        <span className="text-sm">🔍</span>
        <span className="text-xs font-bold">경쟁사 분석 완료!</span>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </button>
    </div>
  );
}
