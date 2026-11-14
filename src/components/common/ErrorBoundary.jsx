import React from 'react';
import { RefreshCw, Scissors, Home, AlertCircle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Nhatty Barber House caught an unhandled error:', error, errorInfo);
    // Auto-reload on stale dynamic import chunk errors after new deployments
    if (error?.message && (error.message.includes('dynamically imported module') || error.message.includes('Loading chunk'))) {
      const hasReloaded = sessionStorage.getItem('nhatty_chunk_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('nhatty_chunk_reloaded', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('nhatty_')) {
            localStorage.removeItem(k);
          }
        });
      }
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('nhatty_')) {
            sessionStorage.removeItem(k);
          }
        });
      }
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4EFEB] flex items-center justify-center p-4 sm:p-6 text-[#1E1915]">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#E6DDD1] p-6 sm:p-8 text-center shadow-luxury-md space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF2E3] border border-[#E5A93C]/40 text-[#C88A22] flex items-center justify-center mx-auto shadow-sm">
              <Scissors className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C4717] bg-[#FAF4EA] px-3 py-1 rounded-full border border-[#E5A93C]/30">
                Nhatty Barber House • Session Notice
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold font-['Cinzel',serif] pt-2 text-[#1E1915]">
                RESERVATION SYNC UPDATE
              </h1>
              <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed">
                Your browser was holding older cached reservation data from a previous version. Click below to refresh and load the latest updates cleanly.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>REFRESH & RELOAD PAGE</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-3 px-5 rounded-2xl border border-[#E6DDD1] text-xs font-bold text-[#6E5D52] hover:bg-[#FAF6F1] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Homepage</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
