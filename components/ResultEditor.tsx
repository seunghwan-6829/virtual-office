'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { regenerateSection } from '@/lib/orchestrator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};

export default function ResultEditor() {
  const modal = useOfficeStore(s => s.modal);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.currentFloor === 2 ? s.floor2Project : s.floor3Project);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [regenFeedback, setRegenFeedback] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  if (modal.type !== 'resultEditor' || !project) return null;

  const phases = project.phases.filter(p => p.status === 'completed' && (!p.abVariant || p.abVariant === 'A'));
  const phase = phases.find(p => p.id === selectedPhase) ?? phases[0];
  const w = phase ? workers.find(v => v.id === phase.workerId) : null;

  const handleRegen = async () => {
    if (!phase || !regenFeedback.trim()) return;
    setRegenerating(true);
    await regenerateSection(phase.id, regenFeedback.trim());
    setRegenFeedback('');
    setRegenerating(false);
  };

  const handleSaveEdit = () => {
    if (!phase) return;
    useOfficeStore.getState().completePhase(phase.id, editText);
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-white font-bold">✏️ 결과물 편집</h3>
          <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-800 overflow-y-auto p-2 space-y-1">
            {phases.map(p => {
              const pw = workers.find(v => v.id === p.workerId);
              const active = (selectedPhase || phases[0]?.id) === p.id;
              return (
                <button key={p.id}
                  onClick={() => { setSelectedPhase(p.id); setEditMode(false); }}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                    active ? 'bg-blue-500/20 text-white' : 'text-gray-400 hover:bg-gray-800'
                  }`}>
                  {pw && (
                    <div className="w-6 h-6 rounded-full overflow-hidden border flex-shrink-0"
                      style={{ borderColor: getCharColor(pw.charId) }}>
                      <img src={`/sprites/characters/CH_${pw.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="truncate">{pw?.name}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {phase && w && (
              <>
                <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{w.name}</span>
                    <span className="text-gray-500 text-xs">{w.title}</span>
                  </div>
                  <button
                    onClick={() => { setEditMode(!editMode); setEditText(phase.result); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      editMode ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}>
                    {editMode ? '미리보기' : '✏️ 직접 편집'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {editMode ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full h-[400px] bg-gray-800 text-white text-xs rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs">취소</button>
                        <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">저장</button>
                      </div>
                    </div>
                  ) : (
                    <div className="report-content text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{phase.result}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {!editMode && (
                  <div className="p-3 border-t border-gray-800 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={regenFeedback}
                        onChange={e => setRegenFeedback(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRegen(); }}
                        placeholder="이 부분만 다시 써줘..."
                        className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleRegen}
                        disabled={!regenFeedback.trim() || regenerating}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {regenerating ? '🔄' : '부분 재생성'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
