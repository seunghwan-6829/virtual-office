'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const FRAMEWORKS = ['AIDA', 'PAS', 'FAB', 'BAB', '스토리텔링'];
const PAGE_TYPES = ['단독 상품', '세트/번들', '서비스 소개', '구독형', '이벤트/프로모션'];

export default function SPPlannerModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [pageType, setPageType] = useState('단독 상품');
  const [framework, setFramework] = useState('AIDA');
  const [extraNotes, setExtraNotes] = useState('');

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      productInfo ? `상품 정보: ${productInfo}` : '',
      `페이지 유형: ${pageType}`,
      `프레임워크: ${framework}`,
      '섹션별 목적, 핵심 메시지, 예상 콘텐츠, 레이아웃 가이드를 포함한 상세 기획서를 작성해주세요.',
      '타겟 고객의 Pain Point와 추천 섹션 구성도 포함해주세요.',
      extraNotes ? `추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spPlanner', pageType, framework });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지를 기획할 상품 정보를 알려주세요.
        </div>
        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <textarea value={productInfo} onChange={e => setProductInfo(e.target.value)}
          placeholder="상품 특징, 가격대, 타겟 고객 등" rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <div className="text-xs text-gray-500 font-medium">페이지 유형</div>
        <div className="flex flex-wrap gap-2">
          {PAGE_TYPES.map(t => (
            <button key={t} onClick={() => setPageType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pageType === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 font-medium">프레임워크</div>
        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map(f => (
            <button key={f} onClick={() => setFramework(f)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${framework === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          📐 기획서 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
