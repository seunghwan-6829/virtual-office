'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const RESEARCH_AREAS = ['시장 트렌드', '고객 니즈', '경쟁사 분석', '제품 장단점', '상세페이지 사례'];
const CATEGORIES = ['뷰티/화장품', '건강식품', '가전/전자', '패션/의류', '식품/음료', '생활용품', '서비스/구독', '기타'];

export default function SPPlannerModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [category, setCategory] = useState('뷰티/화장품');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['시장 트렌드', '경쟁사 분석', '제품 장단점']);
  const [extraNotes, setExtraNotes] = useState('');

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `카테고리: ${category}`,
      productInfo ? `상품 정보: ${productInfo}` : '',
      `조사 분야: ${selectedAreas.join(', ')}`,
      '',
      '[시장조사 수행 지침]',
      '1. 해당 제품/서비스의 시장 트렌드 및 고객 니즈를 파악하세요',
      '2. 제품의 장점과 단점을 객관적으로 분석하세요',
      '3. 비슷한 상품의 상세페이지 사례 3~4개를 조사하세요',
      '4. 타사(경쟁사) 상세페이지 구성 방식을 분석하세요',
      '5. 모든 데이터에 교차 검증을 수행하세요 (소스 3~4개 이상 확인)',
      '',
      '[주의] 허위 사실, 2년 이상 오래된 자료, 검증 안 된 통계 사용 금지',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spPlanner', category, areas: selectedAreas });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          시장 조사 및 리서치를 수행합니다. 상품 정보를 입력해주세요.
          <span className="text-blue-400 font-bold"> 교차 검증</span>을 통해 신뢰성 높은 데이터를 수집합니다.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={productInfo} onChange={e => setProductInfo(e.target.value)}
          placeholder="상품 특징, 가격대, 타겟 고객, 주요 소구점 등" rows={3}
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

        <div className="text-xs text-gray-500 font-medium">조사 분야 (복수 선택)</div>
        <div className="flex flex-wrap gap-2">
          {RESEARCH_AREAS.map(a => (
            <button key={a} onClick={() => toggleArea(a)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedAreas.includes(a) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {a}
            </button>
          ))}
        </div>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🔍 시장조사 시작
        </button>
      </div>
    </ModalShell>
  );
}
