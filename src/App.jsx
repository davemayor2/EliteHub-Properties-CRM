import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ComplaintForm from './components/ComplaintForm';
import ComplaintProcess from './components/ComplaintProcess';
import SuccessModal from './components/SuccessModal';

export default function App() {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmitSuccess = (data) => {
    setSubmittedData(data);
    setIsSuccessModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSuccessModalOpen(false);
  };

  return (
    <div className="app-wrapper">
      {/* 1. TOP NAVIGATION */}
      <Navbar />

      <main className="main-content">
        {/* 2. HERO / INTRODUCTION */}
        <Hero />

        {/* 3. COMPLAINT FORM */}
        <ComplaintForm onSubmitSuccess={handleSubmitSuccess} />

        {/* 4. 'WHAT HAPPENS NEXT?' PROCESS TIMELINE */}
        <ComplaintProcess />
      </main>

      {/* Submission Success Dialog */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseModal}
        formData={submittedData}
      />
    </div>
  );
}
