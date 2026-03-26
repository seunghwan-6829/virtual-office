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

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const [msgRes, trainRes, taskRes] = await Promise.all([
    sb.from('office_messages')
      .select('id, from_id, from_name, to_id, to_name, message, type, created_at', { count: 'exact' })
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    sb.from('agent_training')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    sb.from('task_records')
      .select('id, worker_id, worker_name', { count: 'exact' })
      .eq('user_id', user.id),
  ]);

  return NextResponse.json({
    messages: msgRes.data ?? [],
    messageCount: msgRes.count ?? 0,
    trainings: trainRes.data ?? [],
    trainingCount: trainRes.count ?? 0,
    tasks: taskRes.data ?? [],
    taskCount: taskRes.count ?? 0,
  });
}
