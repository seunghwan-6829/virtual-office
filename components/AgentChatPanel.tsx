'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor, AgentMessage } from '@/lib/types';
import { addIntervention } from '@/lib/orchestrator';

const MSG_PREVIEW_LEN = 120;

function ChatBubble({ message, className }: { message: string; className: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = message.length > MSG_PREVIEW_LEN;
  const displayText = !needsTruncate || expanded ? message : message.slice(0, MSG_PREVIEW_LEN) + '...';

  return (
    <div className={className}>
      {displayText}
      {needsTruncate && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="block mt-1 text-[10px] opacity-70 hover:opacity-100 underline underline-offset-2 transition-opacity"
        >
          {expanded ? '접기' : '더보기'}
        </button>
      )}
    </div>
  );
}

const TYPE_STYLES: Record<string, { icon: string; bg: string; text: string }> = {
  handoff:           { icon: '📦', bg: 'bg-blue-500/10',   text: 'text-blue-300' },
  feedback:          { icon: '🔄', bg: 'bg-amber-500/10',  text: 'text-amber-300' },
  question:          { icon: '❓', bg: 'bg-cyan-500/10',   text: 'text-cyan-300' },
  approval:          { icon: '✅', bg: 'bg-green-500/10',  text: 'text-green-300' },
  status:            { icon: '📢', bg: 'bg-gray-500/10',   text: 'text-gray-300' },
  user_intervention: { icon: '🎯', bg: 'bg-amber-500/20',  text: 'text-amber-200' },
  dialogue:          { icon: '💬', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  manager_check:     { icon: '👀', bg: 'bg-teal-500/10',   text: 'text-teal-300' },
  manager_tip:       { icon: '💡', bg: 'bg-yellow-500/10', text: 'text-yellow-300' },
  ceo_note:          { icon: '👔', bg: 'bg-amber-500/15',  text: 'text-amber-200' },
  collab:            { icon: '🤝', bg: 'bg-purple-500/10', text: 'text-purple-300' },
  casual:            { icon: '☕', bg: 'bg-gray-500/5',    text: 'text-gray-400' },
};

function mergeMessages(projectMsgs: AgentMessage[], officeMsgs: AgentMessage[]): AgentMessage[] {
  const seen = new Set<string>();
  const all = [...projectMsgs, ...officeMsgs]
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .sort((a, b) => a.timestamp - b.timestamp);
  return all.slice(-100);
}

export default function AgentChatPanel() {
  const chatOpen = useOfficeStore(s => s.chatPanelOpen);
  const setChatOpen = useOfficeStore(s => s.setChatPanelOpen);
  const currentFloor = useOfficeStore(s => s.currentFloor);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.currentFloor === 2 ? s.floor2Project : s.floor3Project);
  const officeMessages = useOfficeStore(s => s.currentFloor === 1 ? s.officeMessages : s.floor2Messages);
  const workers = useOfficeStore(s => s.workers.filter(w => w.floor === s.currentFloor));
  const ceoNotes = useOfficeStore(s => s.ceoNotes);
  const [input, setInput] = useState('');
  const [targetPhaseId, setTargetPhaseId] = useState<string>('');
  const [tab, setTab] = useState<'chat' | 'notes'>('chat');
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = mergeMessages(project?.messages ?? [], officeMessages);
  const unreadNotes = ceoNotes.filter(n => !n.acknowledged).length;

  useEffect(() => {
    if (scrollRef.current && tab === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, tab]);

  if (!chatOpen) {
    const totalUnread = messages.length > 0 ? Math.min(messages.length, 99) : 0;
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="fixed left-4 bottom-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg flex items-center justify-center text-white text-xl hover:scale-110 transition-transform"
        title="사내 단톡방"
      >
        💬
        {(totalUnread > 0 || unreadNotes > 0) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadNotes > 0 ? unreadNotes : ''}
          </span>
        )}
      </button>
    );
  }

  const activePhases = project?.phases.filter(p => p.status === 'in_progress' || p.status === 'completed') ?? [];

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: AgentMessage = {
      id: Math.random().toString(36).slice(2),
      fromId: 'user', fromName: 'CEO (나)',
      toId: '', toName: targetPhaseId ? '' : '전체',
      message: input.trim(),
      type: 'user_intervention',
      timestamp: Date.now(),
    };

    if (targetPhaseId) {
      addIntervention(targetPhaseId, input.trim());
      const phase = project?.phases.find(p => p.id === targetPhaseId);
      const w = phase ? workers.find(v => v.id === phase.workerId) : null;
      msg.toId = w?.id ?? '';
      msg.toName = w?.name ?? '';
    }

    useOfficeStore.getState().addOfficeMessage(msg);
    if (project && project.status !== 'completed') {
      useOfficeStore.getState().addProjectMessage(msg);
    }
    setInput('');
  };

  const CATEGORY_LABELS: Record<string, string> = {
    process: '프로세스', quality: '품질', efficiency: '효율',
    team: '팀워크', general: '일반',
  };

  return (
    <div className="fixed left-4 bottom-4 z-40 w-[420px] h-[75vh] max-h-[650px] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-white font-bold text-sm">사내 단톡방</span>
          <span className="text-gray-500 text-xs">{workers.filter(w => !w.isManager).length + 2}명</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setTab('chat')}
            className={`px-2 py-1 rounded text-xs ${tab === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
            채팅
          </button>
          <button onClick={() => setTab('notes')}
            className={`px-2 py-1 rounded text-xs relative ${tab === 'notes' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-white'}`}>
            CEO 메모
            {unreadNotes > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">{unreadNotes}</span>}
          </button>
          <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white text-sm ml-1">✕</button>
        </div>
      </div>

      {tab === 'chat' ? (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {messages.length === 0 && (
              <div className="text-gray-600 text-xs text-center py-8">
                에이전트들의 대화가 여기에 표시됩니다
              </div>
            )}
            {messages.map((m, i) => {
              const isUser = m.fromId === 'user';
              const w = workers.find(v => v.id === m.fromId);
              const style = TYPE_STYLES[m.type] ?? TYPE_STYLES.casual;
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showTime = !prevMsg || m.timestamp - prevMsg.timestamp > 60000;
              const isCEO = m.fromId === workers.find(v => v.isManager)?.id;

              return (
                <div key={m.id}>
                  {showTime && (
                    <div className="text-center text-gray-700 text-[10px] py-1">
                      {new Date(m.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                    </div>
                  )}
                  <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border"
                      style={{ borderColor: isUser ? '#f59e0b' : isCEO ? '#f59e0b' : (w ? getCharColor(w.charId) : '#666') }}>
                      {isUser
                        ? <div className="w-full h-full bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold">나</div>
                        : isCEO
                          ? <div className="w-full h-full bg-amber-600 flex items-center justify-center text-white text-[9px] font-bold">CEO</div>
                          : w
                            ? <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gray-700" />
                      }
                    </div>
                    <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-white text-[11px] font-medium">{m.fromName}</span>
                        {m.toName && m.toName !== '전체' && <span className="text-gray-600 text-[10px]">→ {m.toName}</span>}
                        <span className="text-[10px]">{style.icon}</span>
                      </div>
                      <ChatBubble
                        message={m.message}
                        className={`rounded-2xl px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap ${isUser ? 'bg-amber-500/20 text-amber-200 rounded-tr-sm' : `${style.bg} ${style.text} rounded-tl-sm`}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700 space-y-2">
            {activePhases.length > 0 && (
              <select value={targetPhaseId} onChange={e => setTargetPhaseId(e.target.value)}
                className="w-full bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700">
                <option value="">전체에게</option>
                {activePhases.map(p => {
                  const pw = workers.find(v => v.id === p.workerId);
                  return <option key={p.id} value={p.id}>{pw?.name} — {pw?.title}</option>;
                })}
              </select>
            )}
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                placeholder="메시지 입력..."
                className="flex-1 bg-gray-800 text-white text-xs rounded-full px-4 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={sendMessage} disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white flex items-center justify-center text-sm transition-colors">
                ↑
              </button>
            </div>
          </div>
        </>
      ) : (
        /* CEO Notes Tab */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {ceoNotes.length === 0 && (
            <div className="text-gray-600 text-xs text-center py-8">
              CEO가 관찰한 개선사항이 여기에 기록됩니다.<br/>
              (약 10분마다 자동 순찰)
            </div>
          )}
          {ceoNotes.slice().reverse().map(note => (
            <div key={note.id}
              className={`rounded-xl p-3 border transition-all ${
                note.feedback ? 'border-orange-500/30 bg-orange-500/5 opacity-80'
                  : note.acknowledged ? 'border-gray-800 bg-gray-800/30 opacity-60'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-xs font-bold">CEO 메모</span>
                  <span className="text-gray-600 text-[10px] px-1.5 py-0.5 bg-gray-800 rounded">{CATEGORY_LABELS[note.category] ?? note.category}</span>
                </div>
                <span className="text-gray-600 text-[10px]">
                  {new Date(note.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                </span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{note.content}</p>
              {note.feedback && (
                <div className="mt-2 px-2 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <span className="text-orange-400 text-[10px] font-bold block mb-0.5">보완 피드백:</span>
                  <p className="text-orange-300 text-[11px]">{note.feedback}</p>
                </div>
              )}
              {!note.acknowledged && (
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => useOfficeStore.getState().acknowledgeCEONote(note.id)}
                    className="text-[10px] text-green-400 hover:text-green-300 transition-colors px-2 py-1 bg-green-500/10 rounded-lg">
                    확인 완료
                  </button>
                  <button onClick={() => { setFeedbackId(note.id); setFeedbackText(''); }}
                    className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 bg-orange-500/10 rounded-lg">
                    보완 필요
                  </button>
                </div>
              )}
              {feedbackId === note.id && (
                <div className="mt-2 space-y-1.5">
                  <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    placeholder="보완이 필요한 부분을 적어주세요..."
                    rows={2}
                    className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-orange-500/30 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none" />
                  <div className="flex gap-1.5">
                    <button onClick={() => {
                      if (feedbackText.trim()) {
                        useOfficeStore.getState().feedbackCEONote(note.id, feedbackText.trim());
                        setFeedbackId(null);
                      }
                    }}
                      disabled={!feedbackText.trim()}
                      className="text-[10px] px-2 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-lg transition-colors">
                      피드백 전달
                    </button>
                    <button onClick={() => setFeedbackId(null)}
                      className="text-[10px] px-2 py-1 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors">
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
