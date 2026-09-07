'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton({ className = '' }: { className?: string }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      router.refresh();
      router.push('/staff/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/staff/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`btn-staff-logout ${className}`}
      aria-label="Sign out of staff portal"
    >
      <LogOut size={16} />
      <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
    </button>
  );
}
