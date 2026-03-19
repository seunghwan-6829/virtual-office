# Virtual Office — AI Agent Simulation

도트 아트 가상 사무실에서 AI 에이전트 직원들을 관리하는 웹 시뮬레이션입니다.

## 기능

- **도트 아트 사무실**: HTML5 Canvas로 렌더링된 픽셀 아트 사무실
- **AI 직원 관리**: 직원을 클릭하여 업무를 지시하면 LLM이 자동 수행
- **보고 시스템**: 업무 완료 후 CEO실로 걸어와 대기, 클릭하면 보고
- **멀티 LLM 지원**: OpenAI, Anthropic, Google AI를 직원별로 배정
- **중간관리자**: 전체 업무 로그 및 프로세스 분석 대시보드

## 시작하기

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

## 환경변수

`.env.local` 파일에 API 키를 설정하세요:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

API 키가 없어도 데모 모드로 동작합니다.

## Vercel 배포

1. GitHub에 push
2. Vercel에서 import
3. Environment Variables에 API 키 추가
4. Deploy

## 기술 스택

- Next.js 14 (App Router)
- HTML5 Canvas (순수 픽셀 아트)
- Zustand (상태관리)
- Vercel AI SDK (멀티 LLM)
- Tailwind CSS
