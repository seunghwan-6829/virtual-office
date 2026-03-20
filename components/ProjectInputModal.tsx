'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { runAutonomousProject, TeamSelection } from '@/lib/orchestrator';
import { CompetitorInput, ProjectTemplate } from '@/lib/types';

const SP_MEMBERS = [
  { name: '김하늘', role: '기획' },
  { name: '이서연', role: '카피·후킹' },
  { name: '박지민', role: '이미지 (Gemini)' },
  { name: '최유진', role: '전환최적화' },
];

const DA_MEMBERS = [
  { name: '정민수', role: '전략기획' },
  { name: '강다현', role: '광고카피' },
  { name: '김인기', role: '소재디자인' },
  { name: '윤재호', role: '퍼포먼스' },
];

export default function ProjectInputModal() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const project = useOfficeStore(s => s.project);
  const openTemplates = useOfficeStore(s => s.openTemplatesModal);
  const openCompetitor = useOfficeStore(s => s.openCompetitorModal);

  const [selected, setSelected] = useState<Set<'sp' | 'da'>>(new Set());
  const [spPrompt, setSpPrompt] = useState('');
  const [daPrompt, setDaPrompt] = useState('');
  const [abEnabled, setAbEnabled] = useState(false);
  const [competitorData, setCompetitorData] = useState<CompetitorInput | null>(null);
  const [templateId, setTemplateId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (modal.type !== 'projectInput') return null;
  if (project && project.status !== 'idle' && project.status !== 'completed') return null;

  const toggle = (team: 'sp' | 'da') => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  const hasSp = selected.has('sp');
  const hasDa = selected.has('da');
  const teams: TeamSelection = hasSp && hasDa ? 'both' : hasSp ? 'sp' : hasDa ? 'da' : 'both';
  const canSubmit = (hasSp && spPrompt.trim()) || (hasDa && daPrompt.trim());

  const applyTemplate = (t: ProjectTemplate) => {
    setSpPrompt(t.spPrompt);
    setDaPrompt(t.daPrompt);
    setTemplateId(t.id);
    setSelected(new Set<'sp' | 'da'>(['sp', 'da']));
  };

  const applyCompetitor = (data: CompetitorInput) => {
    setCompetitorData(data);
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    closeModal();
    runAutonomousProject({
      teams,
      spPrompt: hasSp ? spPrompt.trim() : '',
      daPrompt: hasDa ? daPrompt.trim() : '',
      abEnabled,
      competitorData: competitorData ?? undefined,
      templateId: templateId || undefined,
    });
  };

  // Expose to parent via window for template/competitor callbacks
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__applyTemplate = applyTemplate;
    (window as unknown as Record<string, unknown>).__applyCompetitor = applyCompetitor;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">🚀 새 프로젝트 시작</h2>
          <p className="text-gray-400 text-sm mt-1">팀 선택 → 상품 정보 입력 → 옵션 설정</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={openTemplates}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors border border-gray-700">
              📋 템플릿에서 시작
            </button>
            <button onClick={openCompetitor}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors border border-gray-700">
              🔍 경쟁사 분석 추가
            </button>
          </div>

          {/* Competitor Badge */}
          {competitorData && (
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <span className="text-cyan-400 text-xs">🔍 경쟁사: {competitorData.brandName}</span>
              <button onClick={() => setCompetitorData(null)} className="text-gray-500 hover:text-white text-xs ml-auto">✕</button>
            </div>
          )}

          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => toggle('sp')}
              className={`text-left rounded-xl p-4 border-2 transition-all ${
                hasSp ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                  hasSp ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600'
                }`}>{hasSp && '✓'}</div>
                <span className={`font-bold text-sm ${hasSp ? 'text-blue-400' : 'text-gray-400'}`}>📄 상세페이지 팀</span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-7">
                {SP_MEMBERS.map(m => <div key={m.name}>{m.name} — {m.role}</div>)}
              </div>
            </button>

            <button onClick={() => toggle('da')}
              className={`text-left rounded-xl p-4 border-2 transition-all ${
                hasDa ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                  hasDa ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-600'
                }`}>{hasDa && '✓'}</div>
                <span className={`font-bold text-sm ${hasDa ? 'text-purple-400' : 'text-gray-400'}`}>📊 DA 팀</span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-7">
                {DA_MEMBERS.map(m => <div key={m.name}>{m.name} — {m.role}</div>)}
              </div>
            </button>
          </div>

          {!hasSp && !hasDa && (
            <div className="text-center text-gray-600 text-sm py-4">위에서 팀을 선택해주세요</div>
          )}

          {hasSp && (
            <div className="space-y-2">
              <label className="text-blue-400 text-xs font-bold">📄 상세페이지 팀 — 상품/서비스 정보</label>
              <textarea value={spPrompt} onChange={e => setSpPrompt(e.target.value)}
                placeholder={`상세페이지에 사용할 상품 정보를 입력하세요.\n\n예시:\n- 상품명: 올인원 비타민C 세럼\n- 가격: 29,900원\n- 타겟: 20~30대 여성`}
                rows={5} autoFocus
                className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700" />
            </div>
          )}

          {hasDa && (
            <div className="space-y-2">
              <label className="text-purple-400 text-xs font-bold">📊 DA 팀 — 광고 캠페인 정보</label>
              <textarea value={daPrompt} onChange={e => setDaPrompt(e.target.value)}
                placeholder={`DA 캠페인에 사용할 정보를 입력하세요.\n\n예시:\n- 브랜드: 뷰티랩\n- 월 예산: 500만원`}
                rows={5} autoFocus={!hasSp}
                className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700" />
            </div>
          )}

          {/* Options */}
          {(hasSp || hasDa) && (
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={abEnabled} onChange={e => setAbEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500" />
                <span className="text-gray-300 text-xs">A/B 테스트 자동 생성</span>
              </label>
            </div>
          )}
        </div>

        {(hasSp || hasDa) && (
          <div className="p-5 pt-0 flex-shrink-0">
            <button onClick={submit} disabled={!canSubmit || submitting}
              className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-all">
              {submitting ? '에이전트를 배치하는 중...'
                : `🚀 ${hasSp && hasDa ? '전체 팀' : hasSp ? '상세페이지 팀' : 'DA 팀'} 프로젝트 시작${abEnabled ? ' (A/B)' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { SP_MEMBERS, DA_MEMBERS };
