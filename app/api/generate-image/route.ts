export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio, imageSize, numberOfImages, referenceDescriptions } = await req.json();

    const apiKey = process.env.GOOGLE_IMAGEN_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    let fullPrompt = prompt;
    if (referenceDescriptions && referenceDescriptions.length > 0) {
      fullPrompt += `\n\nReference style guidance: ${referenceDescriptions.join('. ')}`;
    }

    const model = 'imagen-4.0-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

    const body = {
      instances: [{ prompt: fullPrompt }],
      parameters: {
        sampleCount: Math.min(numberOfImages || 1, 4),
        aspectRatio: aspectRatio || '1:1',
        ...(imageSize ? { imageSize } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Imagen API error: ${res.status} - ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const images: string[] = [];

    if (data.predictions) {
      for (const pred of data.predictions) {
        if (pred.bytesBase64Encoded) {
          images.push(pred.bytesBase64Encoded);
        }
      }
    }

    return Response.json({ images, count: images.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
