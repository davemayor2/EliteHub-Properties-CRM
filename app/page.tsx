import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintProcess from '@/components/ComplaintProcess';

export default function HomePage() {
  return (
    <>
      {/* 1. TOP NAVIGATION */}
      <Navbar />

      <main className="main-content">
        {/* 2. HERO / INTRODUCTION */}
        <Hero />

        {/* 3. COMPLAINT FORM & SUCCESS FLOW */}
        <ComplaintForm />

        {/* 4. 'WHAT HAPPENS NEXT?' PROCESS TIMELINE */}
        <ComplaintProcess />
      </main>
    </>
  );
}
