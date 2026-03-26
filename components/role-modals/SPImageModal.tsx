'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Worker } from '@/lib/types';
import ModalShell from './ModalShell';
import { createClient } from '@/lib/supabase/client';

/* ── 모델 목록 ──────────────────────────────────── */
interface ModelInfo { id: string; label: string; tag?: string; available: boolean }
const MODELS: ModelInfo[] = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2', tag: 'Flash', available: true },
  { id: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro', tag: 'Pro', available: true },
  { id: 'seedream-4.5-edit', label: 'Seedream 4.5 Edit', tag: 'Edit', available: false },
  { id: 'seedream-5', label: 'Seedream 5', tag: 'New', available: false },
];

const ASPECT_RATIOS = ['9:16', '16:9', '1:1'];
const RESOLUTIONS = ['4K', '2K', '1K'];
const IMAGE_COUNTS = [1, 2, 3, 4];

const PROMPT_TEMPLATES = [
  { label: '레퍼런스 배경 참고', text: '레퍼런스 내에 있는 제품 이미지처럼 배경을 비슷하게 해서 만들어줘' },
  { label: '무드+참고이미지 결합', text: '전반적인 무드랑 배경과 각도는 레퍼런스 이미지처럼 만들어주고 \'참고 이미지 1번\'도 제작할 때 같이 넣어주라.' },
  { label: '레퍼런스 변형', text: '레퍼런스 내에 있는 이미지를 비슷하게 만들어주는데, 비슷한 느낌을 참고해서 조금 다양하게 만들어줘!' },
];

/* ── 타입 ─────────────────────────────────── */
interface UploadedImage { dataUrl: string; base64: string }
interface RefTemplate { id: string; name: string; images: { dataUrl: string; base64: string }[] }
interface GeneratedImage { base64: string; status: 'loading' | 'done' | 'violation' | 'error'; errorMsg?: string }
interface HistoryItem { id: string; prompt: string; model: string; images: string[]; createdAt: number }

function extractBase64(dataUrl: string) {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function resizeImage(dataUrl: string, maxDim = 1024): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve({ dataUrl, base64: extractBase64(dataUrl) });
        return;
      }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const resized = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ dataUrl: resized, base64: extractBase64(resized) });
    };
    img.onerror = () => resolve({ dataUrl, base64: extractBase64(dataUrl) });
    img.src = dataUrl;
  });
}

/* ── 이미지 확대 뷰어 ──────────────────────── */
function ImageZoom({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80" onClick={onClose}>
      <img src={src} alt="zoom" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 text-white text-2xl bg-black/50 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
    </div>
  );
}

/* ── 템플릿 관리 플로팅 창 ─────────────────── */
function TemplateManager({
  open, onClose, templates, onSave, onDelete, onApply, onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  templates: RefTemplate[];
  onSave: (name: string, images: UploadedImage[]) => void;
  onDelete: (id: string) => void;
  onApply: (images: UploadedImage[]) => void;
  onUpdate: (id: string, name: string, images: UploadedImage[]) => void;
}) {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [newImages, setNewImages] = useState<UploadedImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editImages, setEditImages] = useState<UploadedImage[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleFilesForCreate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        const resized = await resizeImage(reader.result as string, 1024);
        setNewImages(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleFilesForEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        const resized = await resizeImage(reader.result as string, 1024);
        setEditImages(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const startEdit = (t: RefTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditImages([...t.images]);
    setTab('list');
  };

  const saveEdit = () => {
    if (editingId && editName.trim() && editImages.length > 0) {
      onUpdate(editingId, editName.trim(), editImages);
      setEditingId(null);
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditImages([]); };

  const handleCreate = () => {
    if (newName.trim() && newImages.length > 0) {
      onSave(newName.trim(), newImages);
      setNewName('');
      setNewImages([]);
      setTab('list');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-bold text-sm">🖼️ 레퍼런스 템플릿 관리</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setTab('list')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'list' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
            저장된 템플릿 ({templates.length})
          </button>
          <button onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'create' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
            + 새 템플릿 만들기
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'list' && (
            <>
              {templates.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-xs">저장된 템플릿이 없습니다</p>
                  <button onClick={() => setTab('create')} className="mt-3 text-[11px] text-violet-400 hover:text-violet-300">+ 새 템플릿 만들기</button>
                </div>
              )}
              {templates.map(t => (
                <div key={t.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                  {editingId === t.id ? (
                    /* ── 편집 모드 ── */
                    <div className="space-y-3">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-violet-500/50 focus:outline-none focus:border-violet-500" />
                      <div className="flex flex-wrap gap-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-600 group cursor-pointer" onClick={() => setPreviewSrc(img.dataUrl)}>
                            <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                            <button onClick={e => { e.stopPropagation(); setEditImages(prev => prev.filter((_, j) => j !== i)); }}
                              className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                          </div>
                        ))}
                        <button onClick={() => editInputRef.current?.click()}
                          className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-600 hover:border-violet-500 flex items-center justify-center text-gray-600 hover:text-violet-400 transition-colors text-lg">+</button>
                        <input ref={editInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesForEdit} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={cancelEdit} className="text-[11px] text-gray-400 px-3 py-1.5 rounded-lg hover:text-white transition-colors">취소</button>
                        <button onClick={saveEdit} disabled={!editName.trim() || editImages.length === 0}
                          className="text-[11px] bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors">저장</button>
                      </div>
                    </div>
                  ) : (
                    /* ── 보기 모드 ── */
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white font-medium">{t.name}</span>
                        <span className="text-[10px] text-gray-500">{t.images.length}장</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {t.images.map((img, i) => (
                          <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors" onClick={() => setPreviewSrc(img.dataUrl)}>
                            <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { onApply(t.images); onClose(); }}
                          className="flex-1 text-[11px] bg-green-600/20 text-green-400 py-1.5 rounded-lg hover:bg-green-600/30 transition-colors font-medium">적용</button>
                        <button onClick={() => startEdit(t)}
                          className="text-[11px] bg-gray-700/50 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">수정</button>
                        <button onClick={() => onDelete(t.id)}
                          className="text-[11px] bg-red-900/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors">삭제</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1.5 block">템플릿 이름</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="예: 화장품 깔끔 배경"
                  className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2.5 border border-gray-700 focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1.5 block">이미지 ({newImages.length}장)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 group cursor-pointer" onClick={() => setPreviewSrc(img.dataUrl)}>
                      <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={e => { e.stopPropagation(); setNewImages(prev => prev.filter((_, j) => j !== i)); }}
                        className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                  ))}
                  <button onClick={() => createInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 hover:border-violet-500 flex items-center justify-center text-gray-600 hover:text-violet-400 transition-colors text-xl">+</button>
                  <input ref={createInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesForCreate} />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!newName.trim() || newImages.length === 0}
                className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors">
                템플릿 저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 이미지 미리보기 */}
      {previewSrc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80" onClick={() => setPreviewSrc(null)}>
          <img src={previewSrc} alt="preview" className="max-w-[80vw] max-h-[80vh] rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════ */
export default function SPImageModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  /* ── 상품 이미지 (1~4) ── */
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const productRef = useRef<HTMLInputElement>(null);

  /* ── 레퍼런스 이미지 + 템플릿 ── */
  const [references, setReferences] = useState<UploadedImage[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Set<number>>(new Set());
  const [templates, setTemplates] = useState<RefTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const refInputRef = useRef<HTMLInputElement>(null);

  /* ── 참고 이미지 (1~4) ── */
  const [extraImages, setExtraImages] = useState<UploadedImage[]>([]);
  const extraRef = useRef<HTMLInputElement>(null);

  /* ── 프롬프트 / 설정 ── */
  const [promptText, setPromptText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('2K');
  const [imageCount, setImageCount] = useState(1);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [showModelPicker, setShowModelPicker] = useState(false);

  /* ── 생성 결과 ── */
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState('');

  /* ── 뷰어 / 히스토리 ── */
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* ── 템플릿 로드/저장 (localStorage + Supabase) ── */
  const loadTemplates = useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('image_ref_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setTemplates(data.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, images: (r.images as { dataUrl: string; base64: string }[]) || [] })));
    } catch {
      const saved = localStorage.getItem('sp_ref_templates');
      if (saved) try { setTemplates(JSON.parse(saved)); } catch { /* noop */ }
    }
  }, []);

  const saveTemplate = async (name: string, images: UploadedImage[]) => {
    const tmpl: RefTemplate = { id: `tmpl_${Date.now()}`, name, images };
    const next = [tmpl, ...templates];
    setTemplates(next);
    localStorage.setItem('sp_ref_templates', JSON.stringify(next));
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from('image_ref_templates').insert({ id: tmpl.id, user_id: user.id, name, images });
      }
    } catch { /* fallback localStorage */ }
  };

  const deleteTemplate = async (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    localStorage.setItem('sp_ref_templates', JSON.stringify(next));
    try {
      const sb = createClient();
      await sb.from('image_ref_templates').delete().eq('id', id);
    } catch { /* noop */ }
  };

  const updateTemplate = async (id: string, name: string, images: UploadedImage[]) => {
    const next = templates.map(t => t.id === id ? { ...t, name, images } : t);
    setTemplates(next);
    localStorage.setItem('sp_ref_templates', JSON.stringify(next));
    try {
      const sb = createClient();
      await sb.from('image_ref_templates').update({ name, images }).eq('id', id);
    } catch { /* noop */ }
  };

  const applyTemplate = (images: UploadedImage[]) => {
    setReferences(images);
    setSelectedRefs(new Set(images.map((_, i) => i)));
  };

  /* ── 히스토리 로드/저장 ── */
  const loadHistory = useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('image_gen_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (data) setHistory(data.map((r: Record<string, unknown>) => ({ id: r.id as string, prompt: r.prompt as string, model: r.model as string, images: (r.images as string[]) || [], createdAt: new Date(r.created_at as string).getTime() })));
    } catch {
      const saved = localStorage.getItem('sp_image_history');
      if (saved) try { setHistory(JSON.parse(saved)); } catch { /* noop */ }
    }
  }, []);

  const saveToHistory = async (prompt: string, model: string, images: string[]) => {
    const item: HistoryItem = { id: `hist_${Date.now()}`, prompt, model, images, createdAt: Date.now() };
    const next = [item, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem('sp_image_history', JSON.stringify(next));
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from('image_gen_history').insert({ id: item.id, user_id: user.id, prompt, model, images, created_at: new Date().toISOString() });
      }
    } catch { /* noop */ }
  };

  useEffect(() => { loadTemplates(); loadHistory(); }, [loadTemplates, loadHistory]);

  /* ── 파일 업로드 핸들러 (자동 리사이즈) ── */
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>,
    maxCount: number,
    currentCount: number,
  ) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxCount - currentCount;
    if (remaining <= 0) return;
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        const raw = reader.result as string;
        const resized = await resizeImage(raw, 1024);
        setter(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  /* ── 이미지 생성 ── */
  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setGenerating(true);
    setError('');

    const modelInfo = MODELS.find(m => m.id === selectedModel);
    if (modelInfo && !modelInfo.available) {
      setError(`${modelInfo.label}은 아직 연동 준비 중입니다. 다른 모델을 선택해주세요.`);
      setGenerating(false);
      return;
    }

    const selectedRefImages = Array.from(selectedRefs).map(i => references[i]).filter(Boolean);
    const hasRefs = selectedRefImages.length > 0;
    const totalImages = hasRefs ? selectedRefImages.length * imageCount : imageCount;

    setGeneratedImages(Array.from({ length: totalImages }, () => ({ base64: '', status: 'loading' as const })));

    type Job = { idx: number; refBase64: string | null };
    const jobs: Job[] = [];

    if (hasRefs) {
      selectedRefImages.forEach((ref, refIdx) => {
        for (let c = 0; c < imageCount; c++) {
          jobs.push({ idx: refIdx * imageCount + c, refBase64: ref.base64 });
        }
      });
    } else {
      for (let c = 0; c < imageCount; c++) {
        jobs.push({ idx: c, refBase64: null });
      }
    }

    const promises = jobs.map(async (job) => {
      try {
        const refList = job.refBase64 ? [job.refBase64] : [];
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText.trim(),
            aspectRatio,
            imageSize: resolution,
            model: selectedModel,
            productImageBase64: productImages[0]?.base64 || null,
            productImagesBase64: productImages.map(p => p.base64),
            referenceImagesBase64: refList,
            extraImagesBase64: extraImages.map(e => e.base64),
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(text.slice(0, 100) || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.error) {
          const st = data.isSafety ? 'violation' : 'error';
          setGeneratedImages(prev => prev.map((img, ii) => ii === job.idx ? { ...img, status: st as 'violation' | 'error', base64: '', errorMsg: data.error } : img));
          if (job.idx === 0) setError(data.error);
        } else if (data.images?.[0]) {
          setGeneratedImages(prev => prev.map((img, ii) => ii === job.idx ? { base64: data.images[0], status: 'done' } : img));
        } else {
          setGeneratedImages(prev => prev.map((img, ii) => ii === job.idx ? { ...img, status: 'error', errorMsg: '이미지가 반환되지 않았습니다.' } : img));
        }
      } catch (err) {
        setGeneratedImages(prev => prev.map((img, ii) => ii === job.idx ? { ...img, status: 'error', errorMsg: err instanceof Error ? err.message : '네트워크 오류' } : img));
      }
    });

    await Promise.all(promises);
    setGenerating(false);

    setGeneratedImages(prev => {
      const completed = prev.filter(i => i.status === 'done' && i.base64).map(i => i.base64);
      if (completed.length > 0) {
        saveToHistory(promptText, selectedModel, completed);
      }
      return prev;
    });
  };

  /* ── 다운로드 ── */
  const handleDownloadSingle = (base64: string, idx: number) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    const blob = new Blob([bytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `image_${idx + 1}.png`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    const done = generatedImages.filter(i => i.status === 'done');
    if (done.length === 0) return;
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    done.forEach((img, i) => {
      const binary = atob(img.base64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      zip.file(`image_${i + 1}.png`, bytes);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `generated_${Date.now()}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  const curModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  const totalGenCount = selectedRefs.size > 0 ? selectedRefs.size * imageCount : imageCount;
  const doneCount = generatedImages.filter(i => i.status === 'done').length;

  /* ═══════════ RENDER ═══════════ */
  return (
    <ModalShell worker={worker} onClose={onClose} wide>
      <div className="flex h-full" style={{ minHeight: 560 }}>
        {/* ────── LEFT: 입력 패널 ────── */}
        <div className="w-[460px] flex-shrink-0 border-r border-gray-800 overflow-y-auto p-5 space-y-4">

          {/* 상품 이미지 (1~4) */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">📦 상품 이미지 <span className="text-gray-600">({productImages.length}/4)</span></span>
              {productImages.length < 4 && (
                <button onClick={() => productRef.current?.click()} className="text-[10px] text-pink-400 hover:text-pink-300">+ 추가</button>
              )}
            </div>
            <input ref={productRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleFileUpload(e, setProductImages, 4, productImages.length)} />
            {productImages.length === 0 ? (
              <button onClick={() => productRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-gray-700 hover:border-pink-500/30 rounded-xl text-gray-600 text-xs transition-colors">
                상품 사진 업로드 (최대 4장)
              </button>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {productImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-pink-500/40 group cursor-pointer"
                    onClick={() => setZoomSrc(img.dataUrl)}>
                    <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                    <button onClick={e => { e.stopPropagation(); setProductImages(prev => prev.filter((_, j) => j !== i)); }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                    </div>
                  </div>
                ))}
                {productImages.length < 4 && (
                  <button onClick={() => productRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 hover:border-pink-500/40 flex items-center justify-center text-gray-600 hover:text-pink-400 transition-colors text-lg">+</button>
                )}
              </div>
            )}
          </section>

          {/* 레퍼런스 이미지 */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">🖼️ 레퍼런스 이미지</span>
              <div className="flex gap-2">
                <button onClick={() => setShowTemplates(!showTemplates)} className="text-[10px] text-violet-400 hover:text-violet-300">+ 템플릿</button>
                <button onClick={() => refInputRef.current?.click()} className="text-[10px] text-pink-400 hover:text-pink-300">+ 추가</button>
              </div>
            </div>
            <input ref={refInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleFileUpload(e, setReferences, 14, references.length)} />

            {references.length === 0 ? (
              <button onClick={() => refInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-700 hover:border-pink-500/30 rounded-xl text-gray-600 text-xs transition-colors">
                레퍼런스 이미지 업로드
              </button>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {references.map((ref, i) => (
                  <div key={i} onClick={() => { const s = new Set(selectedRefs); if (s.has(i)) s.delete(i); else s.add(i); setSelectedRefs(s); }}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedRefs.has(i) ? 'border-pink-500 ring-1 ring-pink-500/30' : 'border-gray-700'
                    }`}>
                    <img src={ref.dataUrl} alt="" className="w-full h-full object-cover" />
                    {selectedRefs.has(i) && <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center"><span className="text-white text-[10px] font-bold">✓</span></div>}
                    <button onClick={e => { e.stopPropagation(); setReferences(prev => prev.filter((_, j) => j !== i)); setSelectedRefs(prev => { const n = new Set<number>(); prev.forEach(x => { if (x < i) n.add(x); else if (x > i) n.add(x - 1); }); return n; }); }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-black/70 text-white rounded-full text-[7px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}
            {references.length > 0 && (
              <p className="text-[9px] text-gray-600 mt-1">
                클릭하여 선택 ({selectedRefs.size}개)
                {selectedRefs.size > 0 && <span className="text-pink-400/70"> → 총 {selectedRefs.size} × {imageCount} = {selectedRefs.size * imageCount}장 생성</span>}
              </p>
            )}
          </section>

          {/* 참고 이미지 (번호 부여) */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">📎 참고 이미지 <span className="text-gray-600">({extraImages.length}/4)</span></span>
              {extraImages.length < 4 && (
                <button onClick={() => extraRef.current?.click()} className="text-[10px] text-cyan-400 hover:text-cyan-300">+ 추가</button>
              )}
            </div>
            <input ref={extraRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleFileUpload(e, setExtraImages, 4, extraImages.length)} />
            {extraImages.length === 0 ? (
              <button onClick={() => extraRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-cyan-500/30 rounded-xl text-gray-600 text-[11px] transition-colors">
                참고 이미지 업로드 → 프롬프트에서 &apos;참고 이미지 N번&apos;으로 지칭
              </button>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {extraImages.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer" onClick={() => setZoomSrc(img.dataUrl)}>
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-cyan-500/40">
                      <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">{i + 1}번</div>
                    <button onClick={e => { e.stopPropagation(); setExtraImages(prev => prev.filter((_, j) => j !== i)); }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-black/70 text-white rounded-full text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 프롬프트 */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">✏️ 프롬프트</span>
            </div>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {PROMPT_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => setPromptText(t.text)}
                  className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-700 hover:text-white transition-colors border border-gray-700 truncate max-w-[180px]">
                  {t.label}
                </button>
              ))}
            </div>
            <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
              placeholder="생성할 이미지를 설명해주세요..."
              rows={3}
              className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 border border-gray-700" />
          </section>

          {/* 설정: 비율 / 해상도 / 매수 */}
          <section className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-gray-500 mb-1">비율</div>
              <div className="flex flex-col gap-1">
                {ASPECT_RATIOS.map(r => (
                  <button key={r} onClick={() => setAspectRatio(r)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] transition-colors ${aspectRatio === r ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 mb-1">해상도</div>
              <div className="flex flex-col gap-1">
                {RESOLUTIONS.map(r => (
                  <button key={r} onClick={() => setResolution(r)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] transition-colors ${resolution === r ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 mb-1">레퍼런스당</div>
              <div className="flex flex-col gap-1">
                {IMAGE_COUNTS.map(c => (
                  <button key={c} onClick={() => setImageCount(c)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] transition-colors ${imageCount === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {c}장
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 모델 선택 + 생성 버튼 */}
          <section className="flex gap-2">
            <div className="relative">
              <button onClick={() => setShowModelPicker(!showModelPicker)}
                className="h-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-[11px] text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-1.5 min-w-[130px]">
                <span className="text-violet-400 font-medium">{curModel.label}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-10 overflow-hidden">
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${
                        selectedModel === m.id ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-gray-800 text-gray-300'
                      } ${!m.available ? 'opacity-50' : ''}`}>
                      <span className="text-xs font-medium flex-1">{m.label}</span>
                      {m.tag && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        m.available ? 'bg-violet-600/30 text-violet-300' : 'bg-gray-700 text-gray-500'
                      }`}>{m.tag}</span>}
                      {!m.available && <span className="text-[9px] text-gray-600">준비중</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleGenerate} disabled={generating || !promptText.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-xs font-medium transition-all">
              {generating ? '🔄 생성 중...' : `🎨 이미지 생성 (${totalGenCount}장)`}
            </button>
          </section>

          {error && <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-2.5 text-red-400 text-[11px]">{error}</div>}
        </div>

        {/* ────── RIGHT: 프리뷰 패널 ────── */}
        <div className="flex-1 overflow-y-auto bg-gray-950/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-medium">🖼️ 프리뷰</span>
            <div className="flex gap-2">
              {doneCount > 0 && (
                <button onClick={handleDownloadZip} className="text-[10px] bg-green-600/20 text-green-400 px-2.5 py-1 rounded-lg hover:bg-green-600/30 transition-colors">📦 ZIP</button>
              )}
              <button onClick={() => setShowHistory(!showHistory)}
                className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${showHistory ? 'bg-violet-600/20 text-violet-400' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                📋 히스토리
              </button>
            </div>
          </div>

          {/* 히스토리 */}
          {showHistory && (
            <div className="mb-4 space-y-2">
              <div className="text-[10px] text-gray-500 font-medium">최근 생성 기록</div>
              {history.length === 0 && <p className="text-[10px] text-gray-600">기록이 없습니다.</p>}
              {history.map(h => (
                <div key={h.id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-2 flex gap-2">
                  <div className="flex gap-1 flex-shrink-0">
                    {h.images.slice(0, 2).map((b64, i) => (
                      <img key={i} src={`data:image/png;base64,${b64}`} alt="" className="w-10 h-10 rounded object-cover cursor-pointer"
                        onClick={() => setZoomSrc(`data:image/png;base64,${b64}`)} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-300 truncate">{h.prompt}</p>
                    <p className="text-[9px] text-gray-600">{new Date(h.createdAt).toLocaleDateString('ko-KR')} · {h.images.length}장</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 생성된 이미지 / 로딩 */}
          {generatedImages.length > 0 ? (
            <div className={`grid gap-3 ${generatedImages.length === 1 ? 'grid-cols-1' : generatedImages.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {generatedImages.map((img, i) => (
                <div key={i} className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                  {img.status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-pink-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-pink-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      </div>
                      <div className="text-[11px] text-gray-400 animate-pulse">이미지 생성 중...</div>
                      <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-progress" />
                      </div>
                    </div>
                  )}
                  {img.status === 'done' && (
                    <div className="group cursor-pointer h-full" onClick={() => setZoomSrc(`data:image/png;base64,${img.base64}`)}>
                      <img src={`data:image/png;base64,${img.base64}`} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">🔍 확대</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDownloadSingle(img.base64, i); }}
                        className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">⬇</button>
                    </div>
                  )}
                  {img.status === 'violation' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/30">
                      <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                        <span className="text-2xl">🚫</span>
                      </div>
                      <span className="text-red-400 text-[11px] font-medium">위반된 이미지</span>
                      <span className="text-red-500/60 text-[9px]">안전 정책에 의해 차단됨</span>
                    </div>
                  )}
                  {img.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-yellow-950/20 p-3">
                      <div className="w-12 h-12 rounded-full bg-yellow-900/40 flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <span className="text-yellow-400 text-[11px] font-medium">생성 실패</span>
                      <span className="text-yellow-500/60 text-[9px] text-center leading-relaxed max-w-[200px]">{img.errorMsg || '알 수 없는 오류'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-700">
              <div className="text-4xl mb-3">🎨</div>
              <p className="text-xs">이미지를 생성하면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 이미지 확대 뷰어 */}
      {zoomSrc && <ImageZoom src={zoomSrc} onClose={() => setZoomSrc(null)} />}

      {/* 템플릿 관리 플로팅 창 */}
      <TemplateManager
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={templates}
        onSave={saveTemplate}
        onDelete={deleteTemplate}
        onApply={applyTemplate}
        onUpdate={updateTemplate}
      />

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
        .animate-progress {
          animation: progress 8s ease-out forwards;
        }
      `}</style>
    </ModalShell>
  );
}
