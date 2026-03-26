export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const {
      prompt,
      aspectRatio,
      imageSize,
      productImageBase64,
      referenceImagesBase64,
    } = await req.json();

    const apiKey = process.env.GOOGLE_IMAGEN_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const parts: Record<string, unknown>[] = [];

    parts.push({ text: prompt });

    if (productImageBase64) {
      parts.push({ text: '\n[상품 이미지 - 이 제품의 외형을 정확히 참고하세요]:' });
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: productImageBase64,
        },
      });
    }

    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      parts.push({ text: '\n[레퍼런스 이미지 - 이 스타일/구도/분위기를 참고하세요]:' });
      for (const refB64 of referenceImagesBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: refB64,
          },
        });
      }
    }

    const model = 'gemini-3.1-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
          imageSize: imageSize || '2K',
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `API error: ${res.status} - ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const images: string[] = [];
    let textResponse = '';

    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          textResponse += part.text;
        } else if (part.inlineData?.data) {
          images.push(part.inlineData.data);
        }
      }
    }

    if (images.length === 0 && !textResponse) {
      return Response.json({ error: '이미지가 생성되지 않았습니다. 프롬프트를 수정해보세요.' }, { status: 400 });
    }

    return Response.json({
      images,
      count: images.length,
      text: textResponse || undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
