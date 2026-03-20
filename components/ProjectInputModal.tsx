'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { runAutonomousProject, TeamSelection } from '@/lib/orchestrator';

const SP_MEMBERS = [
  { name: '김하늘', role: '기획' },
  { name: '박지민', role: '후킹' },
  { name: '이서연', role: '카피' },
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

  const [selected, setSelected] = useState<Set<'sp' | 'da'>>(new Set());
  const [spPrompt, setSpPrompt] = useState('');
  const [daPrompt, setDaPrompt] = useState('');
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

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    closeModal();
    runAutonomousProject({
      teams,
      spPrompt: hasSp ? spPrompt.trim() : '',
      daPrompt: hasDa ? daPrompt.trim() : '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">🚀 새 프로젝트 시작</h2>
          <p className="text-gray-400 text-sm mt-1">
            팀을 선택하고 각 팀에 맞는 상품 정보를 입력하세요.
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-3">
            {/* SP Team Card */}
            <button onClick={() => toggle('sp')}
              className={`text-left rounded-xl p-4 border-2 transition-all ${
                hasSp
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                  hasSp ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600'
                }`}>
                  {hasSp && '✓'}
                </div>
                <span className={`font-bold text-sm ${hasSp ? 'text-blue-400' : 'text-gray-400'}`}>
                  📄 상세페이지 팀
                </span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-7">
                {SP_MEMBERS.map(m => (
                  <div key={m.name}>{m.name} — {m.role}</div>
                ))}
              </div>
            </button>

            {/* DA Team Card */}
            <button onClick={() => toggle('da')}
              className={`text-left rounded-xl p-4 border-2 transition-all ${
                hasDa
                  ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                  hasDa ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-600'
                }`}>
                  {hasDa && '✓'}
                </div>
                <span className={`font-bold text-sm ${hasDa ? 'text-purple-400' : 'text-gray-400'}`}>
                  📊 DA 팀
                </span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-7">
                {DA_MEMBERS.map(m => (
                  <div key={m.name}>{m.name} — {m.role}</div>
                ))}
              </div>
            </button>
          </div>

          {/* No team selected hint */}
          {!hasSp && !hasDa && (
            <div className="text-center text-gray-600 text-sm py-4">
              위에서 팀을 선택해주세요
            </div>
          )}

          {/* SP Input */}
          {hasSp && (
            <div className="space-y-2">
              <label className="text-blue-400 text-xs font-bold flex items-center gap-1.5">
                📄 상세페이지 팀 — 상품/서비스 정보
              </label>
              <textarea
                value={spPrompt}
                onChange={e => setSpPrompt(e.target.value)}
                placeholder={`상세페이지에 사용할 상품 정보를 입력하세요.\n\n예시:\n- 상품명: 올인원 비타민C 세럼\n- 가격: 29,900원\n- 타겟: 20~30대 여성\n- 특징: 비타민C 20% 함유, 피부 톤 개선\n- 경쟁사 대비 강점: 저자극 포뮬러`}
                rows={6}
                autoFocus
                className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700 leading-relaxed"
              />
            </div>
          )}

          {/* DA Input */}
          {hasDa && (
            <div className="space-y-2">
              <label className="text-purple-400 text-xs font-bold flex items-center gap-1.5">
                📊 DA 팀 — 광고 캠페인 정보
              </label>
              <textarea
                value={daPrompt}
                onChange={e => setDaPrompt(e.target.value)}
                placeholder={`DA 캠페인에 사용할 정보를 입력하세요.\n\n예시:\n- 브랜드: 뷰티랩\n- 상품: 올인원 비타민C 세럼\n- 월 예산: 500만원\n- 타겟: 20~35세 여성, 스킨케어 관심\n- 목표: 신규 구매 전환\n- 주요 매체: 메타, 구글`}
                rows={6}
                autoFocus={!hasSp}
                className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700 leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        {(hasSp || hasDa) && (
          <div className="p-5 pt-0 flex-shrink-0">
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-all"
            >
              {submitting
                ? '에이전트를 배치하는 중...'
                : hasSp && hasDa
                  ? '🚀 전체 팀 프로젝트 시작'
                  : hasSp
                    ? '📄 상세페이지 팀 시작'
                    : '📊 DA 팀 시작'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
