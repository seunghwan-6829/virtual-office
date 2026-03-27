'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const STORYTELLING_TYPES = ['AIDA', 'PAS', 'FAB', 'Before/After', '문제-해결', '감성 스토리', '데이터 기반', '리뷰 중심'];
const SECTIONS = ['히어로', '문제 제기', '솔루션', '특장점', '사회적 증거', '비교 섹션', 'FAQ', 'CTA'];
const CATEGORIES = ['뷰티/화장품', '건강식품', '가전/전자', '패션/의류', '식품/음료', '생활용품', '서비스/구독'];

export default function PagePlanningModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [category, setCategory] = useState('뷰티/화장품');
  const [storytelling, setStorytelling] = useState('AIDA');
  const [selectedSections, setSelectedSections] = useState<string[]>(['히어로', '문제 제기', '솔루션', '특장점', '사회적 증거', 'CTA']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleSection = (s: string) => {
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `카테고리: ${category}`,
      productInfo ? `상품 정보: ${productInfo}` : '',
      `스토리텔링 구조: ${storytelling}`,
      `포함할 섹션: ${selectedSections.join(', ')}`,
      '',
      '[기획안 설계 지침]',
      '1. 타사(경쟁사) 상세페이지 구성 방식을 분석한 뒤 시작하세요',
      '2. 전반적인 상세페이지 플로우와 구성을 설계하세요',
      `3. ${storytelling} 스토리텔링 구조를 적용하되, 해당 제품에 최적화하세요`,
      '4. 각 섹션별 목적, 핵심 메시지, 예상 체류시간을 명시하세요',
      '5. 타사 대비 확실히 퀄리티가 높은 구성을 설계하세요',
      '',
      '충분히 상세하게 작성하세요 — 이 기획안이 전체 상세페이지의 뼈대가 됩니다.',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spImage', category, storytelling });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지 <span className="text-blue-400 font-bold">전체 플로우 & 스토리텔링</span>을 설계합니다.
          타사 분석을 기반으로 최고 퀄리티의 기획안을 만들어드릴게요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={productInfo} onChange={e => setProductInfo(e.target.value)}
          placeholder="상품 특징, 소구점, 타겟, 가격대 등 상세 정보" rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">카테고리</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">스토리텔링 구조</div>
        <div className="flex flex-wrap gap-2">
          {STORYTELLING_TYPES.map(s => (
            <button key={s} onClick={() => setStorytelling(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${storytelling === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">포함할 섹션 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => toggleSection(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedSections.includes(s) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          📐 기획안 설계 시작
        </button>
      </div>
    </ModalShell>
  );
}
