'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const FINAL_FOCUS = ['카피 완성도', '후킹성 강화', '전환 유도력', '흐름 일관성', '데이터 반영', 'CTA 최적화'];

export default function DACreativeModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [fullDraft, setFullDraft] = useState('');
  const [weaknessReport, setWeaknessReport] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['카피 완성도', '후킹성 강화', '전환 유도력']);
  const [generateB, setGenerateB] = useState(true);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleFocus = (f: string) => {
    setSelectedFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `최종 포커스: ${selectedFocus.join(', ')}`,
      fullDraft ? `\n[최종 검토할 기획안]\n${fullDraft}` : '',
      weaknessReport ? `\n[약점 분석 리포트]\n${weaknessReport}` : '',
      '',
      '[최종 컨펌 지침 — A안]',
      '1. 약점 분석 리포트의 지적 사항 중 타당한 것을 반영하세요',
      '2. 전체 기획안의 완성도를 높이는 최종 수정을 진행하세요',
      '3. 카피의 일관성, 후킹성, 전환 유도력을 최종 점검하세요',
      '4. 수정하기 전에 충분히 고민하세요 — 모든 단계의 마무리입니다',
      '',
      generateB ? [
        '[B안 작성 지침]',
        'A안 작성 후, 동일한 데이터/목표를 기반으로 접근 방식만 다르게 한 B안도 작성하세요.',
        '- 스토리텔링 구조, 톤앤매너, 후킹 방식을 차별화',
        '- 내용이 산으로 가면 절대 안 됨 — 핵심 메시지 유지',
        '',
        '=== A안 ===',
        '(최종 수정본 작성)',
        '',
        '=== B안 ===',
        '(변형본 작성)',
      ].join('\n') : '',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daCreative', focus: selectedFocus, generateB });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          <span className="text-green-400 font-bold">최종 컨펌 + A/B안</span> 작업을 수행합니다.
          신중하게 검토한 후 최종 기획안을 확정합니다.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={fullDraft} onChange={e => setFullDraft(e.target.value)}
          placeholder="최종 검토할 기획안/카피 전문을 붙여넣으세요" rows={5}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={weaknessReport} onChange={e => setWeaknessReport(e.target.value)}
          placeholder="약점 분석 리포트를 붙여넣으세요 (선택)" rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">최종 포커스 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {FINAL_FOCUS.map(f => (
            <button key={f} onClick={() => toggleFocus(f)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedFocus.includes(f) ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={generateB} onChange={e => setGenerateB(e.target.checked)}
            className="rounded bg-gray-800 border-gray-600" />
          <span className="text-xs text-gray-400">B안 (변형본) 함께 생성</span>
        </label>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🏆 최종 컨펌 시작
        </button>
      </div>
    </ModalShell>
  );
}
