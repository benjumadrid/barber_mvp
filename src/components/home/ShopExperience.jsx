import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Armchair, ZoomIn, X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Sparkles, Maximize2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MOCK_GALLERY_IMAGES } from '../../data/galleryData';
import shopVideo from '../../assets/shop_video.mp4';

export default function ShopExperience({ gallery = [] }) {
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const modalVideoRef = useRef(null);
  const displayGallery = (gallery && gallery.length > 0) ? gallery : MOCK_GALLERY_IMAGES;

  // Toggle inline video playback
  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Toggle inline video mute
  const toggleMute = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Close modals with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
        setIsVideoModalOpen(false);
      } else if (activeImageIndex !== null) {
        if (e.key === 'ArrowLeft') {
          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displayGallery.length - 1));
        } else if (e.key === 'ArrowRight') {
          setActiveImageIndex((prev) => (prev < displayGallery.length - 1 ? prev + 1 : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, displayGallery.length, isVideoModalOpen]);

  return (
    <section id="experience" className="py-16 sm:py-24 bg-[#FAF6F1] border-t border-[#E6DDD1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[3px] bg-[#E5A93C] rounded-full"></span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8C4717] font-bold">
                Atmosphere & Space
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
              THE SHOP EXPERIENCE
            </h2>
            <p className="text-[#6E5D52] text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Step inside our modern masculine salon at Nhatty Barber House designed for executive comfort, chilled vibes, and master grooming.
            </p>
          </div>

          {/* Quick Perks */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-2 rounded-xl bg-white border border-[#E2D7C8] text-xs sm:text-sm font-bold text-[#5C4E44] flex items-center gap-2 shadow-sm">
              <Coffee className="w-4 h-4 text-[#C88A22]" />
              <span>Complimentary Espresso</span>
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-white border border-[#E2D7C8] text-xs sm:text-sm font-bold text-[#5C4E44] flex items-center gap-2 shadow-sm">
              <Armchair className="w-4 h-4 text-[#C88A22]" />
              <span>Luxury Gold & Leather Chairs</span>
            </span>
          </div>
        </div>

        {/* ── Featured Vertical Video Showcase & Room Overview ── */}
        <div className="mb-14 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-stretch">
          
          {/* Vertical Phone-Sized Video Card */}
          <div 
            onClick={() => setIsVideoModalOpen(true)}
            className="group relative bg-[#1E1915] rounded-3xl border border-[#E5A93C]/40 overflow-hidden shadow-2xl cursor-pointer flex flex-col justify-between max-w-sm mx-auto lg:max-w-none w-full"
            style={{ aspectRatio: '9/15' }}
          >
            <video
              ref={videoRef}
              src={shopVideo}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 p-5 flex items-center justify-between pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Virtual Room Tour</span>
              </div>

              <div className="w-9 h-9 rounded-full bg-[#E5A93C] text-[#1A1614] flex items-center justify-center shadow-lg font-bold">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            {/* Center Tap to Watch Hint */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-[#E5A93C] text-[#1A1614] flex items-center justify-center shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                <Play className="w-7 h-7 fill-current ml-1" />
              </div>
              <span className="text-white text-xs font-extrabold tracking-wider uppercase mt-3 bg-black/70 px-3.5 py-1 rounded-full backdrop-blur-sm">
                Tap for Fullscreen
              </span>
            </div>

            {/* Bottom Controls & Info */}
            <div className="relative z-10 p-5 flex items-end justify-between">
              <div>
                <p className="text-white text-base sm:text-lg font-bold font-['Cinzel',serif] tracking-wide leading-tight">
                  Take a Look Around Our Salon
                </p>
                <p className="text-xs text-[#E5A93C] font-semibold mt-1">
                  Tap to watch in full resolution
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all shadow-lg"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-[#E5A93C]" /> : <Volume2 className="w-4 h-4 text-[#E5A93C]" />}
                </button>
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-[#E5A93C] text-[#1A1614] flex items-center justify-center font-bold transition-all shadow-lg hover:scale-105"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Companion Detail Card */}
          <div className="bg-white rounded-3xl border border-[#E6DDD1] p-8 sm:p-10 flex flex-col justify-between shadow-luxury-md">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-[#FAF6F1] border border-[#E2D7C8] text-xs font-extrabold text-[#8C4717] uppercase tracking-wider">
                  Inside Our Salon
                </span>
                <span className="text-xs text-[#8C4717] font-semibold">Lucy Hotel Ground Floor</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
                  Modern Architecture & VIP Barber Stations
                </h3>
                <div className="w-12 h-0.5 rounded-full bg-[#E5A93C]" />
              </div>

              <p className="text-sm sm:text-base text-[#6E5D52] leading-relaxed">
                As shown in our walkthrough, Nhatty Barber House is designed with luxury gold hydraulic chairs, custom honeycomb LED ceiling fixtures, and studio-grade lighting stations for unmatched grooming precision.
              </p>

              {/* Atmosphere Checklist Based Directly on Video */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FAF6F1] border border-[#E2D7C8] space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8C4717]">VIP Seating</p>
                  <p className="text-sm font-extrabold text-[#1E1915]">Gold & Leather Recliners</p>
                  <p className="text-xs text-[#6E5D52]">Heavy-duty polished gold hydraulic barber chairs</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F1] border border-[#E2D7C8] space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8C4717]">Lighting Design</p>
                  <p className="text-sm font-extrabold text-[#1E1915]">Honeycomb LED Ceilings</p>
                  <p className="text-xs text-[#6E5D52]">Geometric overhead lights providing shadow-free haircut visibility</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F1] border border-[#E2D7C8] space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8C4717]">Studio Setup</p>
                  <p className="text-sm font-extrabold text-[#1E1915]">Ring Light Styling Bay</p>
                  <p className="text-xs text-[#6E5D52]">Dedicated studio ring light setup for client transformations</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F1] border border-[#E2D7C8] space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8C4717]">Modern Interior</p>
                  <p className="text-sm font-extrabold text-[#1E1915]">Fluted Feature Walls</p>
                  <p className="text-xs text-[#6E5D52]">Vertical wood slat paneling with illuminated accent strips</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#EFE9E2] flex items-center justify-between text-xs sm:text-sm font-bold text-[#8C4717]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                100% Authentic Shop Footage
              </span>
              <span className="text-[#C88A22]">Master Barber Experience</span>
            </div>
          </div>

        </div>

        {/* ── Photo Gallery Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayGallery.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => setActiveImageIndex(idx)}
              className="group bg-white rounded-2xl border border-[#E6DDD1] hover:border-[#E5A93C] overflow-hidden transition-all duration-300 shadow-luxury-md hover:shadow-luxury-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              {/* Photo Container */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[#FAF6F1]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                
                {/* Top Overlay Badge & Zoom Icon */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-xs font-bold text-white shadow-sm">
                    {item.category}
                  </span>

                  <div className="w-9 h-9 rounded-full bg-[#E5A93C] text-[#1E1915] flex items-center justify-center shadow-md opacity-90 group-hover:scale-110 transition-transform">
                    <ZoomIn className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Complete Text Area */}
              <div className="p-6 sm:p-7 flex flex-col justify-between flex-grow space-y-3">
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E1915] font-['Cinzel',serif] group-hover:text-[#8C4717] transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#6E5D52] leading-relaxed">
                    {item.caption}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#EFE9E2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8C4717] group-hover:text-[#C88A22] transition-colors">
                    Tap to view high resolution photo
                  </span>
                  <span className="text-xs font-bold text-[#8C4717] group-hover:translate-x-1 transition-transform">
                    ↗
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Fullscreen Video Modal (Opens on Tap) ── */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsVideoModalOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsVideoModalOpen(false)}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-50 shadow-2xl"
            aria-label="Close video"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative max-h-[90vh] w-full max-w-md flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={modalVideoRef}
              src={shopVideo}
              autoPlay
              controls
              playsInline
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-[#E5A93C]/40"
            />
            <div className="mt-3 text-center text-white">
              <h4 className="text-base sm:text-lg font-bold font-['Cinzel',serif] text-white">
                Inside Nhatty Barber House
              </h4>
              <p className="text-xs text-[#E5A93C] font-semibold">
                Lucy Hotel (Ground Floor) · Dessie Branch
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen High-Resolution Lightbox Modal (For Photos) ── */}
      {activeImageIndex !== null && displayGallery[activeImageIndex] && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setActiveImageIndex(null)}
        >
          {/* Modal Container */}
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] bg-[#1E1915] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title & Close Button */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 text-white bg-black/40">
              <div>
                <span className="text-xs text-[#E5A93C] font-bold uppercase tracking-wider">
                  {displayGallery[activeImageIndex].category} • Nhatty Barber House
                </span>
                <h3 className="text-base sm:text-xl font-extrabold font-['Cinzel',serif]">
                  {displayGallery[activeImageIndex].title}
                </h3>
              </div>

              <button
                onClick={() => setActiveImageIndex(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close photo view"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Photo View with Nav Buttons */}
            <div className="relative flex-grow flex items-center justify-center p-2 sm:p-6 bg-black/60 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displayGallery.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors z-10"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={displayGallery[activeImageIndex].image}
                alt={displayGallery[activeImageIndex].title}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev < displayGallery.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors z-10"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Caption Footer */}
            <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 text-white flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <p className="text-xs sm:text-sm text-white/80 max-w-2xl">
                {displayGallery[activeImageIndex].caption}
              </p>
              <span className="text-xs text-[#E5A93C] font-semibold shrink-0">
                {activeImageIndex + 1} of {displayGallery.length}
              </span>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
