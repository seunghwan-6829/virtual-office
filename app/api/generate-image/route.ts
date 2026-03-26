export const runtime = 'edge';

async function analyzeWithGemini(
  apiKey: string,
  userPrompt: string,
  productImageB64: string | null,
  referenceImagesB64: string[],
): Promise<string> {
  const parts: Record<string, unknown>[] = [];

  parts.push({
    text: `You are an expert product photographer and image director. Based on the user's request and provided images, create a highly detailed image generation prompt in English for Imagen 4.

USER REQUEST: ${userPrompt}

RULES:
- Describe the product's exact appearance (shape, color, material, texture, size) in detail based on the product photo
- If reference images are provided, replicate their style, composition, lighting, background, and mood
- Output ONLY the Imagen prompt - no explanations, no markdown, just the prompt text
- Maximum 400 tokens
- Be extremely specific about visual details`,
  });

  if (productImageB64) {
    parts.push({ text: '\n\n[PRODUCT PHOTO - Replicate this product exactly]:' });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: productImageB64,
      },
    });
  }

  if (referenceImagesB64.length > 0) {
    parts.push({ text: '\n\n[REFERENCE IMAGES - Match this visual style/composition]:' });
    for (const refB64 of referenceImagesB64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: refB64,
        },
      });
    }
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text.trim();
}

export async function POST(req: Request) {
  try {
    const {
      prompt,
      aspectRatio,
      imageSize,
      numberOfImages,
      productImageBase64,
      referenceImagesBase64,
    } = await req.json();

    const apiKey = process.env.GOOGLE_IMAGEN_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const hasImages = productImageBase64 || (referenceImagesBase64 && referenceImagesBase64.length > 0);

    let imagenPrompt = prompt;
    if (hasImages) {
      try {
        imagenPrompt = await analyzeWithGemini(
          apiKey,
          prompt,
          productImageBase64 || null,
          referenceImagesBase64 || [],
        );
      } catch (e) {
        console.warn('Gemini analysis failed, using original prompt:', e);
      }
    }

    const model = 'imagen-4.0-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

    const body = {
      instances: [{ prompt: imagenPrompt }],
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

    return Response.json({
      images,
      count: images.length,
      generatedPrompt: imagenPrompt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
