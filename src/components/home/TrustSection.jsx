import React from 'react';
import { Award, ShieldCheck, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';

export default function TrustSection() {
  const trustCards = [
    {
      icon: Award,
      title: 'Wahl Certified Mastery',
      subtitle: 'International Standards',
      description: 'Our lead barber holds prestigious Wahl Certification, guaranteeing mastery over blade ergonomics, fade transitions, and skin safety.'
    },
    {
      icon: UserCheck,
      title: 'Respected Reputation',
      subtitle: 'Notable Clientele',
      description: 'Trusted by discerning gentlemen, business leaders, and clients across Dessie Branch who demand impeccable consistency.'
    },
    {
      icon: ShieldCheck,
      title: 'Hospital-Grade Hygiene',
      subtitle: 'Sterilized Instruments',
      description: 'We follow strict sanitation protocols with medical UV tool sterilization, fresh single-use razor blades, and immaculate stations.'
    },
    {
      icon: Sparkles,
      title: 'Premium Grooming Products',
      subtitle: 'High-End Care',
      description: 'We exclusively apply dermatologist-tested beard oils, cooling organic aftershaves, and revitalizing volcanic clay masks.'
    }
  ];

  return (
    <section id="trust" className="py-16 sm:py-24 bg-[#F4EFEB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Centered Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF6F1] border border-[#E2D7C8] text-xs font-bold text-[#8C4717] shadow-sm">
            <Award className="w-4 h-4 text-[#C88A22]" />
            <span>The Nhatty Standard of Excellence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
            WHY NHATTY BARBER HOUSE
          </h2>

          <p className="text-base sm:text-lg text-[#5C4E44] font-medium italic">
            "You're not just booking a haircut. You're booking an experience with a respected barber."
          </p>

          <p className="text-xs sm:text-sm text-[#6E5D52] max-w-2xl mx-auto">
            From precision Wahl-certified craft to a tranquil VIP environment, discover why Dessie Branch's professionals trust our chairs.
          </p>
        </div>

        {/* 4 Trust Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustCards.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-[#E6DDD1] hover:border-[#E5A93C] rounded-2xl p-6 transition-all duration-300 shadow-luxury-sm hover:shadow-luxury-lg hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center mb-5 text-[#C88A22] shadow-sm">
                    <IconComp className="w-6 h-6 stroke-[2]" />
                  </div>

                  <h3 className="text-base font-bold text-[#1E1915] font-['Cinzel',serif] mb-1">
                    {card.title}
                  </h3>
                  
                  <p className="text-xs font-bold text-[#8C4717] mb-3 uppercase tracking-wider">
                    {card.subtitle}
                  </p>

                  <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Guarantee Banner */}
        <div className="mt-10 p-6 rounded-2xl bg-white border border-[#E6DDD1] shadow-luxury-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#1E1915]">Our 100% Satisfaction & Punctuality Promise</h4>
              <p className="text-xs sm:text-sm text-[#6E5D52] mt-0.5">
                Zero waiting time when booked in advance. If your cut isn't exactly how you envisioned, we adjust it until you're completely satisfied.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}