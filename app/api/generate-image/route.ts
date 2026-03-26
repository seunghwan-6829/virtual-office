import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Google API key가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' }, { status: 500 });
    }

    const parts: Record<string, unknown>[] = [];

    parts.push({ text: prompt || '이 상품의 고퀄리티 제품 이미지를 생성해주세요.' });

    if (productImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: productImageBase64,
        },
      });
    }

    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      for (const refB64 of referenceImagesBase64) {
        if (refB64) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: refB64,
            },
          });
        }
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
      console.error('[generate-image] API error:', res.status, errText);
      let friendlyMsg = `Google API 오류 (${res.status})`;
      try {
        const errJson = JSON.parse(errText);
        friendlyMsg = errJson?.error?.message || friendlyMsg;
      } catch { /* use default */ }
      return NextResponse.json({ error: friendlyMsg }, { status: res.status });
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
      const blockReason = candidate?.finishReason || data.candidates?.[0]?.finishReason;
      const safetyMsg = blockReason === 'SAFETY' ? ' (안전 필터에 의해 차단됨)' : '';
      return NextResponse.json({
        error: `이미지가 생성되지 않았습니다${safetyMsg}. 프롬프트를 수정해보세요.`,
      }, { status: 400 });
    }

    return NextResponse.json({
      images,
      count: images.length,
      text: textResponse || undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-image] Error:', message);
    return NextResponse.json({ error: `서버 오류: ${message}` }, { status: 500 });
  }
}
