import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Sparkles, ZoomIn, X, ChevronLeft, ChevronRight, CheckCircle2, Scissors } from 'lucide-react';
import { MOCK_SOCIAL_POSTS } from '../data/socialProofData';

export default function SocialProofPlaceholder() {
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const displayPosts = MOCK_SOCIAL_POSTS;

  // Keyboard navigation for lightbox modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePhotoIndex === null) return;
      if (e.key === 'Escape') setActivePhotoIndex(null);
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (prev + 1) % displayPosts.length);
      }
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev - 1 + displayPosts.length) % displayPosts.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, displayPosts.length]);

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#735E52] hover:text-[#191310] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF4EA] border border-[#EADBCA] text-xs font-bold text-[#8C4717]">
          <Sparkles className="w-3.5 h-3.5 text-[#C88A22]" />
          <span>Real Client Results & Work Samples</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#231B15] font-['Cinzel',serif] tracking-tight">
          THE NHATTY WORK & TRANSFORMATION SHOWCASE
        </h1>
        <p className="text-xs sm:text-sm text-[#735E52] max-w-xl mx-auto leading-relaxed">
          Real photography from our master barber chairs at Nhatty Barber House.
        </p>
      </div>

      {/* Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">

        {/* Transformation Cards */}
        {displayPosts.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => setActivePhotoIndex(idx)}
            className="group bg-[#FFFDF9] rounded-2xl border border-[#E8DECF] hover:border-[#E5A93C] transition-all duration-300 shadow-luxury-sm hover:shadow-luxury-lg overflow-hidden flex flex-col justify-between cursor-pointer"
          >
            <div className="relative aspect-[4/4.8] overflow-hidden bg-[#FAF6F1]">
              <img
                src={item.image || item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 opacity-85 group-hover:opacity-60 transition-opacity" />

              {/* Badges */}
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-white border border-white/15">
                  {item.category}
                </span>
              </div>

              {/* Center Zoom Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-[#1A1614]/80 backdrop-blur-md text-white flex items-center justify-center shadow-xl border border-white/20">
                  <ZoomIn className="w-6 h-6 text-[#E5A93C]" />
                </div>
              </div>

              {/* Bottom Stars */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                {[...Array(item.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-[#E5A93C] fill-[#E5A93C]" />
                ))}
              </div>
            </div>

            {/* Card Content - Large & Clean */}
            <div className="p-6 sm:p-7 space-y-3">
              <h3 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif]">
                {item.title}
              </h3>
              <p className="text-sm sm:text-[15px] text-[#5C4E44] leading-relaxed">
                {item.review}
              </p>
              <div className="pt-3 border-t border-[#EFE9E2] flex items-center justify-between text-xs font-bold text-[#8C4717]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Master Barber Craft
                </span>
                <span className="text-[#C88A22] group-hover:underline">Inspect Photo →</span>
              </div>
            </div>
          </div>
        ))}

        {/* ─ Vertical Custom Style Notice Card (Placed at the End, Matching White Luxury Style) ─ */}
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E8DECF] hover:border-[#E5A93C] p-6 sm:p-7 shadow-luxury-sm hover:shadow-luxury-lg flex flex-col justify-between transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-[#FAF6F1] border border-[#E2D7C8] text-xs font-extrabold text-[#8C4717] uppercase tracking-wider">
                Bespoke Requests
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center text-[#C88A22]">
                <Scissors className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] leading-snug">
                Get Any Cut or Style You Want
              </h3>
              <div className="w-10 h-0.5 rounded-full bg-[#E5A93C]" />
            </div>

            <p className="text-sm sm:text-[15px] text-[#5C4E44] leading-relaxed pt-1">
              These photos are samples of our everyday craftsmanship. You are not limited to these styles — show your master barber any reference photo or describe your preferred cut upon arrival, and we will execute it to perfection.
            </p>
          </div>

          <div className="pt-4 border-t border-[#EFE9E2] flex items-center gap-2 text-xs font-bold text-[#8C4717]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Custom Tailored to You</span>
          </div>
        </div>

      </div>

      {/* Lightbox Modal */}
      {activePhotoIndex !== null && displayPosts[activePhotoIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-50 shadow-xl"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIndex((prev) => (prev - 1 + displayPosts.length) % displayPosts.length);
            }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors z-50 shadow-xl"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIndex((prev) => (prev + 1) % displayPosts.length);
            }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors z-50 shadow-xl"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={displayPosts[activePhotoIndex].image || displayPosts[activePhotoIndex].thumbnail}
              alt={displayPosts[activePhotoIndex].title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/15"
            />
            
            <div className="mt-4 text-center text-white space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {[...Array(displayPosts[activePhotoIndex].rating || 5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#E5A93C] fill-[#E5A93C]" />
                ))}
              </div>
              <h4 className="text-xl font-bold font-['Cinzel',serif]">
                {displayPosts[activePhotoIndex].title}
              </h4>
              <p className="text-sm sm:text-base text-white/80 max-w-lg">
                {displayPosts[activePhotoIndex].review}
              </p>
              <p className="text-xs text-[#E5A93C] font-semibold pt-1">
                {activePhotoIndex + 1} / {displayPosts.length} · Nhatty Barber House
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
