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

/* ── 카테고리 ──────────────────────────────── */
const CATEGORIES = [
  { id: 'minimal', label: '미니멀', icon: '◻️' },
  { id: 'luxury', label: '럭셔리', icon: '✨' },
  { id: 'nature', label: '자연', icon: '🌿' },
  { id: 'vivid', label: '비비드', icon: '🎨' },
  { id: 'modern', label: '모던', icon: '🔷' },
  { id: 'vintage', label: '빈티지', icon: '📷' },
  { id: 'white', label: '화이트', icon: '🤍' },
  { id: 'dark', label: '다크', icon: '🖤' },
];

/* ── 타입 ─────────────────────────────────── */
interface UploadedImage { dataUrl: string; base64: string }
interface RefTemplate { id: string; category: string; images: { dataUrl: string; base64: string }[]; name?: string }
interface GeneratedImage { base64: string; status: 'loading' | 'done' | 'violation' | 'error'; errorMsg?: string }
interface ImageBatch { id: string; images: GeneratedImage[]; prompt: string; createdAt: number }

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
  onSave: (category: string, images: UploadedImage[]) => void;
  onDelete: (id: string) => void;
  onApply: (images: UploadedImage[]) => void;
  onUpdate: (id: string, category: string, images: UploadedImage[]) => void;
}) {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [filterCat, setFilterCat] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState('');
  const [editImages, setEditImages] = useState<UploadedImage[]>([]);
  const [newCat, setNewCat] = useState(CATEGORIES[0].id);
  const [newImages, setNewImages] = useState<UploadedImage[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        const resized = await resizeImage(reader.result as string, 1024);
        setter(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const filtered = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  };

  const handleApply = () => {
    const allImages = templates.filter(t => selectedIds.has(t.id)).flatMap(t => t.images);
    if (allImages.length > 0) { onApply(allImages); onClose(); }
  };

  const startEdit = (t: RefTemplate) => {
    setEditingId(t.id); setEditCat(t.category); setEditImages([...t.images]);
  };

  const saveEdit = () => {
    if (editingId && editImages.length > 0) { onUpdate(editingId, editCat, editImages); setEditingId(null); }
  };

  const handleCreate = () => {
    if (newImages.length > 0) {
      for (const img of newImages) {
        onSave(newCat, [img]);
      }
      setNewImages([]);
      setTab('list');
    }
  };

  const confirmDelete = (id: string) => { setConfirmDeleteId(id); };
  const doDelete = () => { if (confirmDeleteId) { onDelete(confirmDeleteId); setConfirmDeleteId(null); setSelectedIds(prev => { const s = new Set(prev); s.delete(confirmDeleteId); return s; }); } };

  const catLabel = (id: string) => CATEGORIES.find(c => c.id === id);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[92vw] max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-bold text-sm">🖼️ 레퍼런스 템플릿</h3>
          <div className="flex items-center gap-2">
            {tab === 'list' && templates.length > 0 && (
              <button onClick={() => { setEditMode(!editMode); if (editMode) setEditingId(null); }}
                className={`text-[11px] px-3 py-1.5 rounded-lg transition-colors ${editMode ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {editMode ? '완료' : '편집'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          <button onClick={() => { setTab('list'); setEditMode(false); setEditingId(null); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'list' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
            저장된 템플릿 ({templates.length})
          </button>
          <button onClick={() => { setTab('create'); setEditMode(false); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'create' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
            + 새 템플릿
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'list' && (
            <div className="p-5">
              {/* Category Filter */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                <button onClick={() => setFilterCat('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${filterCat === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>전체</button>
                {CATEGORIES.map(c => {
                  const count = templates.filter(t => t.category === c.id).length;
                  if (count === 0) return null;
                  return (
                    <button key={c.id} onClick={() => setFilterCat(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${filterCat === c.id ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {c.icon} {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-xs mb-3">저장된 템플릿이 없습니다</p>
                  <button onClick={() => setTab('create')} className="text-[11px] text-violet-400 hover:text-violet-300">+ 새 템플릿 만들기</button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filtered.map(t => {
                    const selected = selectedIds.has(t.id);
                    const isEditing = editingId === t.id;
                    const cat = catLabel(t.category);
                    return (
                      <div key={t.id} className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        selected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-gray-800 hover:border-gray-600'
                      }`}>
                        {isEditing ? (
                          <div className="p-3 space-y-2 bg-gray-800">
                            <div className="flex gap-1 flex-wrap">
                              {CATEGORIES.map(c => (
                                <button key={c.id} onClick={() => setEditCat(c.id)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${editCat === c.id ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                  {c.icon}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {editImages.map((img, i) => (
                                <div key={i} className="relative w-10 h-10 rounded overflow-hidden group">
                                  <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                                  <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                                    className="absolute inset-0 bg-red-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-[8px]">✕</button>
                                </div>
                              ))}
                              <button onClick={() => editInputRef.current?.click()} className="w-10 h-10 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-500 text-sm">+</button>
                              <input ref={editInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e, setEditImages)} />
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => setEditingId(null)} className="flex-1 text-[10px] bg-gray-700 text-gray-300 py-1 rounded-lg">취소</button>
                              <button onClick={saveEdit} className="flex-1 text-[10px] bg-violet-600 text-white py-1 rounded-lg">저장</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Thumbnail — 강제 1:1 */}
                            <div className="relative w-full overflow-hidden cursor-pointer" style={{ paddingBottom: '100%' }}
                              onClick={() => !editMode && toggleSelect(t.id)}>
                              {t.images.length === 1 ? (
                                <img src={t.images[0].dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] bg-gray-800">
                                  {t.images.slice(0, 4).map((img, i) => (
                                    <img key={i} src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Bottom bar */}
                            <div className="bg-gray-900/90 px-2 py-1.5 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">{cat?.icon} {cat?.label} · {t.images.length}장</span>
                              {selected && !editMode && <span className="text-violet-400 text-[10px] font-bold">✓</span>}
                            </div>
                            {/* Edit overlay */}
                            {editMode && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                                <button onClick={() => startEdit(t)} className="text-[10px] bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">수정</button>
                                <button onClick={() => confirmDelete(t.id)} className="text-[10px] bg-red-700 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">삭제</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'create' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-2 block">카테고리 선택</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setNewCat(c.id)}
                      className={`px-3 py-2 rounded-xl text-xs transition-all ${newCat === c.id ? 'bg-violet-600 text-white ring-2 ring-violet-400/30' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-2 block">이미지 업로드 ({newImages.length}장)</label>
                <div className="flex flex-wrap gap-2">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-600 group">
                      <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setNewImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                  ))}
                  <button onClick={() => createInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-600 hover:border-violet-500 flex items-center justify-center text-gray-600 hover:text-violet-400 transition-colors text-2xl">+</button>
                  <input ref={createInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e, setNewImages)} />
                </div>
              </div>
              <button onClick={handleCreate} disabled={newImages.length === 0}
                className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors">
                템플릿 저장
              </button>
            </div>
          )}
        </div>

        {/* 하단 적용 버튼 */}
        {tab === 'list' && selectedIds.size > 0 && !editMode && (
          <div className="border-t border-gray-700 px-5 py-3 flex-shrink-0">
            <button onClick={handleApply}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-medium transition-all">
              선택한 템플릿 적용 ({selectedIds.size}개 · {templates.filter(t => selectedIds.has(t.id)).reduce((a, t) => a + t.images.length, 0)}장)
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">🗑️</div>
            <p className="text-white text-sm font-medium mb-1">정말 삭제하시겠습니까?</p>
            <p className="text-gray-500 text-xs mb-5">삭제하면 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 transition-colors">취소</button>
              <button onClick={doDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs hover:bg-red-500 transition-colors">삭제</button>
            </div>
          </div>
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
  const [textPreserve, setTextPreserve] = useState(false);

  /* ── 생성 결과 (배치 누적, 최신이 위) ── */
  const [generating, setGenerating] = useState(false);
  const [batches, setBatches] = useState<ImageBatch[]>([]);
  const [error, setError] = useState('');

  /* ── 뷰어 / 수정 ── */
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ batchId: string; imgIdx: number; base64: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  /* ── 템플릿 로드/저장 (localStorage + Supabase) ── */
  const loadTemplates = useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('image_ref_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setTemplates(data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        category: (r.name as string) || 'minimal',
        images: (r.images as { dataUrl: string; base64: string }[]) || [],
      })));
    } catch {
      const saved = localStorage.getItem('sp_ref_templates');
      if (saved) try { setTemplates(JSON.parse(saved)); } catch { /* noop */ }
    }
  }, []);

  const saveTemplate = async (category: string, images: UploadedImage[]) => {
    const tmpl: RefTemplate = { id: `tmpl_${Date.now()}`, category, images };
    const next = [tmpl, ...templates];
    setTemplates(next);
    localStorage.setItem('sp_ref_templates', JSON.stringify(next));
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from('image_ref_templates').insert({ id: tmpl.id, user_id: user.id, name: category, images });
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

  const updateTemplate = async (id: string, category: string, images: UploadedImage[]) => {
    const next = templates.map(t => t.id === id ? { ...t, category, images } : t);
    setTemplates(next);
    localStorage.setItem('sp_ref_templates', JSON.stringify(next));
    try {
      const sb = createClient();
      await sb.from('image_ref_templates').update({ name: category, images }).eq('id', id);
    } catch { /* noop */ }
  };

  const applyTemplate = (images: UploadedImage[]) => {
    setReferences(prev => [...prev, ...images]);
    setSelectedRefs(prev => {
      const s = new Set(prev);
      const start = references.length;
      images.forEach((_, i) => s.add(start + i));
      return s;
    });
  };

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  /* ── 파일 업로드 핸들러 (자동 리사이즈) ── */
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>,
    maxCount: number,
    currentCount: number,
    autoSelect?: boolean,
  ) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxCount - currentCount;
    if (remaining <= 0) return;
    let addedCount = 0;
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        const raw = reader.result as string;
        const resized = await resizeImage(raw, 1024);
        setter(prev => {
          const newIdx = prev.length;
          if (autoSelect) {
            setSelectedRefs(s => new Set(s).add(newIdx));
          }
          return [...prev, resized];
        });
      };
      reader.readAsDataURL(file);
      addedCount++;
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

    const batchId = `batch_${Date.now()}`;
    const newBatch: ImageBatch = {
      id: batchId,
      prompt: promptText.trim(),
      createdAt: Date.now(),
      images: Array.from({ length: totalImages }, () => ({ base64: '', status: 'loading' as const })),
    };
    setBatches(prev => [newBatch, ...prev]);

    const updateBatchImage = (idx: number, update: Partial<GeneratedImage>) => {
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, images: b.images.map((img, ii) => ii === idx ? { ...img, ...update } : img) } : b));
    };

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
            textPreserve,
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
          updateBatchImage(job.idx, { status: st as 'violation' | 'error', base64: '', errorMsg: data.error });
          if (job.idx === 0) setError(data.error);
        } else if (data.images?.[0]) {
          updateBatchImage(job.idx, { base64: data.images[0], status: 'done' });
        } else {
          updateBatchImage(job.idx, { status: 'error', errorMsg: '이미지가 반환되지 않았습니다.' });
        }
      } catch (err) {
        updateBatchImage(job.idx, { status: 'error', errorMsg: err instanceof Error ? err.message : '네트워크 오류' });
      }
    });

    await Promise.all(promises);
    setGenerating(false);
  };

  /* ── 이미지 수정 (리파인) — 같은 창에서 프리뷰 갱신 ── */
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [editError, setEditError] = useState('');

  const handleEditImage = async () => {
    if (!editTarget || !editPrompt.trim()) return;
    setEditLoading(true);
    setEditError('');

    const srcBase64 = editTarget.base64;
    const reqPrompt = editPrompt.trim();
    setEditPrompt('');

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: reqPrompt,
          aspectRatio,
          imageSize: resolution,
          model: 'gemini-3-pro-image-preview',
          productImagesBase64: [],
          referenceImagesBase64: [srcBase64],
          extraImagesBase64: [],
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text.slice(0, 100) || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        setEditError(data.error);
      } else if (data.images?.[0]) {
        const newBase64 = data.images[0];
        setEditHistory(prev => [srcBase64, ...prev]);
        setEditTarget(prev => prev ? { ...prev, base64: newBase64 } : null);

        const refineBatch: ImageBatch = {
          id: `refine_${Date.now()}`,
          prompt: `✏️ ${reqPrompt}`,
          createdAt: Date.now(),
          images: [{ base64: newBase64, status: 'done' }],
        };
        setBatches(prev => [refineBatch, ...prev]);
      } else {
        setEditError('이미지가 반환되지 않았습니다.');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '네트워크 오류');
    }
    setEditLoading(false);
  };

  const handleEditUndo = () => {
    if (editHistory.length === 0) return;
    const [prev, ...rest] = editHistory;
    setEditHistory(rest);
    setEditTarget(t => t ? { ...t, base64: prev } : null);
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
    const allDone = batches.flatMap(b => b.images.filter(i => i.status === 'done'));
    if (allDone.length === 0) return;
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    allDone.forEach((img, i) => {
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

  const handleDownloadBatchZip = async (batch: ImageBatch) => {
    const done = batch.images.filter(i => i.status === 'done');
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
    a.href = url; a.download = `batch_${batch.id}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  const curModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  const totalGenCount = selectedRefs.size > 0 ? selectedRefs.size * imageCount : imageCount;
  const allDoneCount = batches.reduce((acc, b) => acc + b.images.filter(i => i.status === 'done').length, 0);

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
              onChange={e => handleFileUpload(e, setReferences, 14, references.length, true)} />

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

          {/* 텍스트/로고 보존 강화 */}
          <section>
            <button onClick={() => setTextPreserve(!textPreserve)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-colors border ${
                textPreserve
                  ? 'bg-amber-600/15 border-amber-500/40 text-amber-300'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-300'
              }`}>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 ${textPreserve ? 'bg-amber-500 text-black' : 'bg-gray-700'}`}>
                {textPreserve ? '✓' : ''}
              </span>
              <span className="flex-1 text-left">텍스트/로고 보존 강화</span>
              <span className="text-[9px] text-gray-600">{textPreserve ? 'ON' : 'OFF'}</span>
            </button>
            {textPreserve && (
              <p className="text-[9px] text-amber-500/60 mt-1 px-1">상품의 글자·로고·숫자를 최대한 정확하게 보존합니다 (생성 속도가 약간 느려질 수 있음)</p>
            )}
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
        <div className="flex-1 flex flex-col bg-gray-950/50">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <span className="text-xs text-gray-400 font-medium">🖼️ 프리뷰</span>
            <div className="flex gap-2">
              {allDoneCount > 0 && (
                <button onClick={handleDownloadZip} className="text-[10px] bg-green-600/20 text-green-400 px-2.5 py-1 rounded-lg hover:bg-green-600/30 transition-colors">📦 전체 ZIP ({allDoneCount}장)</button>
              )}
              {batches.length > 0 && (
                <button onClick={() => setBatches([])} className="text-[10px] bg-gray-800 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-700 hover:text-gray-300 transition-colors">전체 삭제</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {batches.length > 0 ? (
              <div className="space-y-4">
                {batches.map((batch, bIdx) => {
                  const batchDone = batch.images.filter(i => i.status === 'done').length;
                  const cols = batch.images.length === 1 ? 'grid-cols-1' : batch.images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
                  return (
                    <div key={batch.id} className={`rounded-xl border p-3 ${bIdx === 0 && generating ? 'border-pink-500/40 bg-pink-950/10' : 'border-gray-800 bg-gray-900/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-500 truncate max-w-[60%]">{batch.prompt}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {batchDone > 0 && (
                            <button onClick={() => handleDownloadBatchZip(batch)} className="text-[9px] text-green-400 hover:text-green-300 transition-colors">ZIP</button>
                          )}
                          <button onClick={() => setBatches(prev => prev.filter(b => b.id !== batch.id))} className="text-[9px] text-gray-600 hover:text-red-400 transition-colors">삭제</button>
                        </div>
                      </div>
                      <div className={`grid gap-2 ${cols}`}>
                        {batch.images.map((img, i) => (
                          <div key={i} className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                            {img.status === 'loading' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <div className="relative w-12 h-12">
                                  <div className="absolute inset-0 rounded-full border-2 border-pink-500/20" />
                                  <div className="absolute inset-0 rounded-full border-2 border-t-pink-500 animate-spin" />
                                  <div className="absolute inset-2 rounded-full border-2 border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                </div>
                                <div className="text-[10px] text-gray-400 animate-pulse">생성 중...</div>
                                <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-progress" />
                                </div>
                              </div>
                            )}
                            {img.status === 'done' && (
                              <div className="group h-full relative">
                                <img src={`data:image/png;base64,${img.base64}`} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setZoomSrc(`data:image/png;base64,${img.base64}`)}
                                    className="w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded-full text-sm flex items-center justify-center transition-colors" title="확대">🔍</button>
                                  <button onClick={() => { setEditTarget({ batchId: batch.id, imgIdx: i, base64: img.base64 }); setEditPrompt(''); }}
                                    className="w-8 h-8 bg-violet-600/80 hover:bg-violet-500 text-white rounded-full text-sm flex items-center justify-center transition-colors" title="수정">✏️</button>
                                </div>
                                <button onClick={() => handleDownloadSingle(img.base64, i)}
                                  className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">⬇</button>
                              </div>
                            )}
                            {img.status === 'violation' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-950/30">
                                <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                                  <span className="text-xl">🚫</span>
                                </div>
                                <span className="text-red-400 text-[10px] font-medium">위반된 이미지</span>
                              </div>
                            )}
                            {img.status === 'error' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-yellow-950/20 p-2">
                                <div className="w-10 h-10 rounded-full bg-yellow-900/40 flex items-center justify-center">
                                  <span className="text-xl">⚠️</span>
                                </div>
                                <span className="text-yellow-400 text-[10px] font-medium">생성 실패</span>
                                <span className="text-yellow-500/60 text-[8px] text-center leading-relaxed max-w-[160px]">{img.errorMsg || '알 수 없는 오류'}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-700">
                <div className="text-4xl mb-3">🎨</div>
                <p className="text-xs">이미지를 생성하면 여기에 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 이미지 확대 뷰어 */}
      {zoomSrc && <ImageZoom src={zoomSrc} onClose={() => setZoomSrc(null)} />}

      {/* 이미지 수정 (좌: 프리뷰 / 우: 입력) */}
      {editTarget && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70" onClick={() => { setEditTarget(null); setEditHistory([]); setEditError(''); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h4 className="text-white text-sm font-bold">이미지 수정</h4>
                <p className="text-gray-500 text-[10px]">수정할 내용을 입력하면 이 화면에서 바로 결과를 확인할 수 있습니다</p>
              </div>
              <div className="flex items-center gap-2">
                {editHistory.length > 0 && (
                  <button onClick={handleEditUndo} className="text-[10px] text-gray-400 hover:text-white bg-gray-800 px-2.5 py-1.5 rounded-lg transition-colors">
                    ↩ 되돌리기 ({editHistory.length})
                  </button>
                )}
                <button onClick={() => { setEditTarget(null); setEditHistory([]); setEditError(''); }} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
              </div>
            </div>

            <div className="flex" style={{ minHeight: 480 }}>
              {/* 좌측: 이미지 프리뷰 */}
              <div className="flex-1 flex items-center justify-center p-6 bg-gray-950/50 relative">
                {editLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-bl-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      </div>
                      <span className="text-violet-300 text-xs animate-pulse">수정 중...</span>
                    </div>
                  </div>
                )}
                <img
                  src={`data:image/png;base64,${editTarget.base64}`}
                  alt="현재 이미지"
                  className="max-w-full max-h-[460px] rounded-xl border border-gray-700 object-contain shadow-lg"
                />
                {/* 다운로드 */}
                <button onClick={() => handleDownloadSingle(editTarget.base64, 0)}
                  className="absolute bottom-7 right-7 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full text-sm flex items-center justify-center transition-colors">⬇</button>
              </div>

              {/* 우측: 입력 패널 */}
              <div className="w-[320px] flex-shrink-0 border-l border-gray-800 p-5 flex flex-col gap-3">
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="text-gray-400 text-[10px] font-medium block mb-1.5">수정 요청</label>
                    <textarea
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      placeholder="수정할 내용을 입력하세요..."
                      rows={4}
                      autoFocus
                      className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none placeholder-gray-600"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && editPrompt.trim()) { e.preventDefault(); handleEditImage(); } }}
                    />
                  </div>

                  {editError && (
                    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-2 text-red-400 text-[10px]">{editError}</div>
                  )}

                  <div>
                    <label className="text-gray-500 text-[10px] block mb-1.5">빠른 수정</label>
                    <div className="flex flex-wrap gap-1">
                      {['배경 흰색으로', '밝기 올리기', '상품 더 크게', '그림자 추가', '따뜻한 분위기', '색감 선명하게', '노이즈 제거', '각도 변경'].map(q => (
                        <button key={q} onClick={() => setEditPrompt(prev => prev ? `${prev}, ${q}` : q)}
                          className="px-2 py-1 bg-gray-800 text-gray-500 rounded-md text-[9px] hover:bg-violet-600/20 hover:text-violet-400 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editHistory.length > 0 && (
                    <div>
                      <label className="text-gray-500 text-[10px] block mb-1.5">수정 이력 ({editHistory.length}회)</label>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {editHistory.map((h, i) => (
                          <div key={i}
                            onClick={() => { setEditTarget(t => t ? { ...t, base64: h } : null); setEditHistory(prev => prev.filter((_, j) => j !== i)); }}
                            className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden border border-gray-700 hover:border-violet-500 cursor-pointer transition-colors"
                            title={`${i + 1}번째 이전 버전`}>
                            <img src={`data:image/png;base64,${h}`} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleEditImage} disabled={!editPrompt.trim() || editLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-xs font-medium transition-all">
                  {editLoading ? '🔄 수정 중...' : '✏️ 수정 요청'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
