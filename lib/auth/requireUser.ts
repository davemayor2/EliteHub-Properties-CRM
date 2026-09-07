import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

/**
 * Ensures the request is from an authenticated user.
 * Redirects to /staff/login if unauthenticated.
 */
export async function requireUser(redirectPath?: string): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const target = redirectPath ? `/staff/login?redirect=${encodeURIComponent(redirectPath)}` : '/staff/login';
    redirect(target);
  }

  return { user, supabase };
}
