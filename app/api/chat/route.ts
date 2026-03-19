import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

function getModel(provider: string, model: string) {
  switch (provider) {
    case 'openai':
      return openai(model);
    case 'anthropic':
      return anthropic(model);
    case 'google':
      return google(model);
    default:
      return openai('gpt-4o');
  }
}

export async function POST(req: Request) {
  try {
    const { instruction, role, provider, model } = await req.json();

    const systemPrompt = `당신은 가상 사무실에서 일하는 직원입니다.
역할: ${role}

주어진 업무를 최선을 다해 수행하고, 결과를 상세하게 보고해주세요.
보고 형식:
- 핵심 내용을 먼저 제시
- 구체적이고 실용적인 결과물 제공
- 한국어로 응답

지금부터 CEO가 지시하는 업무를 수행하세요.`;

    const result = await streamText({
      model: getModel(provider, model),
      system: systemPrompt,
      prompt: instruction,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
