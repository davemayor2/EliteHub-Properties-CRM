import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://guxsqzmiqhduswqnorna.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do NOT run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rule 1: Protected Staff Area (e.g. /staff/dashboard, /staff/complaints, /staff/settings, etc.)
  // If user is unauthenticated and accessing any /staff/* route except /staff/login -> redirect to /staff/login
  if (pathname.startsWith('/staff') && pathname !== '/staff/login') {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/staff/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Rule 2: If user is authenticated and visits /staff/login -> redirect to /staff/dashboard
  if (pathname === '/staff/login') {
    if (user) {
      const url = request.nextUrl.clone();
      const redirectTarget = request.nextUrl.searchParams.get('redirect') || '/staff/dashboard';
      url.pathname = redirectTarget.startsWith('/staff') ? redirectTarget : '/staff/dashboard';
      url.searchParams.delete('redirect');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
