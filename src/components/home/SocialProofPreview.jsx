import React, { useState, useEffect } from 'react';
import { Star, Sparkles, ZoomIn, X, ChevronLeft, ChevronRight, CheckCircle2, Scissors } from 'lucide-react';
import { MOCK_SOCIAL_POSTS } from '../../data/socialProofData';

export default function SocialProofPreview({ posts }) {
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
    <section id="reviews" className="py-16 sm:py-24 bg-[#F4EFEB] border-t border-[#E6DDD1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[3px] bg-[#E5A93C] rounded-full"></span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8C4717] font-bold">
                Real Client Transformations
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
              RECENT WORK & CLIENT SAMPLES
            </h2>
            <p className="text-[#6E5D52] text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Authentic cuts and styling captured straight from our chairs at Nhatty Barber House.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E6DDD1] text-xs sm:text-sm font-bold text-[#8C4717] shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-[#C88A22]" />
            <span>Click any photo to zoom in</span>
          </div>
        </div>

        {/* Real Transformations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Transformation Cards */}
          {displayPosts.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => setActivePhotoIndex(idx)}
              className="group bg-white rounded-2xl border border-[#E6DDD1] hover:border-[#E5A93C] transition-all duration-300 shadow-luxury-sm hover:shadow-luxury-lg overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              {/* Photo Frame */}
              <div className="relative aspect-[4/4.8] overflow-hidden bg-[#FAF6F1]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                  loading="lazy"
                />
                
                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Top Badge */}
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-white border border-white/15">
                    {item.category}
                  </span>
                </div>

                {/* Zoom Hint */}
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

              {/* Card Body - Large & Fully Readable without Truncation */}
              <div className="p-6 sm:p-7 space-y-3">
                <h3 className="text-lg sm:text-xl font-bold text-[#1E1915] group-hover:text-[#8C4717] transition-colors font-['Cinzel',serif]">
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

          {/* ─ Vertical Custom Style Notice Card (Placed at the End, White Luxury Style) ─ */}
          <div className="bg-white rounded-2xl border border-[#E6DDD1] hover:border-[#E5A93C] p-6 sm:p-7 shadow-luxury-sm hover:shadow-luxury-lg flex flex-col justify-between transition-all duration-300">
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

      </div>

      {/* ── Fullscreen Lightbox Modal ── */}
      {activePhotoIndex !== null && displayPosts[activePhotoIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-50 shadow-xl"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev button */}
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

          {/* Next button */}
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

          {/* Modal Content */}
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={displayPosts[activePhotoIndex].image}
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

    </section>
  );
}
