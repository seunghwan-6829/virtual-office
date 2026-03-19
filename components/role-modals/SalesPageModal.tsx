'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const SECTIONS = ['히어로 (메인 카피)', '특장점 나열', 'CTA (행동유도)', 'FAQ', '후기 유도', '전체 페이지'];
const PLATFORMS = ['스마트스토어', '쿠팡', '자사몰', '기타'];

export default function SalesPageModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [features, setFeatures] = useState('');
  const [section, setSection] = useState('전체 페이지');
  const [platform, setPlatform] = useState('');
  const [conversionFocus, setConversionFocus] = useState(true);

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      features ? `특징/장점: ${features}` : '',
      `페이지 섹션: ${section}`,
      platform ? `타겟 플랫폼: ${platform}` : '',
      conversionFocus ? '전환율 최적화에 집중해주세요.' : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'salesPage', section, platform });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 상품의 상세페이지 카피를 작성할까요?
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={features} onChange={e => setFeatures(e.target.value)}
          placeholder="상품 특징, 장점, 가격대 등" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">페이지 섹션</div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                section === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">플랫폼</div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                platform === p ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {p}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conversionFocus} onChange={e => setConversionFocus(e.target.checked)}
            className="rounded bg-gray-800 border-gray-600" />
          <span className="text-xs text-gray-400">전환율 최적화 포커스</span>
        </label>

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✍️ 상세페이지 카피 작성
        </button>
      </div>
    </ModalShell>
  );
}
