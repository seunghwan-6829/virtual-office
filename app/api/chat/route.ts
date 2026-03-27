import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { getRoleSystemPrompt } from '@/lib/role-prompts';
import { RoleKey } from '@/lib/types';

export const runtime = 'edge';

const WEB_SEARCH_ROLES: RoleKey[] = ['spPlanner', 'spCopy', 'spImage'];

export async function POST(req: Request) {
  try {
    const { instruction, role, roleKey, model, provider, previousResult, revisionFeedback, maxTokens, enableWebSearch } = await req.json();

    if (!instruction && !previousResult) {
      return new Response('지시사항이 비어있습니다.', { status: 400 });
    }

    let systemPrompt = getRoleSystemPrompt((roleKey || 'spPlanner') as RoleKey, role);

    let prompt = instruction;
    if (previousResult && revisionFeedback) {
      prompt = `이전 작업 결과:\n---\n${previousResult}\n---\n\nCEO의 수정 요청:\n${revisionFeedback}\n\n위 수정사항을 반영하여 전체 내용을 다시 작성해주세요.`;
      systemPrompt += '\n\n이전 결과를 기반으로 수정 요청사항을 반영하세요.';
    }

    const needsWebSearch = enableWebSearch || WEB_SEARCH_ROLES.includes(roleKey as RoleKey);

    if (provider === 'google') {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_IMAGEN_API_KEY;
      if (!apiKey) {
        return new Response('[API 오류] GOOGLE_GENERATIVE_AI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.', { status: 200 });
      }
      const llmModel = google(model || 'gemini-2.0-flash-exp');
      const result = await streamText({
        model: llmModel,
        system: systemPrompt,
        prompt,
        maxOutputTokens: Number(maxTokens) || 16384,
      });
      return result.toTextStreamResponse();
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        '[API 오류] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.\n\n' +
        'Vercel 대시보드 → Settings → Environment Variables에서 ANTHROPIC_API_KEY를 추가하세요.\n' +
        '또는 프로젝트 루트에 .env.local 파일을 만들고 ANTHROPIC_API_KEY=sk-ant-... 를 추가하세요.',
        { status: 200 },
      );
    }

    const llmModel = anthropic(model || 'claude-opus-4-6');

    if (needsWebSearch) {
      const result = await streamText({
        model: llmModel,
        system: systemPrompt + '\n\n[웹 검색 활용 지침]\n- 최신 시장 데이터, 타사 사례, 트렌드를 웹 검색으로 확인하세요\n- 검색 결과를 교차 검증하여 신뢰성을 확보하세요\n- 검색한 정보의 출처를 명시하세요',
        prompt,
        maxOutputTokens: Number(maxTokens) || 16384,
        tools: {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: 5,
          }),
        },
      });
      return result.toTextStreamResponse();
    }

    const result = await streamText({
      model: llmModel,
      system: systemPrompt,
      prompt,
      maxOutputTokens: Number(maxTokens) || 16384,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[/api/chat] Error:', message);
    return new Response(
      `[API 오류] ${message}`,
      { status: 200 },
    );
  }
}
