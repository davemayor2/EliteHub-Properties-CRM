import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintProcess from '@/components/ComplaintProcess';
import { supabaseServer } from '@/lib/supabase/server';
import { getActivePublicCategories } from '@/lib/categories/categories';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const categories = await getActivePublicCategories(supabaseServer).catch(() => []);

  return (
    <>
      {/* 1. TOP NAVIGATION */}
      <Navbar />

      <main className="main-content">
        {/* 2. HERO / INTRODUCTION */}
        <Hero />

        {/* 3. COMPLAINT FORM & SUCCESS FLOW */}
        <ComplaintForm initialCategories={categories} />

        {/* 4. 'WHAT HAPPENS NEXT?' PROCESS TIMELINE */}
        <ComplaintProcess />
      </main>
    </>
  );
}
