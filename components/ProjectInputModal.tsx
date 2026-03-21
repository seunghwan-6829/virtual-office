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

const DA_CHANNELS = ['Meta', 'Google', 'Naver', 'Kakao', 'YouTube', 'TikTok'];

interface ProductForm {
  productName: string;
  brandName: string;
  sp1: string;
  sp2: string;
  sp3: string;
  price: string;
  target: string;
}

interface DAExtra {
  budget: string;
  channels: string[];
}

function buildSpPrompt(f: ProductForm): string {
  const lines = [
    `상품명: ${f.productName}`,
    `브랜드명: ${f.brandName}`,
    `소구점 1: ${f.sp1}`,
    f.sp2 && `소구점 2: ${f.sp2}`,
    f.sp3 && `소구점 3: ${f.sp3}`,
    `가격: ${f.price}`,
    `타겟: ${f.target}`,
  ].filter(Boolean);
  return lines.join('\n');
}

function buildDaPrompt(f: ProductForm, da: DAExtra): string {
  const lines = [
    `상품명: ${f.productName}`,
    `브랜드명: ${f.brandName}`,
    `소구점 1: ${f.sp1}`,
    f.sp2 && `소구점 2: ${f.sp2}`,
    f.sp3 && `소구점 3: ${f.sp3}`,
    `가격: ${f.price}`,
    `타겟: ${f.target}`,
    da.budget && `월 광고 예산: ${da.budget}`,
    da.channels.length > 0 && `주요 채널: ${da.channels.join(', ')}`,
  ].filter(Boolean);
  return lines.join('\n');
}

const InputField = ({ label, value, onChange, placeholder, required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) => (
  <div>
    <label className="text-gray-400 text-[11px] font-medium block mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-xs border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
  </div>
);

export default function ProjectInputModal() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const project = useOfficeStore(s => s.project);
  const openTemplates = useOfficeStore(s => s.openTemplatesModal);
  const openCompetitor = useOfficeStore(s => s.openCompetitorModal);

  const [selected, setSelected] = useState<Set<'sp' | 'da'>>(new Set());
  const [form, setForm] = useState<ProductForm>({ productName: '', brandName: '', sp1: '', sp2: '', sp3: '', price: '', target: '' });
  const [daExtra, setDaExtra] = useState<DAExtra>({ budget: '', channels: [] });
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

  const toggleChannel = (ch: string) => {
    setDaExtra(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  const hasSp = selected.has('sp');
  const hasDa = selected.has('da');
  const teams: TeamSelection = hasSp && hasDa ? 'both' : hasSp ? 'sp' : hasDa ? 'da' : 'both';
  const canSubmit = (hasSp || hasDa) && form.productName.trim() && form.brandName.trim() && form.sp1.trim();

  const updateForm = (key: keyof ProductForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const applyTemplate = (t: ProjectTemplate) => {
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
      spPrompt: hasSp ? buildSpPrompt(form) : '',
      daPrompt: hasDa ? buildDaPrompt(form, daExtra) : buildSpPrompt(form),
      abEnabled,
      competitorData: competitorData ?? undefined,
      templateId: templateId || undefined,
    });
  };

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__applyTemplate = applyTemplate;
    (window as unknown as Record<string, unknown>).__applyCompetitor = applyCompetitor;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">새 프로젝트 시작</h2>
          <p className="text-gray-400 text-sm mt-1">팀 선택 → 상품 정보 입력 → 옵션 설정</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={openTemplates}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors border border-gray-700">
              템플릿에서 시작
            </button>
            <button onClick={openCompetitor}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors border border-gray-700">
              경쟁사 분석 추가
            </button>
          </div>

          {competitorData && (
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <span className="text-cyan-400 text-xs">경쟁사: {competitorData.brandName}</span>
              <button onClick={() => setCompetitorData(null)} className="text-gray-500 hover:text-white text-xs ml-auto">x</button>
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
                <span className={`font-bold text-sm ${hasSp ? 'text-blue-400' : 'text-gray-400'}`}>상세페이지 팀</span>
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
                <span className={`font-bold text-sm ${hasDa ? 'text-purple-400' : 'text-gray-400'}`}>DA 팀</span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-7">
                {DA_MEMBERS.map(m => <div key={m.name}>{m.name} — {m.role}</div>)}
              </div>
            </button>
          </div>

          {!hasSp && !hasDa && (
            <div className="text-center text-gray-600 text-sm py-4">위에서 팀을 선택해주세요</div>
          )}

          {/* Structured Product Form */}
          {(hasSp || hasDa) && (
            <div className="space-y-3 bg-gray-800/30 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white text-sm font-bold mb-1">상품/서비스 정보</h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="상품명" value={form.productName} onChange={v => updateForm('productName', v)} placeholder="올인원 비타민C 세럼" required />
                <InputField label="브랜드명" value={form.brandName} onChange={v => updateForm('brandName', v)} placeholder="뷰티랩" required />
              </div>
              <InputField label="핵심 소구점 1" value={form.sp1} onChange={v => updateForm('sp1', v)} placeholder="피부 톤 개선 효과 92% 입증" required />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="소구점 2" value={form.sp2} onChange={v => updateForm('sp2', v)} placeholder="자연 유래 성분 95%" />
                <InputField label="소구점 3" value={form.sp3} onChange={v => updateForm('sp3', v)} placeholder="피부과 테스트 완료" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="가격" value={form.price} onChange={v => updateForm('price', v)} placeholder="29,900원" />
                <InputField label="타겟" value={form.target} onChange={v => updateForm('target', v)} placeholder="20~30대 여성" />
              </div>
            </div>
          )}

          {/* DA Extra */}
          {hasDa && (
            <div className="space-y-3 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <h3 className="text-purple-400 text-sm font-bold">DA 추가 정보</h3>
              <InputField label="월 광고 예산" value={daExtra.budget} onChange={v => setDaExtra(p => ({ ...p, budget: v }))} placeholder="500만원" />
              <div>
                <label className="text-gray-400 text-[11px] font-medium block mb-1.5">주요 채널</label>
                <div className="flex flex-wrap gap-1.5">
                  {DA_CHANNELS.map(ch => (
                    <button key={ch} onClick={() => toggleChannel(ch)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        daExtra.channels.includes(ch) ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}>{ch}</button>
                  ))}
                </div>
              </div>
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
                : `${hasSp && hasDa ? '전체 팀' : hasSp ? '상세페이지 팀' : 'DA 팀'} 프로젝트 시작${abEnabled ? ' (A/B)' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { SP_MEMBERS, DA_MEMBERS };
