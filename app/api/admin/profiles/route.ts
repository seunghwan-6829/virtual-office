import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } },
  );
}

async function verifyAdmin() {
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
  if (!user) return false;

  const admin = getAdmin();
  if (!admin) return false;

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = getAdmin()!;
  const { data } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { userId, status } = await req.json();
  if (!userId || !status) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const admin = getAdmin()!;
  await admin.from('profiles').update({ status }).eq('id', userId);
  return NextResponse.json({ ok: true });
}
