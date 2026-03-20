'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const SECTIONS = ['히어로 (메인 카피)', '서브 헤드라인', '특장점 섹션', 'CTA 버튼 문구', 'FAQ', '후기 유도', '전체 페이지'];
const TONES = ['신뢰감', '긴급/한정', '감성/공감', '데이터/논리', '유머러스'];
const HOOK_TRIGGERS = ['호기심', '공포/불안', '이익/혜택', '사회적 증거', '긴급성', '반전/의외'];

export default function SPCopyModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [section, setSection] = useState('전체 페이지');
  const [tone, setTone] = useState('신뢰감');
  const [hookTrigger, setHookTrigger] = useState('호기심');
  const [multiVersion, setMultiVersion] = useState(true);
  const [extraNotes, setExtraNotes] = useState('');

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      productInfo ? `상품 정보: ${productInfo}` : '',
      `작성 섹션: ${section}`,
      `톤 앤 매너: ${tone}`,
      `후킹 심리 트리거: ${hookTrigger}`,
      '',
      '== 카피 작성 ==',
      '헤드라인, 서브헤드, 본문, CTA를 구분하여 작성해주세요.',
      multiVersion ? '각 섹션별 2~3개 버전의 카피를 제안해주세요.' : '',
      '',
      '== 후킹 문구 ==',
      '스크롤을 멈추게 하는 강력한 후킹 문구를 5개 이상 작성해주세요.',
      '각 후킹 문구에 대해 효과 예측과 사용 위치를 명시하세요.',
      '상단 3초 안에 이탈을 방지하는 오프닝 전략도 포함해주세요.',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spCopy', section, tone, hookTrigger });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지 <span className="text-blue-400 font-bold">카피 + 후킹 문구</span>를 한번에 작성해드릴게요.
        </div>
        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
        <textarea value={productInfo} onChange={e => setProductInfo(e.target.value)}
          placeholder="상품 특징, USP, 타겟 고객, 가격대 등" rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">작성 섹션</div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${section === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">톤 앤 매너</div>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${tone === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">후킹 심리 트리거</div>
        <div className="flex flex-wrap gap-2">
          {HOOK_TRIGGERS.map(t => (
            <button key={t} onClick={() => setHookTrigger(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${hookTrigger === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={multiVersion} onChange={e => setMultiVersion(e.target.checked)}
            className="rounded bg-gray-800 border-gray-600" />
          <span className="text-xs text-gray-400">다중 버전 제안 (A/B 테스트용)</span>
        </label>

        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
          placeholder="추가 지시사항 (선택)" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!productName.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✍️ 카피 + 후킹 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
