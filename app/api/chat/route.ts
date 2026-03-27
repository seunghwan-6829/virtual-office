import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { getRoleSystemPrompt } from '@/lib/role-prompts';
import { RoleKey } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { instruction, role, roleKey, model, provider, previousResult, revisionFeedback, maxTokens } = await req.json();

    let systemPrompt = getRoleSystemPrompt((roleKey || 'spPlanner') as RoleKey, role);

    let prompt = instruction;
    if (previousResult && revisionFeedback) {
      prompt = `이전 작업 결과:\n---\n${previousResult}\n---\n\nCEO의 수정 요청:\n${revisionFeedback}\n\n위 수정사항을 반영하여 전체 내용을 다시 작성해주세요.`;
      systemPrompt += '\n\n이전 결과를 기반으로 수정 요청사항을 반영하세요.';
    }

    const llmModel = provider === 'google'
      ? google(model || 'gemini-2.0-flash-exp')
      : anthropic(model || 'claude-opus-4-6');

    const result = await streamText({
      model: llmModel,
      system: systemPrompt,
      prompt,
      maxTokens: Number(maxTokens) || 16384,
      maxRetries: 8,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
