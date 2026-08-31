import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, MapPin, Clock, Phone, Mail, Award, ArrowUp } from 'lucide-react';
import { MOCK_SHOP_INFO } from '../../data/shopData';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#FAF6F1] border-t border-[#E6DDD1] text-[#6E5D52] text-sm">
      {/* Top Banner / Quick Info Strip */}
      <div className="border-b border-[#E6DDD1] py-8 bg-[#F4EFEB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E6DDD1] shadow-sm">
              <div className="w-11 h-11 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#D97706]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Opening Hours</p>
                <p className="text-[#1E1915] font-extrabold">{MOCK_SHOP_INFO.hours.schedule} • {MOCK_SHOP_INFO.hours.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E6DDD1] shadow-sm">
              <div className="w-11 h-11 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#D97706]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Location</p>
                <p className="text-[#1E1915] font-extrabold">{MOCK_SHOP_INFO.location.displayAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E6DDD1] shadow-sm">
              <div className="w-11 h-11 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-[#D97706]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Appointments & Inquiries</p>
                <p className="text-[#1E1915] font-extrabold">{MOCK_SHOP_INFO.contact.phone}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#B45309] flex items-center justify-center text-white font-bold shadow-md shadow-[#E5A93C]/20">
                <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-widest text-xl text-[#1E1915] font-['Cinzel',serif] leading-tight">
                  NHATTY
                </span>
                <span className="text-[10px] tracking-[0.25em] text-[#C88A22] font-bold uppercase">
                  Barber House
                </span>
              </div>
            </Link>
            
            <p className="text-[#6E5D52] leading-relaxed text-xs sm:text-sm">
              Dessie Branch's premier Wahl-certified barber house at Lucy Hotel. Where modern styling meets timeless master craftsmanship.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E6DDD1] text-xs text-[#1E1915] font-bold">
              <Award className="w-4 h-4 text-[#C88A22]" />
              <span>Wahl Certified Master Barber</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#1E1915] mb-4 font-['Cinzel',serif]">
              Quick Navigation
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#services" className="hover:text-[#C88A22] transition-colors font-medium">Our Grooming Services</a>
              </li>
              <li>
                <a href="#barbers" className="hover:text-[#C88A22] transition-colors font-medium">Meet the Barbers</a>
              </li>
              <li>
                <a href="#location" className="hover:text-[#C88A22] transition-colors font-medium">Location & Directions</a>
              </li>
              <li>
                <a href="#experience" className="hover:text-[#C88A22] transition-colors font-medium">Shop Atmosphere</a>
              </li>
              <li>
                <a href="#trust" className="hover:text-[#C88A22] transition-colors font-medium">Why Nhatty Barber House</a>
              </li>
              <li>
                <Link to="/social" className="hover:text-[#C88A22] transition-colors font-medium">Transformations & Social</Link>
              </li>
            </ul>
          </div>

          {/* Quick Actions & Showcase */}
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#1E1915] mb-4 font-['Cinzel',serif]">
              Quick Actions
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/booking" className="text-[#8C4717] hover:text-[#C88A22] font-bold flex items-center gap-1.5">
                  Book an Appointment →
                </Link>
              </li>
              <li>
                <Link to="/my-appointment" className="hover:text-[#C88A22] transition-colors font-medium">
                  My Active Appointment
                </Link>
              </li>
              <li>
                <Link to="/social" className="hover:text-[#C88A22] transition-colors font-medium">
                  VIP Showcase Wall
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#1E1915] mb-4 font-['Cinzel',serif]">
              Visit or Contact
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-[#6E5D52]">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C88A22] shrink-0 mt-0.5" />
                <span>{MOCK_SHOP_INFO.location.displayAddress}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C88A22] shrink-0" />
                <span>{MOCK_SHOP_INFO.contact.phone}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C88A22] shrink-0" />
                <span>{MOCK_SHOP_INFO.contact.email}</span>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-[#E6DDD1] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E5D52]">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Nhatty Barber House. All rights reserved.</p>
            <span className="hidden sm:inline text-[#D5C8B8]">•</span>
            <p>Lucy Hotel (Ground Floor) • Dessie Branch, Ethiopia (MVP Prototype)</p>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-[#6E5D52] hover:text-[#C88A22] transition-colors p-2 rounded-lg hover:bg-white"
            aria-label="Scroll back to top"
          >
            <span>Back to top</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
