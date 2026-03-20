'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const IMAGE_TYPES = ['히어로 메인 이미지', '제품 디테일 샷', '사용 장면 (라이프스타일)', '비포/애프터', '성분/원료 클로즈업', '패키지 목업'];
const STYLES = ['미니멀/클린', '고급/프리미엄', '내추럴/오가닉', '팝/비비드', '모던/테크', '감성/무드'];

export default function SPImageModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['히어로 메인 이미지']);
  const [style, setStyle] = useState('미니멀/클린');
  const [extraNotes, setExtraNotes] = useState('');

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      productDesc ? `상품 설명: ${productDesc}` : '',
      `필요 이미지 유형: ${selectedTypes.join(', ')}`,
      `비주얼 스타일: ${style}`,
      '',
      '각 이미지 유형별로 아래 내용을 포함해 기획해주세요:',
      '1. 이미지 컨셉 및 구도 설명',
      '2. 배경, 조명, 소품, 색감 방향',
      '3. Gemini 3 Pro Image에서 사용할 구체적인 이미지 생성 프롬프트 (영어)',
      '4. 상세페이지 내 배치 위치 및 기대 효과',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spImage', style, imageTypes: selectedTypes });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-800/30 rounded-xl p-3 text-sm text-gray-300">
          <span className="text-pink-400 font-bold">🎨 Gemini 3 Pro Image</span>
          <span className="text-gray-400 ml-1">로 상세페이지용 제품 이미지를 만들어드릴게요.</span>
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 border border-gray-700" />

        <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
          placeholder="상품 설명 (외형, 색상, 재질, 크기, 주요 특징 등)"
          rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">이미지 유형 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {IMAGE_TYPES.map(t => (
            <button key={t} onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedTypes.includes(t) ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">비주얼 스타일</div>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${style === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (브랜드 컬러, 참고 이미지 방향 등)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim() || selectedTypes.length === 0}
          className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-all">
          🎨 이미지 기획 시작 (Gemini 3 Pro)
        </button>
      </div>
    </ModalShell>
  );
}
