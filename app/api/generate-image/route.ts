import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt, style, ratio } = await req.json();
    const fullPrompt = [
      prompt,
      style ? `Style: ${style}` : '',
      ratio ? `Aspect ratio: ${ratio}` : '',
    ].filter(Boolean).join('. ');

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: `Generate an image based on the following description. If you cannot generate an image, describe in detail what the image would look like.\n\n${fullPrompt}`,
    });

    return Response.json({ result: text, prompt: fullPrompt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
