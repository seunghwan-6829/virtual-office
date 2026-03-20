'use client';

import { useOfficeStore } from '@/lib/store';
import { ProjectTemplate } from '@/lib/types';

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'cosmetics',
    name: '화장품/스킨케어',
    icon: '🧴',
    category: '뷰티',
    description: '스킨케어, 메이크업, 뷰티 디바이스 등',
    spPrompt: '상품명: [제품명]\n가격: [가격]\n타겟: 20~35세 여성, 스킨케어 관심층\n주요 성분: [성분]\n효능: [효능]\n경쟁 대비 강점: [강점]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [브랜드명]\n상품: [제품명]\n월 예산: [예산]\n타겟: 20~35세 여성, 뷰티 관심\n목표: 신규 구매 전환\n주요 매체: 메타(인스타그램), 구글, 네이버\n시즌: [시즌성 여부]',
  },
  {
    id: 'health-food',
    name: '건강식품/보충제',
    icon: '💊',
    category: '헬스',
    description: '비타민, 프로바이오틱스, 다이어트 등',
    spPrompt: '상품명: [제품명]\n가격: [가격]\n타겟: 30~50대 건강 관심층\n주요 성분: [성분]\n인증/특허: [인증사항]\n복용 방법: [방법]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [브랜드명]\n상품: [제품명]\n월 예산: [예산]\n타겟: 30~50대, 건강/운동 관심\n목표: 첫 구매 + 정기배송 전환\n주요 매체: 네이버, 카카오, 메타\n계절 이슈: [시즌성]',
  },
  {
    id: 'electronics',
    name: '전자제품/가전',
    icon: '📱',
    category: '테크',
    description: '가전, 디바이스, 액세서리 등',
    spPrompt: '상품명: [제품명]\n가격: [가격]\n타겟: 25~45세 테크 얼리어답터\n주요 스펙: [스펙]\n기존 제품 대비 개선점: [개선점]\n호환성: [호환 정보]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [브랜드명]\n상품: [제품명]\n월 예산: [예산]\n타겟: 25~45세 남성, 테크 관심\n목표: 사전예약/구매 전환\n주요 매체: 구글, 유튜브, 네이버\n출시일: [날짜]',
  },
  {
    id: 'fashion',
    name: '패션/의류',
    icon: '👕',
    category: '패션',
    description: '의류, 잡화, 액세서리 등',
    spPrompt: '브랜드명: [브랜드]\n상품: [의류 카테고리]\n가격대: [가격대]\n타겟: [연령/성별]\n스타일: [캐주얼/포멀/스트릿 등]\n소재: [소재]\n시즌: [S/S, F/W]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [브랜드명]\n상품 카테고리: [카테고리]\n월 예산: [예산]\n타겟: [연령/성별], 패션 관심\n목표: 브랜드 인지 + 구매 전환\n주요 매체: 인스타그램, 네이버, 카카오\n프로모션: [할인/이벤트]',
  },
  {
    id: 'food',
    name: '식품/음료',
    icon: '🍜',
    category: '식품',
    description: '가공식품, 음료, 밀키트 등',
    spPrompt: '상품명: [제품명]\n가격: [가격]\n타겟: [타겟층]\n맛/특징: [특징]\n원산지: [원산지]\n유통기한: [기한]\n인증: [HACCP 등]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [브랜드명]\n상품: [제품명]\n월 예산: [예산]\n타겟: 25~45세, 식품/건강 관심\n목표: 체험 구매 전환\n주요 매체: 네이버, 카카오, 인스타그램\n시즌: [시즌성]',
  },
  {
    id: 'education',
    name: '교육/강의',
    icon: '📚',
    category: '교육',
    description: '온라인 강의, 자격증, 학원 등',
    spPrompt: '강의명: [강의명]\n가격: [가격]\n타겟: [대상]\n커리큘럼: [주요 내용]\n강사 소개: [경력]\n수강 기간: [기간]\n수료 후 혜택: [혜택]\nUSP: [차별화 포인트]',
    daPrompt: '브랜드: [교육 브랜드]\n상품: [강의명]\n월 예산: [예산]\n타겟: [연령/직업], 자기계발 관심\n목표: 무료체험 → 유료전환\n주요 매체: 구글, 유튜브, 네이버\n등록 마감: [날짜]',
  },
];

interface Props {
  onSelect: (template: ProjectTemplate) => void;
}

export default function TemplateSelector({ onSelect }: Props) {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);

  if (modal.type !== 'templates') return null;

  const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">📋 프로젝트 템플릿</h3>
            <p className="text-gray-500 text-xs mt-0.5">상품 유형을 선택하면 최적화된 프롬프트가 자동 세팅됩니다</p>
          </div>
          <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {categories.map(cat => (
            <div key={cat} className="mb-4">
              <h4 className="text-gray-400 text-xs font-bold mb-2 uppercase">{cat}</h4>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.filter(t => t.category === cat).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t); closeModal(); }}
                    className="text-left p-3 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-white text-sm font-medium group-hover:text-blue-400">{t.name}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { TEMPLATES };
