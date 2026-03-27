import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { getRoleSystemPrompt } from '@/lib/role-prompts';
import { RoleKey } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { instruction, role, roleKey, model, provider, previousResult, revisionFeedback, maxTokens } = await req.json();

    if (!instruction && !previousResult) {
      return new Response('지시사항이 비어있습니다.', { status: 400 });
    }

    let systemPrompt = getRoleSystemPrompt((roleKey || 'spPlanner') as RoleKey, role);

    let prompt = instruction;
    if (previousResult && revisionFeedback) {
      prompt = `이전 작업 결과:\n---\n${previousResult}\n---\n\nCEO의 수정 요청:\n${revisionFeedback}\n\n위 수정사항을 반영하여 전체 내용을 다시 작성해주세요.`;
      systemPrompt += '\n\n이전 결과를 기반으로 수정 요청사항을 반영하세요.';
    }

    const apiKey = provider === 'google'
      ? (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_IMAGEN_API_KEY)
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      const keyName = provider === 'google' ? 'GOOGLE_GENERATIVE_AI_API_KEY' : 'ANTHROPIC_API_KEY';
      return new Response(
        `[API 오류] ${keyName} 환경변수가 설정되지 않았습니다.\n\n` +
        'Vercel 대시보드 → Settings → Environment Variables에서 추가하세요.\n' +
        '또는 프로젝트 루트에 .env.local 파일을 만들어 추가하세요.',
        { status: 200 },
      );
    }

    const llmModel = provider === 'google'
      ? google(model || 'gemini-2.0-flash-exp')
      : anthropic(model || 'claude-opus-4-6');

    const result = await streamText({
      model: llmModel,
      system: systemPrompt,
      prompt,
      maxTokens: Number(maxTokens) || 16384,
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
