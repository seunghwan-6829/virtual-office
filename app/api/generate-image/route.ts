import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      aspectRatio,
      imageSize,
      model,
      productImageBase64,
      productImagesBase64,
      referenceImagesBase64,
      extraImagesBase64,
      textPreserve,
    } = await req.json();

    const apiKey = process.env.GOOGLE_IMAGEN_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google API key가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' }, { status: 500 });
    }

    const modelId = model || 'gemini-3.1-flash-image-preview';

    if (modelId.startsWith('seedream')) {
      return NextResponse.json({ error: `${modelId}은 아직 연동 준비 중입니다.` }, { status: 400 });
    }

    const parts: Record<string, unknown>[] = [];

    const allProductImages: string[] = (productImagesBase64?.length ? productImagesBase64 : (productImageBase64 ? [productImageBase64] : [])).filter(Boolean);
    const refImages: string[] = (referenceImagesBase64 || []).filter(Boolean);
    const extras: string[] = (extraImagesBase64 || []).filter(Boolean);

    if (textPreserve && allProductImages.length > 0) {
      parts.push({ text: `[⚠️ 텍스트/로고 보존 최우선 모드]\n` +
        `아래 상품에 인쇄된 모든 텍스트(브랜드명, 제품명, 숫자, 용량, 슬로건 등)와 로고를 **한 글자도 빠짐없이, 정확한 철자·폰트·크기·색상·위치로** 재현하세요.\n` +
        `- 텍스트가 왜곡되거나 글자가 바뀌거나 누락되면 안 됩니다.\n` +
        `- 로고의 형태, 색상, 비율을 원본 그대로 유지하세요.\n` +
        `- 패키지 디자인의 레이아웃(텍스트 배치, 색상 영역 구분)을 충실히 따르세요.\n` +
        `- 상품 표면의 텍스트를 확대하여 면밀히 관찰한 후 생성하세요.\n\n` });
    }

    if (allProductImages.length > 1) {
      const baseDesc = textPreserve
        ? `아래 ${allProductImages.length}장의 상품 이미지는 모두 동일한 제품입니다. 각 이미지의 텍스트, 로고, 숫자를 하나하나 정밀하게 읽고, 제품의 형태·색상·질감·디자인 디테일과 함께 **모든 인쇄 텍스트를 정확히** 반영한 새로운 이미지를 생성하세요.\n\n`
        : `아래 ${allProductImages.length}장의 상품 이미지는 모두 동일한 제품을 다양한 각도에서 촬영한 것입니다. 이 이미지들을 종합적으로 분석하여 제품의 형태, 색상, 질감, 로고, 디자인 디테일을 완전히 파악한 후, 그 제품을 정확하게 반영한 새로운 이미지를 생성하세요.\n\n`;
      parts.push({ text: baseDesc });
      for (let i = 0; i < allProductImages.length; i++) {
        parts.push({ text: `[상품 이미지 ${i + 1}/${allProductImages.length}]:` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: allProductImages[i] } });
      }

      if (textPreserve) {
        parts.push({ text: `\n[텍스트 확대 분석용 - 위 상품의 텍스트/로고 영역을 다시 한번 면밀히 확인하세요]:` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: allProductImages[0] } });
      }
    } else if (allProductImages.length === 1) {
      const label = textPreserve
        ? '[상품 이미지 - 이 제품의 외형과 **모든 인쇄된 텍스트·로고·숫자**를 정확히 반영하세요]:'
        : '[상품 이미지 - 이 제품의 외형을 정확히 반영하세요]:';
      parts.push({ text: label });
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: allProductImages[0] } });

      if (textPreserve) {
        parts.push({ text: `\n[텍스트 확대 분석용 - 위 상품의 텍스트/로고를 다시 한번 면밀히 확인하세요]:` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: allProductImages[0] } });
      }
    }

    if (refImages.length > 0) {
      parts.push({ text: '\n[레퍼런스 이미지 - 아래 이미지의 스타일, 구도, 분위기, 배경을 참고하여 위 상품을 배치하세요]:' });
      for (const b64 of refImages) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
      }
    }

    if (extras.length > 0) {
      for (let i = 0; i < extras.length; i++) {
        parts.push({ text: `\n[참고 이미지 ${i + 1}번]:` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: extras[i] } });
      }
    }

    const userPrompt = prompt || '이 상품의 고퀄리티 제품 이미지를 생성해주세요.';
    const textSuffix = textPreserve ? '\n\n[중요] 상품에 적힌 모든 글자, 숫자, 브랜드 로고를 원본과 동일하게 정확히 재현해주세요. 글자가 왜곡되거나 빠지면 안 됩니다.' : '';

    const lightingGuide = `\n\n[조명·환경광 반영 필수 지침]
- 제품은 배경 환경 속에 실제로 놓여 있어야 합니다. 배경의 조명 색온도, 방향, 강도에 맞춰 제품 표면에도 동일한 빛이 자연스럽게 반영되어야 합니다.
- 예: 따뜻한 붉은 조명 환경이면 제품 표면에도 미세한 붉은 반사광/색조가 묻어나야 합니다. 차가운 푸른 환경이면 제품에도 푸른 반사가 있어야 합니다.
- 제품에 광원 방향에 맞는 하이라이트와 그림자가 있어야 합니다. 제품이 플랫(flat)하게 오려붙인 듯 보이면 안 됩니다.
- 반사 표면(테이블, 바닥 등)이 있으면 제품의 은은한 반사도 표현하세요.
- 단, 제품의 원래 형태·디자인·패키지 구조는 절대 변형하지 마세요. 조명에 의한 색조 변화만 자연스럽게 적용하세요.`;

    parts.push({ text: `\n\n사용자 요청: ${userPrompt}${textSuffix}${lightingGuide}` });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

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
      const blockReason = candidate?.finishReason;
      const isSafety = blockReason === 'SAFETY'
        || data.candidates?.[0]?.safetyRatings?.some((r: Record<string, string>) => r.blocked)
        || data.promptFeedback?.blockReason === 'SAFETY';
      return NextResponse.json({
        error: isSafety
          ? '안전 정책에 의해 차단되었습니다.'
          : '이미지가 생성되지 않았습니다. 프롬프트를 수정해보세요.',
        isSafety,
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
    return NextResponse.json({ error: `서버 오류: ${message}`, isSafety: false }, { status: 500 });
  }
}
