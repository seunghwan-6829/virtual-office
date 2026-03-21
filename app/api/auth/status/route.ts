import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'unauthenticated' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ status: 'error', msg: 'no service key' });

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } },
  );

  let { data: profile } = await admin
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const isAdmin = (user.email ?? '').toLowerCase() === 'motiol_6829@naver.com';
    await admin.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      display_name: user.user_metadata?.display_name ?? '',
      role: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'active' : 'pending',
    });

    const { data: newProfile } = await admin
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single();
    profile = newProfile;
  }

  if (!profile) return NextResponse.json({ status: 'error', msg: 'profile creation failed' });
  return NextResponse.json({ status: profile.status, role: profile.role });
}
