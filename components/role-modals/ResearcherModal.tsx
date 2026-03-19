'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const RESEARCH_TYPES = ['시장조사', '트렌드 분석', '경쟁사 분석', 'SWOT 분석'];
const DEPTHS = [
  { id: 'brief', label: '개요 (간단 요약)' },
  { id: 'detailed', label: '상세 리포트' },
  { id: 'deep', label: '심층 분석' },
];

export default function ResearcherModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [topic, setTopic] = useState('');
  const [researchType, setResearchType] = useState('');
  const [depth, setDepth] = useState('detailed');
  const [references, setReferences] = useState('');

  const submit = () => {
    if (!topic.trim() || !researchType) return;
    const instruction = [
      `연구 주제: ${topic}`,
      `조사 유형: ${researchType}`,
      `분석 깊이: ${DEPTHS.find(d => d.id === depth)?.label ?? depth}`,
      references ? `참고사항: ${references}` : '',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'research', researchType, depth });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 주제를 조사해 드릴까요?
        </div>

        <textarea value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="조사할 주제를 입력해주세요" autoFocus rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <div className="text-xs text-gray-500 font-medium">조사 유형</div>
        <div className="flex flex-wrap gap-2">
          {RESEARCH_TYPES.map(rt => (
            <button key={rt} onClick={() => setResearchType(rt)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                researchType === rt ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {rt}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">분석 깊이</div>
        <div className="space-y-1">
          {DEPTHS.map(d => (
            <button key={d.id} onClick={() => setDepth(d.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                depth === d.id ? 'bg-blue-600/20 border-blue-500 text-blue-300 border' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-750'
              }`}>
              {d.label}
            </button>
          ))}
        </div>

        <input type="text" value={references} onChange={e => setReferences(e.target.value)}
          placeholder="참고자료/출처 (선택사항)"
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!topic.trim() || !researchType}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🔍 조사 시작
        </button>
      </div>
    </ModalShell>
  );
}
