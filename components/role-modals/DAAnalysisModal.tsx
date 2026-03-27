'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const REVIEW_ANGLES = ['전환율 리스크', '이탈율 높을 구간', '카피 약점', '후킹 부족 구간', '논리적 비약', 'CTA 효과'];

export default function DAAnalysisModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [draftCopy, setDraftCopy] = useState('');
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['전환율 리스크', '이탈율 높을 구간', '카피 약점']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleAngle = (a: string) => {
    setSelectedAngles(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `분석 관점: ${selectedAngles.join(', ')}`,
      draftCopy ? `\n[검토할 기획안]\n${draftCopy}` : '',
      '',
      '[약점 분석 지침]',
      '1. 전체 기획안의 약점을 분석하세요',
      '2. 전환율에 영향을 미칠 수 있는 문제점을 지적하세요',
      '3. 이탈율을 높일 수 있는 구간을 식별하세요',
      '4. 각 문제점에 대한 개선 방향을 제안하세요',
      '',
      '[핵심 규칙]',
      '- 이상하다고 무조건 잘라내라고 하지 마세요',
      '- 단점이 없으면 "특별한 약점이 발견되지 않았습니다"라고 솔직하게 답하세요',
      '- 사소한 부분을 과장해서 큰 문제로 만들지 마세요',
      '- 삭제가 아닌 보완 방향을 제시하세요',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daAnalysis', angles: selectedAngles });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          기획안의 <span className="text-orange-400 font-bold">약점과 문제점</span>을 솔직하게 분석합니다.
          과장 없이 실질적인 개선 포인트만 짚어드릴게요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={draftCopy} onChange={e => setDraftCopy(e.target.value)}
          placeholder="검토할 기획안/카피를 붙여넣으세요 — 비워두면 상품 정보 기반으로 잠재 리스크를 분석합니다" rows={6}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">분석 관점 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_ANGLES.map(a => (
            <button key={a} onClick={() => toggleAngle(a)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedAngles.includes(a) ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {a}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🔎 약점 분석 시작
        </button>
      </div>
    </ModalShell>
  );
}
