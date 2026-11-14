import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Move, 
  ExternalLink,
  Sparkles,
  X,
  ArrowDownToLine,
  ArrowUpToLine
} from 'lucide-react';

/**
 * High-Definition Interactive Receipt Zoom, Pan & Vertical Scroll Viewer
 * 
 * Capabilities:
 * - Natural vertical mouse-wheel scrolling to inspect long receipts/SMS threads
 * - Zoom in / out up to 4x (400%) via buttons, pinch, or Ctrl+wheel
 * - One-click "Jump to Latest Payment (Bottom)" and "Jump to Top"
 * - Smooth click-and-drag and touch panning across tall mobile screenshots
 * - Double-click toggle (1x <-> 2.5x)
 * - Cycle zoom button (100% -> 200% -> 300% -> 400% -> 100%)
 * - Edge-to-edge fullscreen inspection overlay with Escape key shortcut
 * - Native "Open Full Image" in a separate browser tab
 * - Dual themes: 'dark' (Barber Dashboard) and 'light' (Customer Portal)
 */
export default function ReceiptZoomViewer({
  src,
  alt = 'Payment Receipt',
  fileName = 'payment_receipt.png',
  theme = 'dark', // 'dark' | 'light'
  className = '',
  maxHeightClass = 'max-h-[50vh]',
  allowFullscreen = true
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const fsContainerRef = useRef(null);
  const isZoomed = scale > 1;

  // Generous vertical and horizontal boundaries for long phone/SMS screenshots
  const getMaxBoundY = useCallback((currentScale) => {
    return Math.max(1200, Math.round(2200 * Math.max(1, currentScale)));
  }, []);

  const getMaxBoundX = useCallback((currentScale) => {
    return Math.round(600 * Math.max(0, currentScale - 1));
  }, []);

  // Reset zoom & pan when image src changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [src]);

  // Escape key handler for fullscreen inspection
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Zoom controls
  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setScale(prev => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setScale(prev => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCycleZoom = (e) => {
    e?.stopPropagation();
    setScale(prev => {
      if (prev < 2) return 2;
      if (prev < 3) return 3;
      if (prev < 4) return 4;
      setPosition({ x: 0, y: 0 });
      return 1;
    });
  };

  // Jump to Bottom (Latest Payment) and Jump to Top
  const handleScrollToBottom = (e) => {
    e?.stopPropagation();
    const boundY = getMaxBoundY(scale);
    // If at 1x, gently zoom to 1.5x so details are clear, then pan to bottom
    if (scale === 1) {
      setScale(1.5);
      setPosition({ x: 0, y: -Math.round(boundY * 0.7) });
    } else {
      setPosition(prev => ({ ...prev, y: -boundY }));
    }
  };

  const handleScrollToTop = (e) => {
    e?.stopPropagation();
    const boundY = getMaxBoundY(scale);
    setPosition(prev => ({ ...prev, y: boundY }));
  };

  // Double click to toggle 1x and 2.5x
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1 || position.y !== 0) {
      handleResetZoom(e);
    } else {
      setScale(2.5);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Mouse wheel: Normal scrolling scrolls vertically down/up; Ctrl+wheel zooms in/out
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl + Wheel
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setScale(prev => {
        const next = Math.min(4, Math.max(1, Math.round((prev + delta) * 100) / 100));
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    } else {
      // Natural vertical scrolling down/up the receipt
      const scrollSpeed = 1.4;
      const deltaY = e.deltaY * scrollSpeed;
      const boundY = getMaxBoundY(scale);
      setPosition(prev => ({
        ...prev,
        y: Math.max(-boundY, Math.min(boundY, prev.y - deltaY))
      }));
    }
  }, [scale, getMaxBoundY]);

  // Attach non-passive wheel listeners to active viewport container
  useEffect(() => {
    const el = isFullscreen ? fsContainerRef.current : containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, isFullscreen]);

  // Mouse Drag / Pan Handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const boundX = getMaxBoundX(scale);
    const boundY = getMaxBoundY(scale);
    setPosition({
      x: scale > 1 ? Math.max(-boundX, Math.min(boundX, newX)) : 0,
      y: Math.max(-boundY, Math.min(boundY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile Devices
  const touchStartRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - touchStartRef.current.x;
    const newY = e.touches[0].clientY - touchStartRef.current.y;
    const boundX = getMaxBoundX(scale);
    const boundY = getMaxBoundY(scale);
    setPosition({
      x: scale > 1 ? Math.max(-boundX, Math.min(boundX, newX)) : 0,
      y: Math.max(-boundY, Math.min(boundY, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Open original in new browser window/tab for full native resolution
  const handleOpenOriginal = (e) => {
    e.stopPropagation();
    if (!src) return;
    const win = window.open();
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${fileName || 'Receipt Inspection'} - Nhatty Barber House</title>
            <style>
              body { margin: 0; background: #0c0a09; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
              img { max-width: 100%; height: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 8px; }
            </style>
          </head>
          <body>
            <img src="${src}" alt="Payment Receipt" />
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  if (!src) return null;

  const isDark = theme === 'dark';

  const renderViewport = (isFs = false) => (
    <div 
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${
        isFs ? 'p-2 sm:p-4' : ''
      }`}
    >
      {/* Viewport container */}
      <div
        ref={isFs ? fsContainerRef : containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className={`w-full flex items-center justify-center relative overflow-hidden rounded-xl sm:rounded-2xl transition-all ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isFs ? 'flex-1 max-h-[80vh] min-h-[50vh]' : maxHeightClass}`}
        style={{ touchAction: 'none' }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="w-auto h-auto max-w-full max-h-full object-contain pointer-events-none transition-transform duration-75 ease-out will-change-transform rounded-lg shadow-xl"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
            transformOrigin: 'center center',
            imageRendering: 'auto'
          }}
        />

        {/* Live Drag & Vertical Scroll Helper Hint */}
        <div className="absolute bottom-2 left-2 pointer-events-none z-10 flex items-center gap-1.5">
          <span className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 rounded-md backdrop-blur-md border shadow-sm transition-opacity ${
            isDark 
              ? 'bg-black/75 text-[#C5B9AB] border-white/10' 
              : 'bg-white/90 text-[#6E5D52] border-[#E6DDD1]'
          }`}>
            <span className="flex items-center gap-1 text-[#E5A93C]">
              <Move className="w-3 h-3 animate-pulse" />
              <span>Scroll wheel or drag vertically to inspect ({Math.round(scale * 100)}%)</span>
            </span>
          </span>
        </div>
      </div>

      {/* Floating Interactive Toolbar */}
      <div className={`mt-2 flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl backdrop-blur-md border shadow-lg z-20 transition-all flex-wrap justify-center ${
        isDark 
          ? 'bg-black/85 border-white/15 text-white' 
          : 'bg-white/95 border-[#E2D7C8] text-[#1E1915]'
      }`}>
        {/* Scroll to Top Button */}
        <button
          type="button"
          onClick={handleScrollToTop}
          className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
            isDark
              ? 'hover:bg-white/15 text-[#C5B9AB] hover:text-white'
              : 'hover:bg-black/5 text-[#6E5D52] hover:text-[#1E1915]'
          }`}
          title="Scroll to Top Header"
        >
          <ArrowUpToLine className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span className="text-[10px] hidden sm:inline">Top</span>
        </button>

        {/* Scroll to Bottom (Latest Payment) Button */}
        <button
          type="button"
          onClick={handleScrollToBottom}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
            isDark
              ? 'bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] hover:bg-[#E5A93C]/30'
              : 'bg-amber-100/80 border border-amber-300 text-amber-900 hover:bg-amber-200'
          }`}
          title="Jump directly to bottommost / latest payment"
        >
          <ArrowDownToLine className="w-3.5 h-3.5 animate-bounce" />
          <span className="text-[10.5px]">Latest Payment ⬇</span>
        </button>

        <div className="w-[1px] h-4 bg-white/20 mx-0.5 hidden sm:block" />

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            scale <= 1
              ? 'opacity-40 cursor-not-allowed'
              : isDark
              ? 'hover:bg-white/15 text-[#C5B9AB] hover:text-white'
              : 'hover:bg-black/5 text-[#6E5D52] hover:text-[#1E1915]'
          }`}
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Level Indicator / Cycle */}
        <button
          type="button"
          onClick={handleCycleZoom}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black tracking-wider transition-all cursor-pointer ${
            isZoomed
              ? 'bg-[#E5A93C] text-black shadow-xs'
              : isDark
              ? 'bg-white/10 text-[#C5B9AB] hover:text-white hover:bg-white/15'
              : 'bg-black/5 text-[#6E5D52] hover:text-[#1E1915] hover:bg-black/10'
          }`}
          title="Click to cycle zoom (100% -> 200% -> 300% -> 400%)"
        >
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            scale >= 4
              ? 'opacity-40 cursor-not-allowed'
              : isDark
              ? 'hover:bg-white/15 text-[#C5B9AB] hover:text-white'
              : 'hover:bg-black/5 text-[#6E5D52] hover:text-[#1E1915]'
          }`}
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Reset Zoom & Pan Button */}
        {(isZoomed || position.y !== 0) && (
          <button
            type="button"
            onClick={handleResetZoom}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isDark
                ? 'hover:bg-white/15 text-[#E5A93C]'
                : 'hover:bg-black/5 text-[#8C4717]'
            }`}
            title="Reset to Default (1:1)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Fullscreen / Expand Mode */}
        {allowFullscreen && !isFs && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isDark
                ? 'hover:bg-white/15 text-[#C5B9AB] hover:text-white'
                : 'hover:bg-black/5 text-[#6E5D52] hover:text-[#1E1915]'
            }`}
            title="Inspect in Fullscreen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Open Original in New Tab */}
        <button
          type="button"
          onClick={handleOpenOriginal}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isDark
              ? 'hover:bg-white/15 text-[#C5B9AB] hover:text-white'
              : 'hover:bg-black/5 text-[#6E5D52] hover:text-[#1E1915]'
          }`}
          title="Open Full Resolution in New Window"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className={`w-full flex flex-col items-center justify-center ${className}`}>
        {renderViewport(false)}
      </div>

      {/* Edge-to-Edge Fullscreen Inspection Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-[fadeIn_0.15s_ease-out]">
          {/* Fullscreen Header */}
          <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/70 flex-shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-4 h-4 text-[#E5A93C]" />
              <span className="font-extrabold text-xs sm:text-sm font-['Cinzel',serif] tracking-wide">
                High-Definition Receipt Inspection
              </span>
              <span className="text-xs font-mono text-[#C5B9AB] hidden sm:inline">
                ({fileName})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenOriginal}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span className="hidden sm:inline">Open Full Image</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close Fullscreen View (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Viewport */}
          <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2 sm:p-6">
            {renderViewport(true)}
          </div>
        </div>
      )}
    </>
  );
}
