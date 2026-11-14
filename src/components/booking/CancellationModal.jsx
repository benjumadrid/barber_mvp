import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, CreditCard } from 'lucide-react';

export default function CancellationModal({ isOpen, onKeep, onCancel, appointment }) {
  if (!isOpen) return null;

  const isVerified = appointment?.paymentStatus === 'Verified' || (Number(appointment?.paidAmount) > 0);
  const verifiedPaid = isVerified 
    ? (appointment?.paidAmount !== undefined 
        ? Number(appointment.paidAmount) 
        : (Number(appointment?.amountPaid) || Number(appointment?.price) || 0))
    : 0;

  const refundAmount = verifiedPaid > 0 ? Math.round(verifiedPaid * 0.75 * 100) / 100 : 0;
  const feeAmount = verifiedPaid > 0 ? Math.round(verifiedPaid * 0.25 * 100) / 100 : 0;

  const [refundMethod, setRefundMethod] = useState('telebirr');
  const [refundAccount, setRefundAccount] = useState('');
  const [error, setError] = useState('');

  const handleConfirmCancel = () => {
    if (verifiedPaid > 0 && !refundAccount.trim()) {
      setError('Please enter your refund phone or bank account number.');
      return;
    }
    setError('');
    onCancel({
      refundMethod: verifiedPaid > 0 ? refundMethod : null,
      refundAccount: verifiedPaid > 0 ? refundAccount.trim() : null,
      refundAmount,
      refundFee: feeAmount,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onKeep}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 animate-[scaleIn_0.25s_ease-out] max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onKeep}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF6F1] flex items-center justify-center text-[#6E5D52] hover:bg-[#EFE9E2] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>

        {/* Content */}
        <div className="text-center mb-5">
          <h3 className="text-lg font-bold text-[#1E1915] font-['Cinzel',serif] mb-1.5">
            CANCEL APPOINTMENT
          </h3>
          <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed">
            Cancelling will release your reserved appointment slot for other customers.
          </p>
        </div>

        {/* 75% Refund Policy Breakdown if payment was verified */}
        {verifiedPaid > 0 && (
          <div className="mb-5 space-y-3 text-left">
            <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#EFE9E2]">
                <span className="text-[#8C7A6D] font-medium">Verified Payment:</span>
                <span className="font-bold text-[#1E1915]">{verifiedPaid} ETB</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#EFE9E2]">
                <span className="text-emerald-700 font-bold">Refund Due (75%):</span>
                <span className="font-black text-emerald-800 font-mono text-sm">{refundAmount} ETB</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-800 font-medium">Cancellation Fee (25% retained):</span>
                <span className="font-bold text-amber-900 font-mono">{feeAmount} ETB</span>
              </div>
              <p className="text-[10px] text-[#8C7A6D] italic pt-1 leading-tight">
                * In accordance with Nhatty Barber House policy, 75% is refunded to your account; 25% is retained to cover schedule disruption.
              </p>
            </div>

            {/* Refund Destination Account Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1E1915] block uppercase tracking-wider font-['Cinzel',serif]">
                Refund Destination Account
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('telebirr')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    refundMethod === 'telebirr'
                      ? 'bg-[#140F0C] text-[#FAF6F1] border-[#E5A93C] shadow-xs'
                      : 'bg-[#FAF6F1] text-[#6E5D52] border-[#E6DDD1] hover:bg-white'
                  }`}
                >
                  Telebirr
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod('cbe')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    refundMethod === 'cbe'
                      ? 'bg-[#140F0C] text-[#FAF6F1] border-[#E5A93C] shadow-xs'
                      : 'bg-[#FAF6F1] text-[#6E5D52] border-[#E6DDD1] hover:bg-white'
                  }`}
                >
                  CBE Bank
                </button>
              </div>

              <input
                type="text"
                value={refundAccount}
                onChange={(e) => setRefundAccount(e.target.value)}
                placeholder={refundMethod === 'telebirr' ? 'Enter Telebirr phone number (e.g. 0911223344)' : 'Enter CBE account number (e.g. 1000123456789)'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD1] bg-white text-xs text-[#1E1915] focus:outline-none focus:border-[#E5A93C] transition-colors"
              />

              <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-[10.5px] text-amber-800">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Please verify your account details carefully. Processed refunds cannot be reversed.</span>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onKeep}
            className="w-full py-3 rounded-xl border-2 border-[#E6DDD1] bg-white text-[#6E5D52] font-semibold text-xs sm:text-sm hover:bg-[#FAF6F1] transition-colors"
          >
            KEEP APPOINTMENT
          </button>
          <button
            onClick={handleConfirmCancel}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            CONFIRM CANCELLATION
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
