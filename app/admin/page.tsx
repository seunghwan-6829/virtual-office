'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (userId: string, status: string) => {
    const supabase = createClient();
    await supabase.from('profiles').update({ status }).eq('id', userId);
    load();
  };

  const filtered = profiles.filter(p => p.status === tab);
  const pendingCount = profiles.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">관리자 페이지</h1>
            <p className="text-gray-400 text-sm mt-1">사용자 승인 및 관리</p>
          </div>
          <button onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors">
            오피스로 돌아가기
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-gray-900 rounded-xl p-1">
          {(['pending', 'active', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t === 'pending' ? '대기 중' : t === 'active' ? '승인됨' : '거절됨'}
              {t === 'pending' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-12">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            {tab === 'pending' ? '대기 중인 사용자가 없습니다' : tab === 'active' ? '승인된 사용자가 없습니다' : '거절된 사용자가 없습니다'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-sm flex-shrink-0">
                  {(p.display_name || p.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{p.display_name || '(이름 없음)'}</div>
                  <div className="text-gray-500 text-xs truncate">{p.email}</div>
                  <div className="text-gray-600 text-[10px] mt-0.5">
                    {new Date(p.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    {p.role === 'admin' && <span className="ml-1 text-amber-400 font-bold">ADMIN</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {tab === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(p.id, 'active')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition-colors">
                        승인
                      </button>
                      <button onClick={() => updateStatus(p.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-medium transition-colors">
                        거절
                      </button>
                    </>
                  )}
                  {tab === 'active' && p.role !== 'admin' && (
                    <button onClick={() => updateStatus(p.id, 'rejected')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">
                      비활성화
                    </button>
                  )}
                  {tab === 'rejected' && (
                    <button onClick={() => updateStatus(p.id, 'active')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors">
                      재승인
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
