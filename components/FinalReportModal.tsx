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

function buildFullText(
  project: ReturnType<typeof useOfficeStore.getState>['project'],
  workers: ReturnType<typeof useOfficeStore.getState>['workers'],
) {
  if (!project) return '';
  const spPhases = project.phases.filter(p => p.team === 'sp' && (!p.abVariant || p.abVariant === 'A'));
  const daPhases = project.phases.filter(p => p.team === 'da' && (!p.abVariant || p.abVariant === 'A'));
  const abPhases = project.phases.filter(p => p.abVariant === 'B');

  const sections: string[] = [
    '═══════════════════════════════════════',
    '        Virtual Office - 최종 프로젝트 보고서',
    '═══════════════════════════════════════',
    '',
    project.finalReport ?? '',
    '',
    '',
    '═══════════════════════════════════════',
    '        상세페이지 팀 상세 결과',
    '═══════════════════════════════════════',
    '',
    ...spPhases.map(p => {
      const w = workers.find(v => v.id === p.workerId);
      return `── ${w?.name} (${w?.title}) ──\n\n${p.result}\n`;
    }),
    '',
    '═══════════════════════════════════════',
    '        DA 팀 상세 결과',
    '═══════════════════════════════════════',
    '',
    ...daPhases.map(p => {
      const w = workers.find(v => v.id === p.workerId);
      return `── ${w?.name} (${w?.title}) ──\n\n${p.result}\n`;
    }),
  ];

  if (abPhases.length > 0) {
    sections.push(
      '',
      '═══════════════════════════════════════',
      '        A/B 테스트 B안 결과',
      '═══════════════════════════════════════',
      '',
      ...abPhases.map(p => {
        const w = workers.find(v => v.id === p.workerId);
        return `── ${w?.name} (${w?.title}) B안 ──\n\n${p.result}\n`;
      }),
    );
  }

  return sections.join('\n');
}

function downloadTXT(text: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    color: #1a1a1a; line-height: 1.7; font-size: 11pt; max-width: 100%;
  }
  h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 24px; }
  h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-top: 20px; color: #2563eb; }
  h3 { font-size: 12pt; margin-top: 16px; color: #7c3aed; }
  h4, h5 { font-size: 11pt; margin-top: 12px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: bold; }
  code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }
  pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 9pt; }
  hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  blockquote { border-left: 3px solid #2563eb; padding-left: 12px; color: #555; margin: 12px 0; }
  strong { color: #111; }
  .section-divider { page-break-before: always; }
  @media print {
    body { font-size: 10pt; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="no-print" style="background:#2563eb;color:#fff;padding:12px 20px;text-align:center;margin-bottom:20px;border-radius:8px;">
  <b>PDF로 저장하려면 Ctrl+P (또는 ⌘+P) → "PDF로 저장" 을 선택하세요</b>
</div>
${htmlContent}
</body>
</html>`);
  printWindow.document.close();

  setTimeout(() => { printWindow.print(); }, 500);
}

function markdownToHTML(md: string): string {
  let html = md
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  const tableRegex = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (_match, headerLine: string, bodyLines: string) => {
    const headers = headerLine.split('|').map((h: string) => h.trim()).filter(Boolean);
    const rows = bodyLines.trim().split('\n').map((line: string) =>
      line.split('|').map((c: string) => c.trim()).filter(Boolean)
    );
    return `<table><thead><tr>${headers.map((h: string) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r: string[]) => `<tr>${r.map((c: string) => `<td>${c}</td>`).join('')}</tr>`).join('')
    }</tbody></table>`;
  });

  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><(h[1-5]|ul|ol|table|hr|blockquote)/g, '<$1');
  html = html.replace(/<\/(h[1-5]|ul|ol|table|blockquote)><\/p>/g, '</$1>');

  return html;
}

export default function FinalReportModal() {
  const modal = useOfficeStore(s => s.modal);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.floor2Project);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);
  const reviewProject = useOfficeStore(s => s.currentFloor === 1 ? s.reviewProject : s.reviewFloor2Project);
  const [tab, setTab] = useState<'report' | 'sp' | 'da' | 'ab' | 'log'>('report');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  if (modal.type !== 'finalReport' || !project) return null;

  const spPhases = project.phases.filter(p => p.team === 'sp' && (!p.abVariant || p.abVariant === 'A'));
  const daPhases = project.phases.filter(p => p.team === 'da' && (!p.abVariant || p.abVariant === 'A'));
  const abPhases = project.phases.filter(p => p.abVariant === 'B');
  const dur = project.completedAt ? Math.round((project.completedAt - project.createdAt) / 1000) : 0;

  const handleExportTXT = () => {
    const text = buildFullText(project, workers);
    downloadTXT(text, `virtual_office_report_${Date.now()}.txt`);
  };

  const handleExportPDF = () => {
    const report = project.finalReport ?? '';
    const spHtml = spPhases.map(p => {
      const w = workers.find(v => v.id === p.workerId);
      return `<h2>${w?.name} (${w?.title})</h2>${markdownToHTML(p.result || '')}`;
    }).join('<hr/>');
    const daHtml = daPhases.map(p => {
      const w = workers.find(v => v.id === p.workerId);
      return `<h2>${w?.name} (${w?.title})</h2>${markdownToHTML(p.result || '')}`;
    }).join('<hr/>');

    let abHtml = '';
    if (abPhases.length > 0) {
      abHtml = `<div class="section-divider"></div><h1>A/B 테스트 B안 결과</h1>` +
        abPhases.map(p => {
          const w = workers.find(v => v.id === p.workerId);
          return `<h2>${w?.name} (${w?.title}) B안</h2>${markdownToHTML(p.result || '')}`;
        }).join('<hr/>');
    }

    const fullHtml = `
      <h1>최종 프로젝트 보고서</h1>
      ${markdownToHTML(report)}
      <div class="section-divider"></div>
      <h1>상세페이지 팀 상세 결과</h1>
      ${spHtml}
      <div class="section-divider"></div>
      <h1>DA 팀 상세 결과</h1>
      ${daHtml}
      ${abHtml}
    `;

    downloadPDF('Virtual Office - 프로젝트 보고서', fullHtml);
  };

  const handleCopy = () => {
    const text = buildFullText(project, workers);
    navigator.clipboard.writeText(text);
  };

  const TABS: [typeof tab, string][] = [
    ['report', '📝 종합 보고서'],
    ['sp', '📄 상세페이지'],
    ['da', '📊 DA'],
    ...(abPhases.length > 0 ? [['ab' as const, '🔀 A/B 비교'] as [typeof tab, string]] : []),
    ['log', '💬 대화 로그'],
  ];

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
            <button onClick={handleCopy} title="전체 복사"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm">📋</button>
            <button onClick={closeModal}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {TABS.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
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

          {tab === 'ab' && (
            <div className="space-y-6">
              {abPhases.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-12">A/B 테스트 데이터가 없습니다</div>
              ) : (
                abPhases.map(bPhase => {
                  const aPhase = project.phases.find(p => p.roleKey === bPhase.roleKey && p.abVariant === 'A');
                  const w = workers.find(v => v.id === bPhase.workerId);
                  return (
                    <div key={bPhase.id} className="border border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                        {w && (
                          <div className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: getCharColor(w.charId) }}>
                            <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-white font-bold text-sm">{w?.name}</span>
                        <span className="text-gray-400 text-xs">{w?.title}</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-700">
                        <div>
                          <div className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold">A안</div>
                          <div className="px-3 py-3 report-content text-xs max-h-80 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                              {aPhase?.result || '결과 없음'}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div>
                          <div className="px-3 py-1.5 bg-purple-500/10 text-purple-400 text-xs font-bold">B안</div>
                          <div className="px-3 py-3 report-content text-xs max-h-80 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                              {bPhase.result || '결과 없음'}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
                <div className="flex gap-2">
                  <button onClick={handleExportTXT}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs transition-colors">
                    TXT
                  </button>
                  <button onClick={handleExportPDF}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs transition-colors">
                    PDF
                  </button>
                  <button onClick={closeModal}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors">
                    닫기
                  </button>
                </div>
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
                <button onClick={handleExportTXT}
                  className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs transition-colors">
                  TXT
                </button>
                <button onClick={handleExportPDF}
                  className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs transition-colors">
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
