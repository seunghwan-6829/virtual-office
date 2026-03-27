'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const REVIEW_FOCUS = ['카피 톤 일관성', '후킹성 유지', '흐름/논리', '오탈자/문법', 'CTA 강도', '전환 유도력'];

export default function DACopyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [draftCopy, setDraftCopy] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['카피 톤 일관성', '후킹성 유지', '흐름/논리']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleFocus = (f: string) => {
    setSelectedFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `검토 포인트: ${selectedFocus.join(', ')}`,
      draftCopy ? `\n[검토할 기획안/카피]\n${draftCopy}` : '',
      '',
      '[중간 컨펌 지침]',
      '1. 전체 카피의 흐름과 일관성을 점검하세요',
      '2. 카피의 톤, 강도, 후킹성이 전구간에서 유지되는지 확인하세요',
      '3. 추가적인 보완이 필요한 부분을 수정하세요',
      '4. 오탈자, 문맥 오류, 논리적 비약을 체크하세요',
      '5. 보완된 기획안 + 수정 내역 요약을 함께 출력하세요',
      '',
      '[주의] 기반이 되는 스토리텔링 구조/흐름을 크게 변경하지 마세요',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daCopy', focus: selectedFocus });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지 <span className="text-amber-400 font-bold">중간 컨펌</span>을 진행합니다.
          기존 흐름을 유지하면서 부분적으로 개선합니다.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={draftCopy} onChange={e => setDraftCopy(e.target.value)}
          placeholder="검토할 기획안/카피를 붙여넣으세요 — 비워두면 상품 정보 기반으로 자체 점검을 수행합니다" rows={6}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">검토 포인트 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_FOCUS.map(f => (
            <button key={f} onClick={() => toggleFocus(f)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedFocus.includes(f) ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✅ 중간 컨펌 시작
        </button>
      </div>
    </ModalShell>
  );
}
