'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { runAutonomousProject } from '@/lib/orchestrator';

export default function ProjectInputModal() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const project = useOfficeStore(s => s.project);
  const [productInfo, setProductInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (modal.type !== 'projectInput') return null;
  if (project && project.status !== 'idle' && project.status !== 'completed') return null;

  const submit = async () => {
    if (!productInfo.trim() || submitting) return;
    setSubmitting(true);
    closeModal();
    runAutonomousProject(productInfo.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">🚀 새 프로젝트 시작</h2>
          <p className="text-gray-400 text-sm mt-1">
            상품 정보만 입력하세요. 8명의 에이전트가 자율적으로 협업하여 상세페이지 + DA 전략을 완성합니다.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3">
              <div className="text-blue-400 font-bold mb-1">📄 상세페이지 팀</div>
              <div className="text-gray-400 space-y-0.5">
                <div>김하늘 — 기획</div>
                <div>박지민 — 후킹</div>
                <div>이서연 — 카피</div>
                <div>최유진 — 전환최적화</div>
              </div>
            </div>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-3">
              <div className="text-purple-400 font-bold mb-1">📊 DA 팀</div>
              <div className="text-gray-400 space-y-0.5">
                <div>정민수 — 전략기획</div>
                <div>강다현 — 광고카피</div>
                <div>김인기 — 소재디자인</div>
                <div>윤재호 — 퍼포먼스</div>
              </div>
            </div>
          </div>

          <textarea
            value={productInfo}
            onChange={e => setProductInfo(e.target.value)}
            placeholder={`상품/서비스에 대해 자유롭게 입력해주세요.\n\n예시:\n- 상품명: 올인원 비타민C 세럼\n- 가격: 29,900원\n- 타겟: 20~30대 여성\n- 특징: 비타민C 20% 함유, 피부 톤 개선\n- 경쟁사 대비 강점: 저자극 포뮬러`}
            rows={8}
            autoFocus
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700 leading-relaxed"
          />

          <button
            onClick={submit}
            disabled={!productInfo.trim() || submitting}
            className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-all"
          >
            {submitting ? '에이전트를 배치하는 중...' : '🚀 프로젝트 시작 — 에이전트가 알아서 합니다'}
          </button>
        </div>
      </div>
    </div>
  );
}
