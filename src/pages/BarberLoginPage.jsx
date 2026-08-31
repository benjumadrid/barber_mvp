import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Scissors, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Check, 
  Building2, 
  Clock, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { loginStaff, isStaffAuthenticated } from '../services/authService';

export default function BarberLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // If already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (isStaffAuthenticated()) {
      navigate('/barber-dashboard', { replace: true });
    }
  }, [navigate]);

  // Ensure fields are completely cleared on initial page mount
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your staff email.');
      return;
    }

    if (!password) {
      setError('Please enter your staff password.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginStaff(email, password);

      if (result.success) {
        setIsSuccess(true);
        // Transition smoothly into dashboard
        setTimeout(() => {
          const destination = location.state?.from?.pathname || '/barber-dashboard';
          navigate(destination, { replace: true });
        }, 400);
      } else {
        setError(result.error || 'Invalid staff email or password.');
      }
    } catch (err) {
      setError('An unexpected connection error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#140F0C] flex flex-col justify-between relative overflow-hidden selection:bg-[#E5A93C] selection:text-[#1A1614]">
      
      {/* Background Ambient Warm Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E5A93C]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#C88A22]/10 rounded-full blur-[180px] pointer-events-none" />
      
      {/* Subtle Pattern Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5A93C_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#B45309] flex items-center justify-center text-white shadow-md shadow-[#E5A93C]/20 group-hover:scale-105 transition-transform">
            <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-widest text-lg sm:text-xl text-[#FAF6F1] font-['Cinzel',serif] leading-tight flex items-center gap-1.5">
              NHATTY
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5A93C]"></span>
            </span>
            <span className="text-[10px] tracking-[0.25em] text-[#E5A93C] font-bold uppercase">
              Staff Portal
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#A8988B] hover:text-[#FAF6F1] transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Return to Website</span>
          <span className="sm:hidden">Website</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Presentation Column (Desktop only branding & narrative) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-8 text-white pr-4">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-xs font-bold text-[#E5A93C]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lucy Hotel • Dessie Branch</span>
              </div>

              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight font-['Cinzel',serif] leading-tight text-[#FAF6F1]">
                STAFF &amp; MANAGEMENT PORTAL
              </h1>

              <p className="text-sm text-[#C5B9AB] leading-relaxed">
                Manage daily appointments, verify customer payment receipts, and maintain seamless chair coordination with zero friction.
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-3.5 pt-2 border-t border-white/10 text-xs text-[#A8988B]">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E5A93C]/15 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#E5A93C]" />
                </div>
                <span>Real-time staggered schedule control (8:00 AM – 8:00 PM)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E5A93C]/15 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-[#E5A93C]" />
                </div>
                <span>Lucy Hotel Ground Floor Master Barber Hub</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E5A93C]/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span>Secured internal access for authorized barbers &amp; receptionists</span>
              </div>
            </div>

          </div>

          {/* Right Login Card Column */}
          <div className="lg:col-span-7 w-full max-w-md mx-auto">
            <div className="bg-[#1E1915]/95 backdrop-blur-xl border border-[#E5A93C]/25 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 relative">
              
              {/* Card Top Branding Badge */}
              <div className="text-center space-y-2 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E5A93C] via-[#DF9C2F] to-[#B45309] flex items-center justify-center text-[#140F0C] shadow-lg shadow-[#E5A93C]/25 mx-auto mb-4">
                  <Scissors className="w-7 h-7 stroke-[2.5]" />
                </div>
                
                <div className="inline-block text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#E5A93C] font-mono">
                  NHATTY BARBER HOUSE • STAFF PORTAL
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FAF6F1] font-['Cinzel',serif] tracking-wide">
                  Welcome Back
                </h2>

                <p className="text-xs sm:text-sm text-[#A8988B] max-w-xs mx-auto leading-relaxed">
                  Sign in to manage today's appointments and keep every guest experience running smoothly.
                </p>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 font-medium animate-[fadeIn_0.2s_ease-out]">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                
                {/* Decoy fields to absorb browser autofill heuristics on mount */}
                <input type="text" name="fake_username_guard" tabIndex={-1} aria-hidden="true" className="sr-only opacity-0 absolute pointer-events-none" autoComplete="off" />
                <input type="password" name="fake_password_guard" tabIndex={-1} aria-hidden="true" className="sr-only opacity-0 absolute pointer-events-none" autoComplete="off" />

                {/* Email Field */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#E2D7C8] uppercase tracking-wider mb-2">
                    <Mail className="w-3.5 h-3.5 text-[#E5A93C]" />
                    Email Address <span className="text-[#E5A93C]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="staff_auth_user"
                      value={email}
                      readOnly={!isEmailFocused}
                      onFocus={() => setIsEmailFocused(true)}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      autoComplete="new-password"
                      spellCheck="false"
                      required
                      className="w-full bg-[#140F0C]/80 border-2 border-[#382E26] focus:border-[#E5A93C] focus:bg-[#140F0C] text-[#FAF6F1] rounded-xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E5A93C]/20"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#E2D7C8] uppercase tracking-wider mb-2">
                    <Lock className="w-3.5 h-3.5 text-[#E5A93C]" />
                    Password <span className="text-[#E5A93C]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="staff_auth_pass"
                      value={password}
                      readOnly={!isPasswordFocused}
                      onFocus={() => setIsPasswordFocused(true)}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      autoComplete="new-password"
                      spellCheck="false"
                      required
                      className="w-full bg-[#140F0C]/80 border-2 border-[#382E26] focus:border-[#E5A93C] focus:bg-[#140F0C] text-[#FAF6F1] rounded-xl pl-4 pr-12 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E5A93C]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#8C7A6D] hover:text-[#E5A93C] transition-colors rounded-lg focus:outline-none"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#8C7A6D]" />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || isSuccess}
                    className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : loading
                        ? 'bg-[#E5A93C]/80 text-[#140F0C] cursor-wait'
                        : 'bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#140F0C] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98]'
                    }`}
                  >
                    {isSuccess ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>ACCESS GRANTED • OPENING PORTAL...</span>
                      </>
                    ) : loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#140F0C]" />
                        <span>AUTHENTICATING...</span>
                      </>
                    ) : (
                      <>
                        <span>ACCESS BARBER PORTAL</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </>
                    )}
                  </button>
                </div>

              </form>

              {/* Bottom Security Info & Badge */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <span className="text-[11px] font-semibold text-[#8C7A6D]">
                  Authorized staff only
                </span>

                <div className="inline-flex items-center gap-1.5 text-[11px] text-[#A8988B]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Protected Staff Area</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-[#6E5D52]">
        <p>© {new Date().getFullYear()} Nhatty Barber House. Lucy Hotel (Ground Floor) • Dessie Branch, Ethiopia.</p>
      </footer>

    </div>
  );
}
