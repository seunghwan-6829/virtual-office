'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'active') {
      router.push('/');
      router.refresh();
    } else if (profile?.status === 'rejected') {
      await supabase.auth.signOut();
      router.push('/login?error=rejected');
    }
    setChecking(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    const iv = setInterval(checkStatus, 10000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-4">
          <div className="text-5xl mb-2">
            <span className="inline-block animate-bounce">⏳</span>
          </div>
          <h2 className="text-white text-xl font-bold">승인 대기 중</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            회원가입이 완료되었습니다.<br />
            관리자가 승인하면 서비스를 이용할 수 있습니다.
          </p>
          <p className="text-gray-600 text-xs">자동으로 상태를 확인하고 있습니다...</p>

          <div className="flex gap-2 pt-2">
            <button onClick={checkStatus} disabled={checking}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors">
              {checking ? '확인 중...' : '상태 확인'}
            </button>
            <button onClick={handleLogout}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
