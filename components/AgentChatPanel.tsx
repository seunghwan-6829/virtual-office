'use client';

import { useState, useRef, useEffect } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { addIntervention } from '@/lib/orchestrator';

const TYPE_ICONS: Record<string, string> = {
  handoff: '📦', feedback: '🔄', question: '❓', approval: '✅',
  status: '📢', user_intervention: '🎯', dialogue: '💬',
};

export default function AgentChatPanel() {
  const chatOpen = useOfficeStore(s => s.chatPanelOpen);
  const setChatOpen = useOfficeStore(s => s.setChatPanelOpen);
  const project = useOfficeStore(s => s.project);
  const workers = useOfficeStore(s => s.workers);
  const [input, setInput] = useState('');
  const [targetPhaseId, setTargetPhaseId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = project?.messages ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="fixed left-4 bottom-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg flex items-center justify-center text-white text-xl hover:scale-110 transition-transform"
        title="에이전트 채팅"
      >
        💬
      </button>
    );
  }

  const activePhases = project?.phases.filter(p => p.status === 'in_progress' || p.status === 'completed') ?? [];

  const sendIntervention = () => {
    if (!input.trim()) return;
    if (targetPhaseId) {
      addIntervention(targetPhaseId, input.trim());
      const phase = project?.phases.find(p => p.id === targetPhaseId);
      const w = phase ? workers.find(v => v.id === phase.workerId) : null;
      useOfficeStore.getState().addProjectMessage({
        id: Math.random().toString(36).slice(2),
        fromId: 'user', fromName: 'CEO',
        toId: w?.id ?? '', toName: w?.name ?? '',
        message: input.trim(),
        type: 'user_intervention',
        timestamp: Date.now(),
      });
    } else {
      useOfficeStore.getState().addProjectMessage({
        id: Math.random().toString(36).slice(2),
        fromId: 'user', fromName: 'CEO',
        toId: '', toName: '전체',
        message: input.trim(),
        type: 'user_intervention',
        timestamp: Date.now(),
      });
    }
    setInput('');
  };

  return (
    <div className="fixed left-4 bottom-4 z-40 w-96 h-[70vh] max-h-[600px] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-white font-bold text-sm">에이전트 채팅</span>
          <span className="text-gray-500 text-xs">{messages.length}건</span>
        </div>
        <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white text-sm">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(m => {
          const isUser = m.fromId === 'user';
          const w = workers.find(v => v.id === m.fromId);
          return (
            <div key={m.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border"
                style={{ borderColor: isUser ? '#f59e0b' : (w ? getCharColor(w.charId) : '#666') }}>
                {isUser
                  ? <div className="w-full h-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">CEO</div>
                  : w
                    ? <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-700" />
                }
              </div>
              <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-white text-xs font-medium">{m.fromName}</span>
                  {m.toName && <span className="text-gray-600 text-xs">→ {m.toName}</span>}
                  <span className="text-xs">{TYPE_ICONS[m.type] ?? ''}</span>
                </div>
                <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  isUser ? 'bg-amber-500/20 text-amber-200' : 'bg-gray-800 text-gray-300'
                }`}>
                  {m.message}
                </div>
                <span className="text-gray-700 text-[10px]">
                  {new Date(m.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {project && project.status !== 'completed' && (
        <div className="p-3 border-t border-gray-700 space-y-2">
          <select
            value={targetPhaseId}
            onChange={e => setTargetPhaseId(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700"
          >
            <option value="">전체에게 메시지</option>
            {activePhases.map(p => {
              const w = workers.find(v => v.id === p.workerId);
              return <option key={p.id} value={p.id}>{w?.name} — {w?.title}{p.abVariant ? ` (${p.abVariant}안)` : ''}</option>;
            })}
          </select>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendIntervention(); }}
              placeholder="수정 지시 또는 피드백 입력..."
              className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sendIntervention}
              disabled={!input.trim()}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
