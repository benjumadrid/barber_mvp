import React from 'react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';

/**
 * Main Layout wrapper with subtle luxury background
 */
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4EFEB] text-[#1E1915] flex flex-col selection:bg-[#E5A93C] selection:text-[#1E1915]">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
