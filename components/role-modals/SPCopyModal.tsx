'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const ORG_STYLES = ['핵심 요약 중심', '카테고리별 분류', '우선순위별 정리', '비교 분석 중심', 'Q&A 구조'];
const FOCUS_AREAS = ['고객 니즈', '제품 USP', '경쟁사 비교', '시장 트렌드', '가격 전략'];

export default function SPCopyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [rawData, setRawData] = useState('');
  const [orgStyle, setOrgStyle] = useState('핵심 요약 중심');
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['고객 니즈', '제품 USP']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleFocus = (f: string) => {
    setSelectedFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `정리 스타일: ${orgStyle}`,
      `주요 포커스: ${selectedFocus.join(', ')}`,
      rawData ? `\n[정리할 원본 데이터]\n${rawData}` : '',
      '',
      '[데이터 정리 지침]',
      '1. 수집된 데이터를 논리적으로 분류 및 정리하세요',
      '2. 해당 상품과 잘 어울리는 데이터만 선별하고 논리적 설명을 추가하세요',
      '3. 다음 단계(기획안 설계) 담당자가 바로 작업에 들어갈 수 있도록 구성하세요',
      '4. 잘못된 자료가 없는지 최종 팩트 체크하세요',
      '',
      '[주의] 불필요하거나 과다한 정보 포함 금지 — 핵심만 추리세요',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spCopy', orgStyle, focus: selectedFocus });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          수집된 데이터를 <span className="text-blue-400 font-bold">논리적으로 분석·정리</span>합니다.
          기획안 설계자가 바로 작업할 수 있도록 구조화해드릴게요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={rawData} onChange={e => setRawData(e.target.value)}
          placeholder="정리할 원본 데이터를 붙여넣으세요 (시장조사 결과, 수집 자료 등) — 비워두면 상품 정보 기반으로 자체 분석합니다" rows={5}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">정리 스타일</div>
        <div className="flex flex-wrap gap-2">
          {ORG_STYLES.map(s => (
            <button key={s} onClick={() => setOrgStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${orgStyle === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">포커스 영역 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map(f => (
            <button key={f} onClick={() => toggleFocus(f)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedFocus.includes(f) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          📊 데이터 정리 시작
        </button>
      </div>
    </ModalShell>
  );
}
