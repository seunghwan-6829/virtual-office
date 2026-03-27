'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { runAutonomousProject, TeamSelection } from '@/lib/orchestrator';
import { CompetitorInput, ProjectTemplate } from '@/lib/types';

const PIPELINE_MEMBERS = [
  { name: '김하늘', role: '순서1 · 시장조사·리서치', step: 1 },
  { name: '이서연', role: '순서2 · 데이터 정리·분석', step: 2 },
  { name: '박지민', role: '순서3 · 기획안 설계', step: 3 },
  { name: '최유진', role: '순서4 · 카피·후킹', step: 4 },
  { name: '강다현', role: '순서6 · 중간 컨펌', step: 6 },
  { name: '윤재호', role: '순서7 · 단점 지적·검수', step: 7 },
  { name: '김인기', role: '순서8 · 최종 컨펌·A/B', step: 8 },
];

const POST_PIPELINE_MEMBER = { name: '정민수', role: 'AI 이미지 작업', step: 5 };

const FLOOR3_MEMBERS = [
  { name: '서유나', role: 'DA 디자인' },
  { name: '임도윤', role: 'DA 카피' },
  { name: '권서영', role: 'DA 전략' },
  { name: '문채린', role: 'DA 분석' },
  { name: '백서윤', role: 'DA 소재' },
  { name: '안지호', role: 'DA 운영' },
];

const FLOOR2_MEMBERS = [
  { name: '김영주', role: 'AI 이미지' },
  { name: '오예원', role: 'AI 이미지' },
  { name: '이한나', role: 'AI 이미지' },
  { name: '장한나', role: 'AI 이미지' },
  { name: '차지우', role: 'AI 이미지' },
  { name: '한나라', role: 'AI 이미지' },
];

interface ProductForm {
  productName: string;
  brandName: string;
  sp1: string;
  sp2: string;
  sp3: string;
  price: string;
  target: string;
  weaknesses: string;
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
    f.weaknesses && `\n[단점/피해야 하는 부분]\n${f.weaknesses}`,
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
  const currentFloor = useOfficeStore(s => s.currentFloor);
  const project = useOfficeStore(s => s.currentFloor === 1 ? s.project : s.currentFloor === 2 ? s.floor2Project : s.floor3Project);
  const openTemplates = useOfficeStore(s => s.openTemplatesModal);
  const openCompetitor = useOfficeStore(s => s.openCompetitorModal);

  const [form, setForm] = useState<ProductForm>({ productName: '', brandName: '', sp1: '', sp2: '', sp3: '', price: '', target: '', weaknesses: '' });
  const [competitorData, setCompetitorData] = useState<CompetitorInput | null>(null);
  const [templateId, setTemplateId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (modal.type !== 'projectInput') return null;
  if (project && project.status !== 'idle' && project.status !== 'completed') return null;

  const isFloor2 = currentFloor === 2;
  const isFloor3 = currentFloor === 3;
  const isUpperFloor = isFloor2 || isFloor3;
  const canSubmit = form.productName.trim() && form.brandName.trim() && form.sp1.trim();

  const updateForm = (key: keyof ProductForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const applyTemplate = (t: ProjectTemplate) => {
    setTemplateId(t.id);
  };

  const applyCompetitor = (data: CompetitorInput) => {
    setCompetitorData(data);
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    closeModal();
    if (isUpperFloor) {
      runAutonomousProject({
        teams: 'sp',
        spPrompt: buildSpPrompt(form),
        daPrompt: '',
        abEnabled: false,
        templateId: templateId || undefined,
        floor: currentFloor,
      });
    } else {
      runAutonomousProject({
        teams: 'sp',
        spPrompt: buildSpPrompt(form),
        daPrompt: '',
        abEnabled: true,
        competitorData: competitorData ?? undefined,
        templateId: templateId || undefined,
      });
    }
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
          <h2 className="text-white font-bold text-lg">
            {isFloor3 ? '새 프로젝트 시작 — DA 제작 부서' : isFloor2 ? '새 프로젝트 시작 — AI 제작 부서' : '새 프로젝트 시작 — 상세페이지 제작'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isFloor3 ? '상품 정보 입력 → DA 소재 제작' : isFloor2 ? '상품 정보 입력 → AI 이미지 생성' : '상품 정보 입력 → 7단계 순차 파이프라인 실행'}
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Actions (1층만) */}
          {!isUpperFloor && (
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
          )}

          {!isUpperFloor && competitorData && (
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <span className="text-cyan-400 text-xs">경쟁사: {competitorData.brandName}</span>
              <button onClick={() => setCompetitorData(null)} className="text-gray-500 hover:text-white text-xs ml-auto">x</button>
            </div>
          )}

          {/* 2층 팀 표시 */}
          {isFloor2 && (
            <div className="rounded-xl p-4 border-2 border-purple-500 bg-purple-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm text-purple-400">AI 제작 부서</span>
                <span className="text-xs text-gray-500">6명의 이미지 생성 에이전트</span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-2 grid grid-cols-2 gap-1">
                {FLOOR2_MEMBERS.map(m => <div key={m.name}>{m.name} — {m.role}</div>)}
              </div>
            </div>
          )}

          {/* 3층 팀 표시 */}
          {isFloor3 && (
            <div className="rounded-xl p-4 border-2 border-emerald-500 bg-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm text-emerald-400">DA 제작 부서</span>
                <span className="text-xs text-gray-500">6명의 DA 제작 에이전트</span>
              </div>
              <div className="text-gray-500 text-xs space-y-0.5 ml-2 grid grid-cols-2 gap-1">
                {FLOOR3_MEMBERS.map(m => <div key={m.name}>{m.name} — {m.role}</div>)}
              </div>
            </div>
          )}

          {/* 1층 파이프라인 표시 */}
          {!isUpperFloor && (
            <div className="rounded-xl p-4 border-2 border-blue-500 bg-blue-500/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-sm text-blue-400">상세페이지 제작 파이프라인</span>
                <span className="text-xs text-gray-500">7단계 순차 실행</span>
              </div>
              <div className="space-y-1.5">
                {PIPELINE_MEMBERS.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-blue-600/30 text-blue-400">{m.step}</span>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-600">—</span>
                    <span>{m.role}</span>
                    {i < PIPELINE_MEMBERS.length - 1 && (
                      <span className="text-gray-700 ml-auto">→</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="flex items-center gap-2 text-xs text-amber-400/80">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{POST_PIPELINE_MEMBER.step}</span>
                  <span className="font-medium">{POST_PIPELINE_MEMBER.name}</span>
                  <span className="text-gray-600">—</span>
                  <span>{POST_PIPELINE_MEMBER.role}</span>
                  <span className="text-[10px] bg-amber-500/15 text-amber-400/70 px-1.5 py-0.5 rounded-full ml-auto">보고서 후 별도 진행</span>
                </div>
              </div>
            </div>
          )}

          {/* Structured Product Form */}
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

          {/* 단점/피해야하는 부분 */}
          <div className="space-y-2 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-red-400 text-sm font-bold flex items-center gap-1.5">
              단점 / 피해야 하는 부분
              <span className="text-[10px] bg-red-500/15 text-red-400/70 px-1.5 py-0.5 rounded-full font-normal">선택</span>
            </h3>
            <p className="text-gray-500 text-[11px]">
              상세페이지에서 강조하면 안 되는 약점이나, 에이전트들이 피해야 하는 표현·주제를 적어주세요.
            </p>
            <textarea
              value={form.weaknesses}
              onChange={e => updateForm('weaknesses', e.target.value)}
              placeholder="예: 가격이 경쟁사 대비 비쌈, 배송 3~5일 소요, 향이 강한 편이라 민감한 사람 주의 등"
              rows={3}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-xs border border-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none placeholder-gray-600"
            />
          </div>

        </div>

        <div className="p-5 pt-0 flex-shrink-0">
          <button onClick={submit} disabled={!canSubmit || submitting}
            className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-all">
            {submitting ? '에이전트를 배치하는 중...'
              : isFloor3 ? 'DA 제작 부서 프로젝트 시작'
              : isFloor2 ? 'AI 제작 부서 프로젝트 시작'
              : '상세페이지 제작 파이프라인 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SP_MEMBERS = PIPELINE_MEMBERS.filter(m => m.step <= 4).map(m => ({ name: m.name, role: m.role }));
export const DA_MEMBERS = PIPELINE_MEMBERS.filter(m => m.step >= 5).map(m => ({ name: m.name, role: m.role }));
