'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const PROJECT_TYPES = ['광고 카피', '슬로건', '캐치프레이즈', '브랜드 네이밍'];
const TARGETS = ['2030 MZ세대', '3040 직장인', '5060 시니어', '전연령'];
const TONES = ['위트있는', '감성적', '강렬한', '신뢰감'];

export default function CopywriterModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [projectType, setProjectType] = useState('');
  const [brand, setBrand] = useState('');
  const [target, setTarget] = useState('');
  const [tone, setTone] = useState('');

  const submit = () => {
    if (!brand.trim() || !projectType) return;
    const instruction = [
      `프로젝트 유형: ${projectType}`,
      `브랜드/제품: ${brand}`,
      target ? `타겟 고객: ${target}` : '',
      tone ? `톤 앤 매너: ${tone}` : '',
      '여러 버전의 카피를 제안해주세요.',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'copy', projectType, target, tone });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 카피를 만들어 드릴까요?
        </div>

        <div className="text-xs text-gray-500 font-medium">프로젝트 유형</div>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(pt => (
            <button key={pt} onClick={() => setProjectType(pt)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                projectType === pt ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {pt}
            </button>
          ))}
        </div>

        <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
          placeholder="브랜드 또는 제품명" autoFocus
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">타겟 고객</div>
        <div className="flex flex-wrap gap-2">
          {TARGETS.map(t => (
            <button key={t} onClick={() => setTarget(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                target === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">톤 앤 매너</div>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                tone === t ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!brand.trim() || !projectType}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✍️ 카피 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
