import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId, email, displayName } = await req.json();
  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } },
  );

  const isAdmin = email.toLowerCase() === 'motiol_6829@naver.com';

  const { error } = await admin.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName || '',
    role: isAdmin ? 'admin' : 'user',
    status: isAdmin ? 'active' : 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isAdmin });
}
