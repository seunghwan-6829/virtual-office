'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const TONES = ['신뢰감', '긴급/한정', '감성/공감', '데이터/논리', '유머러스', '프리미엄'];
const HOOK_TRIGGERS = ['호기심', '공포/불안', '이익/혜택', '사회적 증거', '긴급성', '반전/의외'];
const SECTIONS = ['히어로 (메인 카피)', '문제 제기', '솔루션 섹션', '특장점 섹션', '사회적 증거', 'CTA 버튼', '전체 페이지'];

export default function SPCROModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [productName, setProductName] = useState('');
  const [planDraft, setPlanDraft] = useState('');
  const [tone, setTone] = useState('신뢰감');
  const [hookTrigger, setHookTrigger] = useState('호기심');
  const [section, setSection] = useState('전체 페이지');
  const [extraNotes, setExtraNotes] = useState('');

  const submit = () => {
    if (!productName.trim()) return;
    const instruction = [
      `상품명: ${productName}`,
      `톤 앤 매너: ${tone}`,
      `후킹 심리 트리거: ${hookTrigger}`,
      `작성 범위: ${section}`,
      planDraft ? `\n[기획안/플로우 참조]\n${planDraft}` : '',
      '',
      '[카피라이팅 지침]',
      '1. 기획안의 스토리텔링 구조를 기반으로 전체 카피를 작성하세요',
      '2. 상세페이지 초반 후킹성을 강하게 설계하세요 (첫 3초 승부)',
      '3. 중간중간 지루해질 타이밍에 후킹 요소를 배치하세요',
      '4. 섹션별 헤드라인, 서브헤드, 본문, CTA를 구분하여 작성하세요',
      `5. ${hookTrigger} 심리 트리거를 적극 활용하세요`,
      '',
      '[핵심] 이탈율↓ = 전환율↑ — 카피가 지루해지면 이탈율 급증합니다',
      extraNotes ? `\n추가 지시: ${extraNotes}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'spCRO', tone, hookTrigger, section });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          상세페이지 <span className="text-red-400 font-bold">카피 + 후킹 문구</span>를 작성합니다.
          이탈율을 줄이고 전환율을 높이는 카피를 만들어드릴게요.
        </div>

        <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="상품명 / 서비스명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <textarea value={planDraft} onChange={e => setPlanDraft(e.target.value)}
          placeholder="기획안/플로우를 붙여넣으세요 (선택) — 비워두면 상품 정보 기반으로 자체 카피를 작성합니다" rows={4}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">작성 범위</div>
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
