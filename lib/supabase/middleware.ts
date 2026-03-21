import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const publicPaths = ['/login', '/signup', '/pending'];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/sprites') || pathname.includes('.');

  if (isStatic) return supabaseResponse;

  if (!user) {
    if (isPublic) return supabaseResponse;
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Use service role to bypass RLS for profile status check
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Fallback: allow through if service key not available
    if (isPublic) return supabaseResponse;
    return supabaseResponse;
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    },
  );

  const { data: profile } = await adminClient
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status === 'pending') {
    if (pathname === '/pending' || isPublic) return supabaseResponse;
    if (isApi) return NextResponse.json({ error: 'Account pending approval' }, { status: 403 });
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  if (profile.status === 'rejected') {
    if (isPublic) return supabaseResponse;
    return NextResponse.redirect(new URL('/login?error=rejected', request.url));
  }

  if (pathname.startsWith('/admin') && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublic && !pathname.startsWith('/pending')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}
