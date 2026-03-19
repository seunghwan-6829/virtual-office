'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const PLATFORMS = ['Meta (1080x1080)', 'Meta 스토리 (1080x1920)', 'Google GDN (300x250)', 'Google GDN (728x90)', '네이버 GFA (1200x628)', '카카오 (720x720)', 'YouTube 썸네일 (1280x720)'];
const STYLES = ['모던/미니멀', '팝/컬러풀', '고급/프리미엄', '포토 중심', '일러스트', '텍스트 강조'];
const PURPOSES = ['신규 고객 유입', '리타겟팅', '프로모션/세일', '브랜드 인지도', '앱 설치'];

export default function DACreativeModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [brief, setBrief] = useState('');
  const [platform, setPlatform] = useState('Meta (1080x1080)');
  const [style, setStyle] = useState('모던/미니멀');
  const [purpose, setPurpose] = useState('신규 고객 유입');
  const [variations, setVariations] = useState(3);

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품/서비스: ${productName}`,
      brief ? `디자인 브리프: ${brief}` : '',
      `매체/사이즈: ${platform}`,
      `디자인 스타일: ${style}`,
      `광고 목적: ${purpose}`,
      `${variations}개 변형안을 제안해주세요.`,
      '각 소재별로: 레이아웃 구성, 카피 배치, 색상 팔레트, 이미지 방향, CTA 버튼 디자인을 상세히 기술해주세요.',
      '각 변형안의 예상 CTR 개선 포인트도 설명해주세요.',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daCreative', platform, style, purpose });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 광고 소재를 디자인하겠습니다.
          상품과 매체 정보를 알려주세요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={brief} onChange={e => setBrief(e.target.value)}
          placeholder="디자인 브리프 (브랜드 컬러, 분위기, 포함할 요소 등)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">매체 / 사이즈</div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${platform === p ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">디자인 스타일</div>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${style === s ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">광고 목적</div>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map(p => (
            <button key={p} onClick={() => setPurpose(p)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${purpose === p ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">변형안 수:</span>
          {[2, 3, 5].map(n => (
            <button key={n} onClick={() => setVariations(n)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${variations === n ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {n}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🎨 소재 디자인 시작
        </button>
      </div>
    </ModalShell>
  );
}
