'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ReportModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const workerFinishReport = useOfficeStore(s => s.workerFinishReport);
  const requestRevision = useOfficeStore(s => s.requestRevision);

  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [tab, setTab] = useState<'preview' | 'raw'>('preview');

  if (modal.type !== 'report' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker?.currentTask) return null;

  const task = worker.currentTask;
  const dur = task.completedAt ? Math.round((task.completedAt - task.createdAt) / 1000) : 0;
  const color = getCharColor(worker.charId);

  const handleRevision = () => {
    if (!feedback.trim()) return;
    requestRevision(worker.id, feedback.trim());
    setFeedback('');
    setShowRevisionInput(false);
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(`보고서: ${worker.name} (${worker.title})`, 14, 20);
    doc.setFontSize(10);
    doc.text(`작성일: ${new Date().toLocaleDateString('ko-KR')}`, 14, 28);
    doc.text(`소요시간: ${dur}초`, 14, 34);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(11);
    doc.text('지시 내용:', 14, 46);
    doc.setFontSize(10);
    const instrLines = doc.splitTextToSize(task.instruction, 175);
    doc.text(instrLines, 14, 53);

    const startY = 53 + instrLines.length * 5 + 8;
    doc.setFontSize(11);
    doc.text('작업 결과:', 14, startY);
    doc.setFontSize(9);
    const resultText = task.result.replace(/[^\x00-\x7F가-힣ㄱ-ㅎㅏ-ㅣ\s.,!?()[\]{}<>:;'"@#$%^&*+=\-_/\\|~`]/g, '');
    const resultLines = doc.splitTextToSize(resultText, 175);
    doc.text(resultLines.slice(0, 80), 14, startY + 7);

    doc.save(`report_${worker.name}_${Date.now()}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: color }}>
            <img src={`/sprites/characters/CH_${worker.charId}_Front.png`} alt={worker.name}
              className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm">{worker.name} <span className="text-gray-500 font-normal">({worker.title})</span></h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>⏱ {dur}초</span>
              {task.revisions.length > 0 && <span className="text-amber-400">수정 {task.revisions.length}회</span>}
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="text-xs text-gray-500 mb-1 font-medium">📋 지시 내용</div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 whitespace-pre-wrap">{task.instruction}</div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-2 flex-shrink-0">
          <button onClick={() => setTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            미리보기
          </button>
          <button onClick={() => setTab('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            원본
          </button>
        </div>

        {/* Result */}
        <div className="px-4 pt-3 pb-4 flex-1 overflow-y-auto min-h-0">
          <div className="text-xs text-gray-500 mb-1 font-medium">📝 작업 결과</div>
          {tab === 'preview' ? (
            <div className="bg-gray-800 rounded-lg px-4 py-3 prose prose-sm prose-invert max-w-none max-h-[40vh] overflow-y-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {task.result || '결과를 불러오는 중...'}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg px-3 py-3 text-sm text-gray-200 max-h-[40vh] overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono text-xs">
              {task.result || '결과를 불러오는 중...'}
            </div>
          )}
        </div>

        {/* Revision input */}
        {showRevisionInput && (
          <div className="px-4 pb-3 flex-shrink-0">
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="수정사항을 입력해주세요..." autoFocus rows={2}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 border border-amber-700/50" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowRevisionInput(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-xs transition-colors">
                취소
              </button>
              <button onClick={handleRevision} disabled={!feedback.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-xs font-medium transition-colors">
                수정 요청 보내기
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showRevisionInput && (
          <div className="p-4 border-t border-gray-800 flex gap-2 flex-shrink-0">
            <button onClick={handleDownloadPDF}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">
              📄 PDF 다운로드
            </button>
            <button onClick={() => setShowRevisionInput(true)}
              className="px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl text-sm transition-colors border border-amber-700/30">
              ✏️ 수정 요청
            </button>
            <button onClick={() => workerFinishReport(worker.id)}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors">
              ✅ 승인 (자리로 복귀)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
