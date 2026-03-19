'use client';

import { useState } from 'react';
import { Worker } from '@/lib/types';
import { useOfficeStore } from '@/lib/store';
import ModalShell from './ModalShell';

const CHANNELS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'youtube', label: 'YouTube', icon: '📹' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'x', label: 'X (Twitter)', icon: '𝕏' },
];

const CONTENT_TYPES = ['피드 게시물', '스토리', '릴스/숏폼', '캐러셀'];
const TONES = ['캐주얼', '전문적', '트렌디', '감성적'];

export default function SNSManagerModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const startTask = useOfficeStore(s => s.startTask);
  const [channel, setChannel] = useState('');
  const [contentType, setContentType] = useState('');
  const [tone, setTone] = useState('');
  const [topic, setTopic] = useState('');

  const submit = () => {
    if (!channel || !topic.trim()) return;
    const instruction = [
      `채널: ${channel}`,
      contentType ? `콘텐츠 유형: ${contentType}` : '',
      tone ? `톤/분위기: ${tone}` : '',
      `주제/내용: ${topic}`,
    ].filter(Boolean).join('\n');
    startTask(worker.id, instruction, { roleKey: 'sns', channel, contentType, tone });
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
          CEO님! 어떤 채널에 콘텐츠를 올릴까요?
        </div>

        <div className="text-xs text-gray-500 font-medium">채널 선택</div>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setChannel(ch.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                channel === ch.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              <span>{ch.icon}</span> {ch.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">콘텐츠 유형</div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(ct => (
            <button key={ct} onClick={() => setContentType(ct)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                contentType === ct ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {ct}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">톤/분위기</div>
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

        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-500">
          📊 트렌드 데이터 연동 (준비 중)
        </div>

        <textarea value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="콘텐츠 주제/브랜드를 입력해주세요" rows={2}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />

        <button onClick={submit} disabled={!channel || !topic.trim()}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
          ✍️ 콘텐츠 제작 시작
        </button>
      </div>
    </ModalShell>
  );
}
