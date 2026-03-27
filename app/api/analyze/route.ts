import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getAnalysisPrompt } from '@/lib/role-prompts';
import { RoleKey } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { topic, roleKey } = (await req.json()) as { topic: string; roleKey: RoleKey };
    const analysisPrompt = getAnalysisPrompt(roleKey);
    if (!analysisPrompt) {
      return Response.json({ error: 'No analysis prompt for this role' }, { status: 400 });
    }

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: analysisPrompt,
      prompt: topic,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return Response.json(JSON.parse(jsonMatch[0]));
    }
    return Response.json({ raw: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
