import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } },
  );
}

async function getAuthUser() {
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
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const roleKey = req.nextUrl.searchParams.get('role_key');
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  let query = sb
    .from('agent_training')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (roleKey) {
    query = query.eq('role_key', roleKey);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { role_key, training_type, content } = await req.json();
  if (!role_key || !training_type || !content) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { data, error } = await sb.from('agent_training').insert({
    user_id: user.id,
    role_key,
    training_type,
    content,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { error } = await sb.from('agent_training').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
