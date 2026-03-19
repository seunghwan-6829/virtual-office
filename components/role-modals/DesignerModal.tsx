'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const STYLES = [
  { id: 'realistic', label: '사실적 (포토)', icon: '📷' },
  { id: 'illustration', label: '일러스트', icon: '🎨' },
  { id: 'minimal', label: '미니멀', icon: '◻️' },
  { id: '3d', label: '3D 렌더', icon: '🧊' },
];
const RATIOS = ['1:1 (정사각)', '16:9 (와이드)', '9:16 (세로)', '4:3 (표준)'];

export default function DesignerModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState('');
  const [ratio, setRatio] = useState('');

  const submit = () => {
    if (!brief.trim()) return;
    const instruction = [
      `디자인 브리프: ${brief}`,
      style ? `스타일: ${STYLES.find(s => s.id === style)?.label ?? style}` : '',
      ratio ? `사이즈/비율: ${ratio}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'designer', style, ratio, useImageGen: true });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 디자인을 만들어 드릴까요? <span className="text-blue-400">Gemini 이미지 생성</span>으로 제작합니다.
        </div>

        <textarea value={brief} onChange={e => setBrief(e.target.value)}
          placeholder="디자인 브리프를 상세히 작성해주세요\n예: 테크 스타트업 랜딩페이지 히어로 이미지, 미래적인 느낌" autoFocus rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">스타일</div>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                style === s.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">사이즈/비율</div>
        <div className="flex flex-wrap gap-2">
          {RATIOS.map(r => (
            <button key={r} onClick={() => setRatio(r)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                ratio === r ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {r}
            </button>
          ))}
        </div>

        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-blue-300">
          💡 Gemini 3 Pro Image API를 사용합니다. 환경변수 <code>GOOGLE_GENERATIVE_AI_API_KEY</code>가 필요합니다.
        </div>

        <button onClick={submit} disabled={!brief.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🎨 디자인 생성 시작
        </button>
      </div>
    </ModalShell>
  );
}
