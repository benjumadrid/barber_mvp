import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Info, 
  Loader2, 
  FileCheck2,
  Building2,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { MOCK_SERVICES } from '../../data/servicesData';
import ReceiptZoomViewer from '../common/ReceiptZoomViewer';

// ── Custom SVG / CSS Branded Emblems ────────────────────────────────
function CBELogo() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#582C83] to-[#3B1B5B] flex flex-col items-center justify-center text-white shadow-sm border border-[#7A41B0]/30 flex-shrink-0">
      <Building2 className="w-4 h-4 text-[#F5A81C]" />
      <span className="text-[9px] font-black tracking-tighter text-[#F5A81C] leading-none mt-0.5">CBE</span>
    </div>
  );
}

function TelebirrLogo() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A3E0] to-[#0A6E9E] flex flex-col items-center justify-center text-white shadow-sm border border-[#38BDF8]/40 flex-shrink-0">
      <Smartphone className="w-4 h-4 text-white" />
      <span className="text-[8px] font-black tracking-tighter text-white leading-none mt-0.5">telebirr</span>
    </div>
  );
}

export default function PaymentSection({
  selectedServiceId,
  paymentMethod,
  onSelectPaymentMethod,
  receiptPreview,
  receiptFileName,
  onReceiptUpload,
  onReceiptRemove,
  receiptError,
  setReceiptError,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const service = MOCK_SERVICES.find(s => s.id === selectedServiceId);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Receipt File Validation Handler
  const handleFile = (file) => {
    if (!file) return;
    setReceiptError('');

    // 1. File Type validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setReceiptError('Please upload an image file (JPG, PNG, or WEBP). PDFs and videos are not accepted.');
      return;
    }

    // 2. File Size validation (Max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setReceiptError('Image size exceeds 5MB. Please upload a smaller screenshot.');
      return;
    }

    if (file.size < 1024) {
      setReceiptError('This file is too small to be a valid screenshot. Please upload a clear receipt.');
      return;
    }

    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Dimension check: screenshots should be at least 150x150
        if (img.width < 150 || img.height < 150) {
          setIsScanning(false);
          setReceiptError('This image cannot be accepted. Please upload a clear screenshot of your payment receipt.');
          return;
        }

        // Ultra high-definition canvas compression (max 1800px, 0.88 quality) for crisp receipt readability
        // and razor-sharp zoom inspection without storage bloat
        const maxDimension = 1800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Mock heuristic validation simulation
        setTimeout(() => {
          setIsScanning(false);
          onReceiptUpload(compressedDataUrl, file.name);
        }, 400);
      };
      img.onerror = () => {
        setIsScanning(false);
        setReceiptError('Could not read image. Please upload a valid JPG, PNG, or WEBP screenshot.');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      setIsScanning(false);
      setReceiptError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <section id="booking-payment" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">6</span>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
            COMPLETE YOUR PAYMENT
          </h2>
          <p className="text-xs text-[#6E5D52]">
            Pay the full service amount to reserve your appointment.
          </p>
        </div>
      </div>

      {/* Dynamic Amount Box */}
      <div className={`border-2 rounded-2xl p-5 sm:p-6 transition-all duration-200 ${
        service 
          ? 'bg-gradient-to-r from-[#FDF8EF] to-[#FAF2E3] border-[#E5A93C]/50 shadow-luxury-sm' 
          : 'bg-[#FAF8F5] border-[#E6DDD1]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E8B7F]">
              Your Appointment
            </span>
            {service ? (
              <>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1E1915] transition-all">
                  {service.name}
                </h3>
                <p className="text-xs text-[#6E5D52] mt-0.5">
                  {service.tagline || 'Pay the exact amount below to secure your reserved time slot.'}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base sm:text-lg font-semibold text-[#9E8B7F] italic">
                  No service selected yet
                </h3>
                <p className="text-xs text-[#9E8B7F] mt-0.5">
                  Please choose a service in Step 1 to calculate your payment amount.
                </p>
              </>
            )}
          </div>

          <div className={`rounded-xl px-5 py-3 text-left sm:text-right flex-shrink-0 transition-all ${
            service 
              ? 'bg-white/90 backdrop-blur-sm border border-[#E5A93C]/40 shadow-sm' 
              : 'bg-[#FAF6F1] border border-[#E6DDD1]'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              service ? 'text-[#C88A22]' : 'text-[#9E8B7F]'
            }`}>
              Amount to Pay
            </span>
            <span className={`text-2xl sm:text-3xl font-black ${
              service ? 'text-[#1E1915]' : 'text-[#C5B9AB]'
            }`}>
              {service ? service.price : '--'} <span className="text-xs font-bold text-[#C88A22]">ETB</span>
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6E5D52] mb-3">
          Choose Payment Method <span className="text-[#E5A93C]">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* CBE Card */}
          <div
            onClick={() => onSelectPaymentMethod('cbe')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectPaymentMethod('cbe')}
            className={`cursor-pointer relative text-left rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200 ${
              paymentMethod === 'cbe'
                ? 'border-[#E5A93C] bg-[#FDF8EF] shadow-md shadow-[#E5A93C]/10 ring-1 ring-[#E5A93C]/30'
                : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-luxury-sm'
            }`}
          >
            {paymentMethod === 'cbe' && (
              <div className="absolute top-3.5 right-3.5">
                <CheckCircle2 className="w-5 h-5 text-[#E5A93C]" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <CBELogo />
              <div>
                <h4 className="font-bold text-sm text-[#1E1915] leading-tight">CBE</h4>
                <p className="text-[11px] text-[#6E5D52]">Commercial Bank of Ethiopia</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#EFE9E2]/80">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9E8B7F] block">Account Name</span>
                <span className="text-xs font-bold text-[#1E1915]">NHATTY BARBER</span>
              </div>

              <div className="flex items-center justify-between bg-[#FAF6F1] rounded-lg px-3 py-1.5 border border-[#E6DDD1]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#9E8B7F] block">Account Number</span>
                  <span className="text-xs font-mono font-bold text-[#1E1915] tracking-wider">1000123456872</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy('1000123456872', 'cbe');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E2D7C8] text-[11px] font-semibold text-[#6E5D52] hover:text-[#C88A22] hover:border-[#C88A22] transition-colors active:scale-95"
                >
                  {copiedKey === 'cbe' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Telebirr Card */}
          <div
            onClick={() => onSelectPaymentMethod('telebirr')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectPaymentMethod('telebirr')}
            className={`cursor-pointer relative text-left rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200 ${
              paymentMethod === 'telebirr'
                ? 'border-[#E5A93C] bg-[#FDF8EF] shadow-md shadow-[#E5A93C]/10 ring-1 ring-[#E5A93C]/30'
                : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-luxury-sm'
            }`}
          >
            {paymentMethod === 'telebirr' && (
              <div className="absolute top-3.5 right-3.5">
                <CheckCircle2 className="w-5 h-5 text-[#E5A93C]" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <TelebirrLogo />
              <div>
                <h4 className="font-bold text-sm text-[#1E1915] leading-tight">Telebirr</h4>
                <p className="text-[11px] text-[#6E5D52]">Mobile Money Transfer</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#EFE9E2]/80">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9E8B7F] block">Account Name</span>
                <span className="text-xs font-bold text-[#1E1915]">NHATTY BARBER</span>
              </div>

              <div className="flex items-center justify-between bg-[#FAF6F1] rounded-lg px-3 py-1.5 border border-[#E6DDD1]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#9E8B7F] block">Phone / Payee</span>
                  <span className="text-xs font-mono font-bold text-[#1E1915] tracking-wider">0987766775</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy('0987766775', 'telebirr');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E2D7C8] text-[11px] font-semibold text-[#6E5D52] hover:text-[#C88A22] hover:border-[#C88A22] transition-colors active:scale-95"
                >
                  {copiedKey === 'telebirr' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Instruction Notice */}
      {paymentMethod && (
        <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C88A22] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#5D4A3E] space-y-1">
            <p className="font-bold text-[#1E1915]">
              {service ? (
                <>
                  Please send exactly <span className="text-[#C88A22] font-black">{service.price} ETB</span> via {paymentMethod === 'cbe' ? 'CBE' : 'Telebirr'}.
                </>
              ) : (
                <>
                  Please select a service in Step 1 to view your exact transfer amount for {paymentMethod === 'cbe' ? 'CBE' : 'Telebirr'}.
                </>
              )}
            </p>
            <p className="text-[#6E5D52]">
              After completing the transfer, take a screenshot of the payment receipt and upload it below.
            </p>
          </div>
        </div>
      )}

      {/* Payment Receipt Upload Card */}
      <div className="bg-white border-2 border-[#E6DDD1] rounded-2xl p-5 sm:p-6 space-y-4 shadow-luxury-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#1E1915] font-['Cinzel',serif]">
              UPLOAD PAYMENT RECEIPT
            </h3>
            <p className="text-xs text-[#6E5D52]">
              Upload a screenshot showing your completed payment.
            </p>
          </div>
          {receiptPreview && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
              <FileCheck2 className="w-3.5 h-3.5" />
              Receipt Submitted
            </span>
          )}
        </div>

        {/* Warning / Requirements Banner */}
        <div className="bg-[#FAF4EA] border border-[#EADBCA] rounded-xl p-3.5 text-xs text-[#6E5D52] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#8C4717]">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Important Screenshot Requirements</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5D4A3E]">
            Please upload the payment screenshot from this appointment. The transaction date and time should be visible.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5D4A3E]">
              <Check className="w-3 h-3 text-emerald-600" /> Amount {service ? `(ETB ${service.price})` : '(Exact Price)'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5D4A3E]">
              <Check className="w-3 h-3 text-emerald-600" /> Recipient Name/No.
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5D4A3E]">
              <Check className="w-3 h-3 text-emerald-600" /> Reference No.
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5D4A3E]">
              <Check className="w-3 h-3 text-emerald-600" /> Date & Time
            </span>
          </div>
        </div>

        {/* Upload Dropzone / Preview */}
        {!receiptPreview ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#E5A93C] bg-[#FDF8EF]'
                : 'border-[#D9CEBF] bg-[#FAF8F5] hover:border-[#C88A22] hover:bg-[#FAF4EA]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />

            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <Loader2 className="w-8 h-8 text-[#C88A22] animate-spin" />
                <p className="text-xs font-bold text-[#1E1915]">Validating screenshot...</p>
                <p className="text-[11px] text-[#9E8B7F]">Checking image format & resolution</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#E5A93C]/10 flex items-center justify-center text-[#C88A22] mb-1">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1E1915]">
                  Click to Upload Screenshot <span className="text-[#6E5D52] font-normal">or drag & drop</span>
                </p>
                <p className="text-[11px] text-[#9E8B7F]">
                  JPG, PNG or WEBP (Max 5MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FAF8F5] border border-[#E6DDD1] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-[#C88A22] flex-shrink-0" />
                <span className="text-xs font-bold text-[#1E1915] truncate">
                  {receiptFileName || 'payment_receipt.png'}
                </span>
              </div>
              <button
                type="button"
                onClick={onReceiptRemove}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>

            {/* Interactive High-Definition Image Preview & Zoom Container */}
            <div className="relative rounded-xl overflow-hidden border border-[#E2D7C8] bg-black/5 p-1 sm:p-2 flex flex-col items-center justify-center">
              <ReceiptZoomViewer
                src={receiptPreview}
                alt="Payment Receipt Preview"
                fileName={receiptFileName || 'payment_receipt.png'}
                theme="light"
                maxHeightClass="max-h-64"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Payment receipt attached
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#C88A22] hover:underline font-bold"
              >
                Change Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {receiptError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{receiptError}</span>
          </div>
        )}
      </div>
    </section>
  );
}
