'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import { completeImageWorkAndDeliver } from '@/lib/orchestrator';
import ModalShell from './ModalShell';

const IMAGE_TYPES = ['히어로 제품 이미지', '디테일 샷', '사용 장면', '비포/애프터', '라이프스타일', '패키지/구성품'];
const STYLES = ['깔끔/미니멀', '고급/프리미엄', '자연/내추럴', '팝/비비드', '모던/세련', '따뜻/감성'];

export default function DAStrategyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['히어로 제품 이미지', '디테일 샷', '사용 장면']);
  const [style, setStyle] = useState('깔끔/미니멀');
  const [extraNotes, setExtraNotes] = useState('');

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      productDesc ? `상품 설명: ${productDesc}` : '',
      `필요한 이미지 유형: ${selectedTypes.join(', ')}`,
      `이미지 스타일: ${style}`,
      '',
      '[AI 이미지 생성 기획 지침]',
      '1. 각 이미지 유형별 상세한 AI 생성 프롬프트(영어)를 작성하세요',
      '2. 다양한 각도와 확대 사진 활용 방안을 제시하세요',
      '3. 불필요한 배경/요소 제거 가이드를 포함하세요',
      '4. 제품의 핵심 셀링포인트가 시각적으로 드러나도록 기획하세요',
      '',
      '[주의] AI가 이미지를 잘 인식할 수 있도록 명확하고 구체적인 프롬프트 작성',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daStrategy', imageTypes: selectedTypes, style });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지용 <span className="text-cyan-400 font-bold">AI 제품 이미지</span>를 기획합니다.
          제품 촬영 대신 AI 이미지로 활용할 수 있도록 기획서를 만들어드릴게요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
          placeholder="제품 외형, 색상, 재질, 사이즈 등 시각적 특징" rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">필요한 이미지 유형 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {IMAGE_TYPES.map(t => (
            <button key={t} onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedTypes.includes(t) ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">이미지 스타일</div>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${style === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🖼️ AI 이미지 기획 시작
        </button>
      </div>
    </ModalShell>
  );
}
