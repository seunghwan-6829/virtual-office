'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};

export default function FinalReportModal() {
  const modal = useOfficeStore(s => s.modal);
  const project = useOfficeStore(s => s.project);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);
  const reviewProject = useOfficeStore(s => s.reviewProject);
  const [tab, setTab] = useState<'report' | 'sp' | 'da' | 'log'>('report');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  if (modal.type !== 'finalReport' || !project) return null;

  const spPhases = project.phases.filter(p => p.team === 'sp');
  const daPhases = project.phases.filter(p => p.team === 'da');
  const dur = project.completedAt ? Math.round((project.completedAt - project.createdAt) / 1000) : 0;

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Virtual Office - Project Report', 14, 20);
    doc.setFontSize(9);
    const text = project.finalReport ?? '';
    const lines = doc.splitTextToSize(text.replace(/[^\x00-\x7F가-힣ㄱ-ㅎㅏ-ㅣ\s.,!?()[\]{}<>:;'"@#$%^&*+=\-_/\\|~`]/g, ''), 175);
    doc.text(lines.slice(0, 100), 14, 30);
    doc.save(`project_report_${Date.now()}.pdf`);
  };

  const handleCopy = () => {
    const allText = [
      project.finalReport,
      '\n\n=== 상세페이지 팀 상세 ===\n',
      ...spPhases.map(p => {
        const w = workers.find(v => v.id === p.workerId);
        return `## ${w?.name} (${w?.title})\n${p.result}`;
      }),
      '\n\n=== DA 팀 상세 ===\n',
      ...daPhases.map(p => {
        const w = workers.find(v => v.id === p.workerId);
        return `## ${w?.name} (${w?.title})\n${p.result}`;
      }),
    ].join('\n');
    navigator.clipboard.writeText(allText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">📋</div>
          <div className="flex-1">
            <h3 className="text-white font-bold">최종 프로젝트 보고서</h3>
            <div className="text-xs text-gray-400">총 소요시간: {dur}초 · 에이전트 8명 · {project.messages.length}건 대화</div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleCopy} title="전체 복사" className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm">📋</button>
            <button onClick={handleDownloadPDF} title="PDF 다운로드" className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm">📄</button>
            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {([['report', '📝 종합 보고서'], ['sp', '📄 상세페이지'], ['da', '📊 DA'], ['log', '💬 대화 로그']] as [string, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'report' && (
            <div className="report-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {project.finalReport || '보고서를 불러오는 중...'}
              </ReactMarkdown>
            </div>
          )}

          {tab === 'sp' && (
            <div className="space-y-6">
              {spPhases.map(phase => {
                const w = workers.find(v => v.id === phase.workerId);
                return (
                  <div key={phase.id} className="border border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                      {w && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: getCharColor(w.charId) }}>
                          <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-white font-bold text-sm">{w?.name}</span>
                      <span className="text-gray-400 text-xs">{w?.title}</span>
                    </div>
                    <div className="px-4 py-3 report-content text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{phase.result || '결과 없음'}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'da' && (
            <div className="space-y-6">
              {daPhases.map(phase => {
                const w = workers.find(v => v.id === phase.workerId);
                return (
                  <div key={phase.id} className="border border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                      {w && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: getCharColor(w.charId) }}>
                          <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-white font-bold text-sm">{w?.name}</span>
                      <span className="text-gray-400 text-xs">{w?.title}</span>
                    </div>
                    <div className="px-4 py-3 report-content text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{phase.result || '결과 없음'}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'log' && (
            <div className="space-y-2">
              {project.messages.map(msg => (
                <div key={msg.id} className="flex gap-3 text-sm">
                  <span className="text-gray-600 text-xs flex-shrink-0 w-16 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div>
                    <span className="text-white font-medium">{msg.fromName}</span>
                    {msg.toName && <span className="text-gray-500"> → {msg.toName}</span>}
                    <div className="text-gray-400 text-xs mt-0.5">{msg.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Feedback Input */}
        {showFeedback && (
          <div className="px-5 pb-3 flex-shrink-0">
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              placeholder="수정이 필요한 부분을 구체적으로 입력해주세요..."
              autoFocus rows={3}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 border border-amber-700/50" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowFeedback(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-xs transition-colors">
                취소
              </button>
              <button onClick={() => {
                if (feedbackText.trim()) {
                  reviewProject(feedbackText.trim());
                  setFeedbackText('');
                  setShowFeedback(false);
                  closeModal();
                }
              }} disabled={!feedbackText.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-xs font-medium transition-colors">
                수정 요청 보내기
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!showFeedback && (
          <div className="p-4 border-t border-gray-800 flex-shrink-0">
            {project.reviewed ? (
              <div className="flex items-center justify-between">
                <span className="text-green-400 text-sm font-medium">검토 완료</span>
                <button onClick={closeModal}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors">
                  닫기
                </button>
              </div>
            ) : project.reviewFeedback ? (
              <div className="space-y-2">
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2">
                  <span className="text-amber-400 text-[10px] font-bold">수정 요청됨:</span>
                  <p className="text-amber-300 text-xs mt-0.5">{project.reviewFeedback}</p>
                </div>
                <button onClick={closeModal}
                  className="w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors">
                  닫기
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">
                  PDF
                </button>
                <button onClick={() => setShowFeedback(true)}
                  className="px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl text-sm transition-colors border border-amber-700/30">
                  수정 요청
                </button>
                <button onClick={() => { reviewProject(); closeModal(); }}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">
                  검토 완료
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
