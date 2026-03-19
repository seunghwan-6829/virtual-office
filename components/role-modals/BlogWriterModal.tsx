'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

type Step = 'topic' | 'analyzing' | 'keywords' | 'confirm';

interface AnalysisResult {
  keywords?: string[];
  angles?: string[];
  targetAudience?: string;
  estimatedLength?: string;
  outline?: string[];
}

export default function BlogWriterModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [extraNotes, setExtraNotes] = useState('');
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!topic.trim()) return;
    setStep('analyzing');
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), roleKey: 'blog' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
      setSelectedKeywords(data.keywords?.slice(0, 3) ?? []);
      setStep('keywords');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '분석 실패');
      setStep('topic');
    }
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw],
    );
  };

  const submit = () => {
    const instruction = [
      `블로그 주제: ${topic}`,
      selectedKeywords.length > 0 ? `키워드: ${selectedKeywords.join(', ')}` : '',
      analysis?.outline ? `추천 구성: ${analysis.outline.join(' > ')}` : '',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');

    startTask(worker.id, instruction, {
      roleKey: 'blog', topic, keywords: selectedKeywords,
      outline: analysis?.outline,
    });
  };

  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      {step === 'topic' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
            안녕하세요 CEO님! <strong>{worker.name}</strong>입니다.
            어떤 주제로 블로그를 작성할까요? 주제를 말씀해주시면 먼저 키워드와 구성을 분석해드리겠습니다.
          </div>
          {error && <div className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2">{error}</div>}
          <textarea
            value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="예: AI 시대의 개인 브랜딩 전략" autoFocus rows={3}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700"
          />
          <button onClick={analyze} disabled={!topic.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
            주제 분석하기
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">주제를 분석 중입니다...</p>
        </div>
      )}

      {step === 'keywords' && analysis && (
        <div className="p-5 space-y-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">추천 키워드</div>
          <div className="flex flex-wrap gap-2">
            {(analysis.keywords ?? []).map(kw => (
              <button key={kw} onClick={() => toggleKeyword(kw)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedKeywords.includes(kw)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}>
                {kw}
              </button>
            ))}
          </div>

          {analysis.angles && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">접근 각도</div>
              <div className="space-y-1">
                {analysis.angles.map((a, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300">💡 {a}</div>
                ))}
              </div>
            </>
          )}

          {analysis.outline && (
            <>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">추천 목차</div>
              <ol className="list-decimal list-inside space-y-1">
                {analysis.outline.map((item, i) => (
                  <li key={i} className="text-xs text-gray-300">{item}</li>
                ))}
              </ol>
            </>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            {analysis.targetAudience && <span>타겟: {analysis.targetAudience}</span>}
            {analysis.estimatedLength && <span>· {analysis.estimatedLength}</span>}
          </div>

          <button onClick={() => setStep('confirm')}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
            다음: 추가 지시사항
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="p-5 space-y-4">
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
            <div>주제: <span className="text-white">{topic}</span></div>
            <div>키워드: <span className="text-blue-400">{selectedKeywords.join(', ') || '없음'}</span></div>
          </div>
          <textarea
            value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="추가 지시사항이 있으시면 입력해주세요 (선택사항)" rows={2}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep('keywords')}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">
              ← 이전
            </button>
            <button onClick={submit}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">
              ✍️ 작성 시작
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
