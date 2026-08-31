import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Scissors, Calendar, Sparkles } from 'lucide-react';
import Button from './Button';
import { getMyAppointment, subscribeToBookingStore } from '../../services/mockApi';
import { getActiveBooking, isAppointmentActive } from '../../data/bookingStore';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasRecord, setHasRecord] = useState(() => {
    const appt = getActiveBooking();
    return Boolean(appt && typeof appt === 'object' && appt.ref);
  });
  const [hasActiveAppointment, setHasActiveAppointment] = useState(() => {
    const appt = getActiveBooking();
    return isAppointmentActive(appt);
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check active appointment status whenever route changes, window focuses, or booking store emits
  useEffect(() => {
    function checkActive() {
      const appt = getActiveBooking();
      setHasRecord(Boolean(appt && typeof appt === 'object' && appt.ref));
      setHasActiveAppointment(isAppointmentActive(appt));
    }
    checkActive();

    // 1. In-memory subscriber for same-tab updates
    const unsubscribe = subscribeToBookingStore(checkActive);

    // 2. Custom event listener
    window.addEventListener('nhatty_booking_store_changed', checkActive);

    // 3. Storage event and focus
    window.addEventListener('storage', checkActive);
    window.addEventListener('focus', checkActive);
    const timer = setInterval(checkActive, 3000);

    return () => {
      unsubscribe();
      window.removeEventListener('nhatty_booking_store_changed', checkActive);
      window.removeEventListener('storage', checkActive);
      window.removeEventListener('focus', checkActive);
      clearInterval(timer);
    };
  }, [location]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isBookingPage = location.pathname.startsWith('/booking');

  // Base navigation links + My Appointment dynamically added beside Social Proof
  const navLinks = [
    { name: 'Services', href: '/#services' },
    { name: 'Our Barbers', href: '/#barbers' },
    { name: 'Location', href: '/#location' },
    { name: 'Experience', href: '/#experience' },
    { name: 'Why Nhatty', href: '/#trust' },
    { name: 'Social Proof', href: '/social' },
    ...(hasActiveAppointment ? [
      { 
        name: 'My Appointment', 
        href: '/#my-appointment', 
        isSpecial: true 
      }
    ] : hasRecord ? [
      { 
        name: 'My Appointment', 
        href: '/my-appointment', 
        isSpecial: false 
      }
    ] : []),
  ];

  // Smart section navigation handler (smooth scroll if on home, or navigate to /#id)
  const handleNavClick = (e, href) => {
    if (href.startsWith('/#')) {
      const targetId = href.replace('/#', '');
      if (location.pathname === '/') {
        e.preventDefault();
        setIsOpen(false);
        const element = document.getElementById(targetId);
        if (element) {
          const navbarHeight = 75;
          const rect = element.getBoundingClientRect();
          const targetY = window.scrollY + rect.top - navbarHeight;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth',
          });
        }
        window.history.pushState(null, '', href);
      } else {
        // Navigating from /my-appointment, /booking, or /social to homepage section
        setIsOpen(false);
        navigate(href);
      }
    } else {
      setIsOpen(false);
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#F4EFEB]/95 backdrop-blur-md shadow-sm py-3 border-b border-[#E6DDD1]' 
          : 'bg-[#F4EFEB]/85 backdrop-blur-sm py-4 border-b border-[#E6DDD1]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#B45309] flex items-center justify-center text-white font-bold shadow-md shadow-[#E5A93C]/25 group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-lg sm:text-xl text-[#1E1915] font-['Cinzel',serif] leading-tight flex items-center gap-1.5">
                NHATTY
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5A93C]"></span>
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#C88A22] font-bold uppercase">
                Barber House
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-sm font-semibold transition-colors relative py-1 hover:after:w-full after:w-0 after:h-[2px] after:bg-[#E5A93C] after:absolute after:bottom-0 after:left-0 after:transition-all after:duration-200 cursor-pointer flex items-center gap-1.5 ${
                  link.isSpecial
                    ? 'text-[#8C4717] font-extrabold bg-[#FAF2E3] px-3 py-1 rounded-full border border-[#E5A93C]/50 hover:bg-[#FAF0DD]'
                    : 'text-[#5C4E44] hover:text-[#C88A22]'
                }`}
              >
                {link.isSpecial && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                )}
                <span>{link.name}</span>
              </a>
            ))}
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden sm:flex items-center gap-3">
            {!isBookingPage && (
              <Button 
                to="/booking" 
                variant="primary" 
                size="sm"
                icon={Calendar}
              >
                Book Now
              </Button>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            {!isBookingPage && (
              <Link 
                to="/booking"
                className="bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
              >
                Book Now
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-[#231B15] hover:text-[#C88A22] rounded-lg focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X className="w-6 h-6 text-[#C88A22]" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#FAF6F1] border-b border-[#E6DDD1] px-4 pt-4 pb-6 mt-3 space-y-4 shadow-xl">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`px-3 py-2.5 text-base font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                  link.isSpecial
                    ? 'text-[#8C4717] font-bold bg-[#FAF2E3] border border-[#E5A93C]/40'
                    : 'text-[#231B15] hover:text-[#C88A22] hover:bg-black/5'
                }`}
              >
                <span>{link.name}</span>
                {link.isSpecial && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </a>
            ))}
          </div>

          {!isBookingPage && (
            <div className="pt-3 border-t border-[#E6DDD1] flex flex-col gap-2.5">
              <Button
                to="/booking"
                variant="primary"
                size="md"
                fullWidth
                icon={Calendar}
                onClick={() => setIsOpen(false)}
              >
                Book an Appointment
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
