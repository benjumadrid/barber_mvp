import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Calendar, Clock, ArrowLeft, Scissors } from 'lucide-react';
import Button from '../components/common/Button';

export default function BarberDashboardPlaceholder() {
  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Back to Home */}
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
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF4EA] border border-[#EADBCA] text-xs font-bold text-[#8C4717]">
          <UserCheck className="w-3.5 h-3.5 text-[#C88A22]" />
          <span>Staff & Barber Management • Lucy Hotel</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#231B15] font-['Cinzel',serif]">
          BARBER DASHBOARD PORTAL
        </h1>
        <p className="text-xs sm:text-sm text-[#735E52] max-w-lg mx-auto">
          Shared management portal for barbers to review daily appointment queues, toggle availability, and check service times.
        </p>
      </div>

      {/* Dashboard Preview Box */}
      <div className="bg-[#FFFDF9] border border-[#E8DECF] rounded-2xl p-8 text-center space-y-6 shadow-warm-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF4EA] border border-[#EADBCA] flex items-center justify-center mx-auto text-[#C88A22]">
          <Scissors className="w-7 h-7" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-[#231B15]">Barber Portal Architecture Prepared</h2>
          <p className="text-xs sm:text-sm text-[#735E52] leading-relaxed">
            The shared barber queue and scheduling dashboard route is ready for backend integration once the barbershop approves the project.
          </p>
        </div>

        {/* Mock Queue Preview Card */}
        <div className="max-w-md mx-auto p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DECF] text-left space-y-3">
          <div className="flex items-center justify-between text-xs text-[#735E52] border-b border-[#E8DECF] pb-2">
            <span className="font-bold text-[#231B15]">Today's Mock Schedule in Dessie</span>
            <span className="text-emerald-700 font-bold">● 5 Appointments</span>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center text-[#231B15]">
              <span>09:00 AM • Abebe</span>
              <span className="text-[#8C4717] font-bold">Hair Cut + Face Treatment</span>
            </div>
            <div className="flex justify-between items-center text-[#231B15]">
              <span>10:30 AM • Kebede</span>
              <span className="text-[#8C4717] font-bold">VIP Royal Grooming</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4">
          <Button
            to="/"
            variant="primary"
            size="md"
          >
            Return to Customer Home
          </Button>
        </div>
      </div>
    </div>
  );
}
