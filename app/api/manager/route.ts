import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { logs } = await req.json();

    const logsText = logs
      .map((l: { workerName: string; taskInstruction: string; durationMs: number; provider: string }) =>
        `- ${l.workerName}: "${l.taskInstruction}" (${Math.round(l.durationMs / 1000)}초, ${l.provider})`
      )
      .join('\n');

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: '당신은 가상 사무실의 중간관리자입니다. 업무 로그를 분석하고 개선점을 제안하세요. 한국어로 간결하게 응답하세요.',
      prompt: `최근 업무 로그:\n${logsText}\n\n위 업무들을 분석하고, 프로세스 개선점과 효율화 방안을 제안해주세요.`,
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
