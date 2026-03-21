'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email,
          displayName,
        }),
      });

      const result = await res.json();
      if (result.isAdmin) {
        router.push('/');
        router.refresh();
        return;
      }
    }

    router.push('/pending');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Virtual Office</h1>
          <p className="text-gray-400 text-sm">새 계정을 만들어 시작하세요</p>
        </div>

        <form onSubmit={handleSignup} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">이름</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="이름 입력" required autoFocus
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="6자 이상" required minLength={6}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl text-sm font-bold transition-all">
            {loading ? '가입 처리 중...' : '회원가입'}
          </button>

          <p className="text-gray-600 text-[11px] text-center">
            가입 후 관리자 승인이 필요합니다
          </p>
        </form>

        <p className="text-center text-gray-500 text-xs mt-4">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300 underline">로그인</a>
        </p>
      </div>
    </div>
  );
}
