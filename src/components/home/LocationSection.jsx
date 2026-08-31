import React from 'react';
import { Clock, Phone, Scissors, Building2, Compass, ArrowRight, Navigation } from 'lucide-react';
import { MOCK_SHOP_INFO, getGoogleMapsPinUrl, getDirectionsUrl, getMapEmbedUrl } from '../../data/shopData';

export default function LocationSection({ locationData = MOCK_SHOP_INFO.location }) {
  const location = locationData || MOCK_SHOP_INFO.location;
  
  const lat = location.latitude ?? 11.1293;
  const lng = location.longitude ?? 39.6372;
  const destinationName = location.destinationName || 'Nhatty Barber House (Lucy Hotel, Ground Floor)';
  const displayAddress = location.displayAddress || 'Lucy Hotel (Ground Floor), Dessie Branch, Ethiopia';
  const plusCode = location.plusCode || '4JHP+8JH, Dese';
  
  // Google Maps search URL
  const mapsPinUrl = getGoogleMapsPinUrl();
  
  // Turn-by-turn directions link
  const directionsUrl = getDirectionsUrl();
  
  // High-zoom embedded map URL centered on Lucy Hotel
  const mapEmbedUrl = getMapEmbedUrl();

  return (
    <section id="location" className="py-16 sm:py-24 bg-[#F4EFEB] border-t border-[#E6DDD1] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[3px] bg-[#E5A93C] rounded-full"></span>
            <span className="text-xs uppercase tracking-[0.2em] text-[#8C4717] font-bold">
              Find Nhatty Barber House
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
            LOCATION & DIRECTIONS
          </h2>
          <p className="text-[#6E5D52] text-sm sm:text-base mt-1.5 max-w-xl">
            Located at <span className="font-bold text-[#1E1915]">Lucy Hotel (Ground Floor), Dessie Branch</span>. Exact GPS pin ready for instant Google Maps navigation.
          </p>
        </div>

        {/* Main Content Grid: Larger Info Panel on Left, Clean Map on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Info Panel (Larger width & comfortable padding) */}
          <div className="lg:col-span-5 bg-white text-[#1E1915] rounded-2xl p-7 sm:p-9 flex flex-col justify-between shadow-luxury-md border-2 border-[#D5C8B8]">
            <div className="space-y-6">
              
              {/* Brand & Destination Card */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-white flex items-center justify-center font-bold shadow-md shrink-0">
                  <Scissors className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-['Cinzel',serif] tracking-wider text-[#1E1915]">
                    NHATTY BARBER HOUSE
                  </h3>
                  <p className="text-xs sm:text-sm text-[#C88A22] font-bold uppercase">
                    Lucy Hotel (Ground Floor) • Dessie Branch, Ethiopia
                  </p>
                </div>
              </div>

              {/* Location & GPS Info */}
              <div className="space-y-5 pt-5 border-t border-[#EFE9E2]">
                
                {/* Destination Landmark */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Destination</p>
                    <p className="text-sm sm:text-base font-extrabold text-[#1E1915] mt-0.5">{destinationName}</p>
                    <p className="text-xs text-[#6E5D52] mt-0.5">{displayAddress}</p>
                  </div>
                </div>

                {/* GPS Coordinates & Plus Code */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center shrink-0 mt-0.5">
                    <Compass className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">GPS & Plus Code</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-[#8C4717] mt-0.5">{lat}° N, {lng}° E</p>
                    <p className="text-xs text-[#6E5D52] mt-0.5 font-mono">Plus Code: {plusCode}</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Hours</p>
                    <p className="text-sm sm:text-base font-extrabold text-[#1E1915] mt-0.5">{MOCK_SHOP_INFO.hours.schedule} • {MOCK_SHOP_INFO.hours.time}</p>
                    <p className="text-xs text-emerald-800 font-bold mt-0.5">● Ready for Appointments</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#6E5D52] font-bold">Direct Contact</p>
                    <p className="text-sm sm:text-base font-extrabold text-[#1E1915] mt-0.5">{MOCK_SHOP_INFO.contact.phone}</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-[#EFE9E2] space-y-3">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#D97706] hover:brightness-105 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Turn-by-Turn Navigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <a
                href={mapsPinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FAF6F1] hover:bg-[#EDE6DD] text-[#1E1915] font-bold text-xs sm:text-sm border border-[#E2D7C8] transition-all"
              >
                <span>Open Location in Google Maps</span>
              </a>
            </div>
          </div>

          {/* Right Map Canvas */}
          <div className="lg:col-span-7 bg-white rounded-2xl overflow-hidden shadow-luxury-md border border-[#E6DDD1] min-h-[440px] lg:min-h-[520px] relative">
            
            {/* Street-Level Responsive Google Map Iframe */}
            <iframe
              title={`Nhatty Barber House at ${destinationName}`}
              src={mapEmbedUrl}
              className="w-full h-full min-h-[440px] lg:min-h-[520px] border-0"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>

          </div>

        </div>

      </div>
    </section>
  );
}
