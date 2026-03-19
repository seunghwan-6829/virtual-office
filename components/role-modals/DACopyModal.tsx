'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const PLATFORMS = ['Meta (FB/IG)', 'Google Ads', '네이버 SA', '네이버 DA (GFA)', '카카오모먼트', 'TikTok'];
const AD_TYPES = ['이미지 광고', '카루셀/슬라이드', '동영상 광고', '검색 광고', '리마케팅'];
const TONES = ['직접적/세일즈', '감성/스토리', '유머/위트', '긴급/한정', '전문적/신뢰'];

export default function DACopyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productUSP, setProductUSP] = useState('');
  const [platform, setPlatform] = useState('Meta (FB/IG)');
  const [adType, setAdType] = useState('이미지 광고');
  const [tone, setTone] = useState('직접적/세일즈');
  const [versions, setVersions] = useState(3);

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품/서비스: ${productName}`,
      productUSP ? `USP/핵심 셀링포인트: ${productUSP}` : '',
      `광고 매체: ${platform}`,
      `광고 유형: ${adType}`,
      `톤 앤 매너: ${tone}`,
      `${versions}개 버전의 광고 카피를 작성해주세요.`,
      '각 버전마다 헤드라인, 본문, CTA, 디스크립션을 구분해주세요.',
      `${platform}의 글자수 제한을 반영해주세요.`,
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'daCopy', platform, adType, tone });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 임팩트 있는 광고 카피를 만들어드릴게요.
          매체와 상품 정보를 알려주세요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={productUSP} onChange={e => setProductUSP(e.target.value)}
          placeholder="핵심 셀링포인트, 프로모션 정보, 타겟 등" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">광고 매체</div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${platform === p ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">광고 유형</div>
        <div className="flex flex-wrap gap-2">
          {AD_TYPES.map(t => (
            <button key={t} onClick={() => setAdType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${adType === t ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">톤 앤 매너</div>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${tone === t ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">버전 수:</span>
          {[2, 3, 5].map(n => (
            <button key={n} onClick={() => setVersions(n)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${versions === n ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {n}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✍️ 광고 카피 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
