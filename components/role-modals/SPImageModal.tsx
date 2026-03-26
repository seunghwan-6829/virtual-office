'use client';

import { useState, useRef } from 'react';
import { Worker } from '@/lib/types';
import ModalShell from './ModalShell';

const ASPECT_RATIOS = [
  { label: '9:16 (세로)', value: '9:16' },
  { label: '16:9 (가로)', value: '16:9' },
  { label: '1:1 (정방형)', value: '1:1' },
];

const RESOLUTIONS = [
  { label: '4K', value: '4K' },
  { label: '2K', value: '2K' },
  { label: '1K', value: '1K' },
];

interface GeneratedImage {
  base64: string;
  prompt: string;
}

export default function SPImageModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productFileName, setProductFileName] = useState('');
  const [references, setReferences] = useState<{ name: string; dataUrl: string }[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Set<number>>(new Set());
  const [promptText, setPromptText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('2K');
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState('');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setProductImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setReferences(prev => [...prev, { name: file.name, dataUrl: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    }
    if (refInputRef.current) refInputRef.current.value = '';
  };

  const removeRef = (idx: number) => {
    setReferences(prev => prev.filter((_, i) => i !== idx));
    setSelectedRefs(prev => {
      const next = new Set<number>();
      prev.forEach(i => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
  };

  const toggleRefSelect = (idx: number) => {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setGenerating(true);
    setError('');
    setGeneratedImages([]);

    try {
      const extractBase64 = (dataUrl: string) => {
        const idx = dataUrl.indexOf(',');
        return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
      };

      const productB64 = productImage ? extractBase64(productImage) : null;
      const refB64List = Array.from(selectedRefs).map(i => {
        const ref = references[i];
        return ref ? extractBase64(ref.dataUrl) : '';
      }).filter(Boolean);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText.trim(),
          aspectRatio,
          imageSize: resolution,
          numberOfImages: Math.max(selectedRefs.size, 1),
          productImageBase64: productB64,
          referenceImagesBase64: refB64List,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images.map((b64: string) => ({
          base64: b64,
          prompt: data.text || promptText,
        })));
      } else {
        setError('이미지가 생성되지 않았습니다. 프롬프트를 수정해보세요.');
      }
    } catch {
      setError('이미지 생성 중 오류가 발생했습니다.');
    }
    setGenerating(false);
  };

  const handleDownloadZip = async () => {
    if (generatedImages.length === 0) return;

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();

    generatedImages.forEach((img, i) => {
      const binary = atob(img.base64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      zip.file(`image_${i + 1}.png`, bytes);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_images_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (base64: string, idx: number) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    const blob = new Blob([bytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image_${idx + 1}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalShell worker={worker} onClose={onClose}>
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-800/30 rounded-xl p-3 text-sm text-gray-300">
          <span className="text-pink-400 font-bold">🎨 Nano Banana 2</span>
          <span className="text-gray-400 ml-1">(Gemini 3.1 Flash Image)로 제품 이미지를 생성합니다.</span>
        </div>

        {/* Product Image Upload */}
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1.5">📦 상품 이미지</div>
          <div className="flex gap-3 items-start">
            {productImage ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-pink-500/50 flex-shrink-0">
                <img src={productImage} alt="product" className="w-full h-full object-cover" />
                <button onClick={() => { setProductImage(null); setProductFileName(''); }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
              </div>
            ) : (
              <button onClick={() => productInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-pink-500/50 flex items-center justify-center text-gray-600 hover:text-pink-400 transition-colors flex-shrink-0">
                <span className="text-2xl">+</span>
              </button>
            )}
            <div className="flex-1 text-xs text-gray-500">
              {productFileName || '상품 사진을 올리면 제품 외형을 참고하여 이미지를 생성합니다.'}
            </div>
            <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductUpload} />
          </div>
        </div>

        {/* Reference Images */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-gray-500 font-medium">🖼️ 레퍼런스 이미지</div>
            <button onClick={() => refInputRef.current?.click()}
              className="text-[10px] text-pink-400 hover:text-pink-300 transition-colors">+ 추가</button>
          </div>
          <input ref={refInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefUpload} />

          {references.length === 0 ? (
            <button onClick={() => refInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-700 hover:border-pink-500/30 rounded-xl text-gray-600 hover:text-pink-400 text-xs transition-colors">
              레퍼런스 이미지를 올려주세요 (복수 선택 가능)
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {references.map((ref, i) => (
                <div key={i}
                  onClick={() => toggleRefSelect(i)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedRefs.has(i) ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-gray-700 hover:border-gray-500'
                  }`}>
                  <img src={ref.dataUrl} alt={ref.name} className="w-full h-full object-cover" />
                  {selectedRefs.has(i) && (
                    <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); removeRef(i); }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[8px] flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          )}
          {references.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-1">
              클릭하여 선택 ({selectedRefs.size}개 선택됨) — 선택한 레퍼런스 스타일을 참고하여 생성
            </p>
          )}
        </div>

        {/* Prompt */}
        <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
          placeholder="생성할 이미지를 설명해주세요 (예: 흰색 배경 위에 놓인 프리미엄 화장품 패키지, 부드러운 조명, 미니멀한 스타일)"
          rows={3}
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 border border-gray-700" />

        {/* Aspect Ratio + Resolution */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1.5">📐 이미지 비율</div>
            <div className="flex gap-1.5">
              {ASPECT_RATIOS.map(r => (
                <button key={r.value} onClick={() => setAspectRatio(r.value)}
                  className={`flex-1 px-2 py-2 rounded-lg text-[11px] transition-colors ${
                    aspectRatio === r.value ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1.5">📏 해상도</div>
            <div className="flex gap-1.5">
              {RESOLUTIONS.map(r => (
                <button key={r.value} onClick={() => setResolution(r.value)}
                  className={`flex-1 px-2 py-2 rounded-lg text-[11px] transition-colors ${
                    resolution === r.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={generating || !promptText.trim()}
          className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-all">
          {generating ? '🔄 이미지 생성 중...' : '🎨 이미지 생성 (Nano Banana 2)'}
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 text-red-400 text-xs">{error}</div>
        )}

        {/* Generated Images Preview */}
        {generatedImages.length > 0 && (
          <div>
            {generatedImages[0]?.prompt && generatedImages[0].prompt !== promptText && (
              <details className="mb-2">
                <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300">AI가 분석한 프롬프트 보기</summary>
                <p className="text-[10px] text-gray-600 bg-gray-800/50 rounded-lg p-2 mt-1 leading-relaxed">{generatedImages[0].prompt}</p>
              </details>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 font-medium">생성된 이미지 ({generatedImages.length}장)</div>
              <button onClick={handleDownloadZip}
                className="text-xs bg-green-600/20 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition-colors font-medium">
                📦 ZIP 다운로드
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {generatedImages.map((img, i) => (
                <div key={i}
                  onClick={() => setPreviewIdx(i)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-pink-500 transition-colors group">
                  <img src={`data:image/png;base64,${img.base64}`} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">🔍 확대</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDownloadSingle(img.base64, i); }}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ⬇
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Preview Modal */}
        {previewIdx !== null && generatedImages[previewIdx] && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
            onClick={() => setPreviewIdx(null)}>
            <div className="max-w-3xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
              <img src={`data:image/png;base64,${generatedImages[previewIdx].base64}`} alt="Preview"
                className="max-w-full max-h-[85vh] rounded-xl" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => handleDownloadSingle(generatedImages[previewIdx!].base64, previewIdx!)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium">⬇ 저장</button>
                <button onClick={() => setPreviewIdx(null)}
                  className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs">✕</button>
              </div>
              {generatedImages.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  <button disabled={previewIdx === 0} onClick={() => setPreviewIdx(i => (i ?? 1) - 1)}
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs disabled:opacity-30">← 이전</button>
                  <span className="px-3 py-1.5 text-white text-xs">{previewIdx + 1} / {generatedImages.length}</span>
                  <button disabled={previewIdx === generatedImages.length - 1} onClick={() => setPreviewIdx(i => (i ?? 0) + 1)}
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs disabled:opacity-30">다음 →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
