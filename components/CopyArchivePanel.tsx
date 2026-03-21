'use client';

import { useState, useEffect, useRef } from 'react';
import { useOfficeStore } from '@/lib/store';
import { CopyArchiveItem } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};

type ViewMode = 'list' | 'detail' | 'edit' | 'add';

export default function CopyArchivePanel() {
  const open = useOfficeStore(s => s.copyArchiveOpen);
  const setOpen = useOfficeStore(s => s.setCopyArchiveOpen);
  const archive = useOfficeStore(s => s.copyArchive);
  const addItem = useOfficeStore(s => s.addCopyArchiveItem);
  const updateItem = useOfficeStore(s => s.updateCopyArchiveItem);
  const removeItem = useOfficeStore(s => s.removeCopyArchiveItem);

  const [view, setView] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'project' | 'manual'>('all');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!open || loaded || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); loadingRef.current = false; return; }
        const { data } = await supabase
          .from('copy_archive')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (data) {
          const items: CopyArchiveItem[] = data.map(d => ({
            id: d.id,
            title: d.title,
            content: d.content,
            source: d.source as 'project' | 'manual',
            projectId: d.project_id ?? undefined,
            roleKey: d.role_key ?? undefined,
            workerName: d.worker_name ?? undefined,
            createdAt: new Date(d.created_at).getTime(),
            updatedAt: new Date(d.updated_at).getTime(),
          }));
          useOfficeStore.getState().setCopyArchive(items);
        }
        setLoaded(true);
      } catch { /* noop */ }
      setLoading(false);
      loadingRef.current = false;
    })();
  }, [open, loaded]);

  useEffect(() => {
    if (!open) setLoaded(false);
  }, [open]);

  const saveToSupabase = async (item: CopyArchiveItem) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('copy_archive').upsert({
        id: item.id,
        user_id: user.id,
        title: item.title,
        content: item.content,
        source: item.source,
        project_id: item.projectId ?? null,
        role_key: item.roleKey ?? null,
        worker_name: item.workerName ?? null,
        updated_at: new Date().toISOString(),
      });
    } catch { /* noop */ }
  };

  const deleteFromSupabase = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from('copy_archive').delete().eq('id', id);
    } catch { /* noop */ }
  };

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;
    const now = Date.now();
    const newItem: Omit<CopyArchiveItem, 'id'> = {
      title: title.trim(),
      content: content.trim(),
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    };
    addItem(newItem);
    const added = useOfficeStore.getState().copyArchive;
    const latest = added[added.length - 1];
    if (latest) saveToSupabase(latest);
    setTitle('');
    setContent('');
    setView('list');
  };

  const handleUpdate = () => {
    if (!selectedId || !title.trim() || !content.trim()) return;
    updateItem(selectedId, { title: title.trim(), content: content.trim() });
    const updated = useOfficeStore.getState().copyArchive.find(c => c.id === selectedId);
    if (updated) saveToSupabase(updated);
    setView('detail');
  };

  const handleDelete = (id: string) => {
    removeItem(id);
    deleteFromSupabase(id);
    setView('list');
    setSelectedId(null);
  };

  if (!open) return null;

  const filtered = archive.filter(item => {
    if (filter === 'all') return true;
    return item.source === filter;
  });

  const selected = archive.find(c => c.id === selectedId);

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 w-[480px] bg-gray-900/98 backdrop-blur-xl border-l border-gray-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-white font-bold text-sm">카피 보관함</h3>
          <p className="text-gray-500 text-xs mt-0.5">상세페이지 카피 · BP 기획안 관리</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
      </div>

      {view === 'list' && (
        <>
          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1">
              {(['all', 'project', 'manual'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {f === 'all' ? '전체' : f === 'project' ? '프로젝트' : '직접 등록'}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={() => { setTitle(''); setContent(''); setView('add'); }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors">
              + 새 카피
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && <div className="text-gray-600 text-xs text-center py-8">로딩 중...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-gray-600 text-xs text-center py-12">
                {filter === 'all' ? '보관된 카피가 없습니다' : '해당 유형의 카피가 없습니다'}
              </div>
            )}
            {filtered.map(item => (
              <div key={item.id}
                onClick={() => { setSelectedId(item.id); setView('detail'); }}
                className="bg-gray-800/60 hover:bg-gray-800 rounded-xl p-3 cursor-pointer transition-colors border border-gray-700/50 hover:border-gray-600">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white text-sm font-medium truncate flex-1">{item.title || '제목 없음'}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    item.source === 'project' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {item.source === 'project' ? '프로젝트' : '직접 등록'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{item.content.slice(0, 120)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.workerName && <span className="text-gray-500 text-[10px]">{item.workerName}</span>}
                  <span className="text-gray-600 text-[10px]">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'detail' && selected && (
        <>
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setView('list'); setSelectedId(null); }}
              className="text-gray-400 hover:text-white text-xs transition-colors">← 목록</button>
            <div className="flex-1" />
            <button onClick={() => { setTitle(selected.title); setContent(selected.content); setView('edit'); }}
              className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
              편집
            </button>
            <button onClick={() => handleDelete(selected.id)}
              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors">
              삭제
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-white font-bold text-base mb-1">{selected.title}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                selected.source === 'project' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {selected.source === 'project' ? '프로젝트' : '직접 등록'}
              </span>
              {selected.workerName && <span className="text-gray-500 text-xs">{selected.workerName}</span>}
              <span className="text-gray-600 text-xs">
                {new Date(selected.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
              </span>
            </div>
            <div className="report-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {selected.content}
              </ReactMarkdown>
            </div>
          </div>
          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <button onClick={() => navigator.clipboard.writeText(selected.content)}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs transition-colors">
              텍스트 복사
            </button>
          </div>
        </>
      )}

      {(view === 'add' || view === 'edit') && (
        <>
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setView(view === 'edit' ? 'detail' : 'list')}
              className="text-gray-400 hover:text-white text-xs transition-colors">← 취소</button>
            <span className="text-white text-sm font-medium">{view === 'add' ? '새 카피 등록' : '카피 수정'}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1">제목</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="카피 제목 (예: OO제품 상세페이지 카피 v1)"
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1">내용 (마크다운 지원)</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="카피 본문, BP 기획안 내용을 입력하세요..."
                rows={16}
                className="w-full bg-gray-800 text-white text-xs rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-mono leading-relaxed" />
            </div>
          </div>
          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <button onClick={view === 'add' ? handleAdd : handleUpdate}
              disabled={!title.trim() || !content.trim()}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
              {view === 'add' ? '등록' : '저장'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
