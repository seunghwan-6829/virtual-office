'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const VIDEO_TYPES = [
  { id: 'longform', label: 'YouTube 롱폼', icon: '📹' },
  { id: 'short', label: '숏폼/릴스', icon: '📱' },
  { id: 'tutorial', label: '교육/튜토리얼', icon: '📚' },
  { id: 'ad', label: '광고 영상', icon: '📺' },
];
const DURATIONS = ['30초', '1분', '3분', '5분', '10분+'];
const STYLES = ['내레이션', '토크 (말하기)', '스토리텔링', '인터뷰 형식'];

export default function VideoWriterModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [videoType, setVideoType] = useState('');
  const [duration, setDuration] = useState('');
  const [style, setStyle] = useState('');
  const [concept, setConcept] = useState('');

  const submit = () => {
    if (!videoType || !concept.trim()) return;
    const instruction = [
      `영상 유형: ${VIDEO_TYPES.find(v => v.id === videoType)?.label ?? videoType}`,
      duration ? `예상 길이: ${duration}` : '',
      style ? `스타일: ${style}` : '',
      `주제/컨셉: ${concept}`,
      '타임스탬프, 씬 구분, 내레이션/대사를 포함한 상세 스크립트를 작성해주세요.',
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'video', videoType, duration, style });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 영상 스크립트를 작성할까요?
        </div>

        <div className="text-xs text-gray-500 font-medium">영상 유형</div>
        <div className="grid grid-cols-2 gap-2">
          {VIDEO_TYPES.map(vt => (
            <button key={vt.id} onClick={() => setVideoType(vt.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                videoType === vt.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              <span>{vt.icon}</span> {vt.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">예상 길이</div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                duration === d ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {d}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">스타일</div>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                style === s ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <textarea value={concept} onChange={e => setConcept(e.target.value)}
          placeholder="영상 주제/컨셉을 입력해주세요" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!videoType || !concept.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          🎬 스크립트 작성 시작
        </button>
      </div>
    </ModalShell>
  );
}
