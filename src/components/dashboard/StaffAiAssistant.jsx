import { formatAppointmentRelativeDate } from '../../services/dateTimeUtils.js';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  RotateCcw, 
  User, 
  Phone, 
  CalendarDays, 
  Clock, 
  Scissors, 
  CreditCard, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Award, 
  ShieldAlert, 
  ExternalLink,
  Copy,
  CheckCheck,
  ArrowRight
} from 'lucide-react';
import { processStaffQuery, resetStaffAiContext } from '../../services/staffAiEngine';
import { subscribeToBookingStore } from '../../data/bookingStore';

const INITIAL_STAFF_GREETING = {
  id: 'staff-init',
  sender: 'ai',
  text: "👋 **Hello Staff Member.** I am **Nhatty House Staff AI**, your internal operations assistant.\n\nI can help you look up customer visit history, check today's schedule, calculate finalized revenue, or compare barber performance.\n\nHow can I assist you today?",
  cardType: null,
  cardData: null,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  suggestions: [
    { label: "📋 Today's Briefing", prompt: "Give me today's briefing" },
    { label: "🔍 Lookup Mulugeta", prompt: "Show me Mulugeta's appointment." },
    { label: "💰 Today's Revenue", prompt: "How much did we make today?" },
    { label: "🏆 Top Barber", prompt: "Which barber completed the most appointments this month?" },
    { label: "⏳ Pending Payments", prompt: "Which appointments are still pending verification?" }
  ]
};

export default function StaffAiAssistant({ 
  onFilterBarber, 
  onFilterPayment, 
  onFilterStatus, 
  onSearchQuery, 
  onSelectDate,
  appointments = [],
  allAppointments = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState([INITIAL_STAFF_GREETING]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedCustomerHistory, setExpandedCustomerHistory] = useState({});
  const [copiedText, setCopiedText] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages, isTyping]);

  // Subscribe to real-time store changes
  useEffect(() => {
    const unsubscribe = subscribeToBookingStore(() => {
      // Sync listener
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    setHasInteracted(true);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSend = (payloadOrText = null, displayText = null) => {
    if (isTyping) return;

    let q = payloadOrText !== null ? payloadOrText : inputVal;
    if (typeof q === 'string') {
      q = q.trim();
      if (!q) return;
    } else if (!q || typeof q !== 'object') {
      return;
    }

    let userText = '';
    if (displayText) {
      userText = displayText;
    } else if (typeof q === 'string') {
      if (q.startsWith('__SELECT_CUSTOMER__:')) {
        userText = 'Select Customer';
      } else if (q.startsWith('__SELECT_APPOINTMENT__:')) {
        userText = 'Select Appointment';
      } else {
        userText = q;
      }
    } else if (typeof q === 'object') {
      if (q.customerName) {
        userText = `${q.customerName}${q.customerPhone ? ' (' + q.customerPhone + ')' : ''}`;
      } else if (q.ref || q.bookingRef) {
        userText = `Booking ${q.ref || q.bookingRef}`;
      } else {
        userText = 'Selected Item';
      }
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Natural typing delay for realistic interaction
    setTimeout(() => {
      const activeList = (allAppointments && allAppointments.length > 0)
        ? allAppointments
        : ((appointments && appointments.length > 0) ? appointments : null);
      const response = processStaffQuery(q, activeList);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        cardType: response.cardType,
        cardData: response.cardData,
        suggestions: response.suggestions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 280);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    resetStaffAiContext();
    setMessages([
      {
        id: `staff-reset-${Date.now()}`,
        sender: 'ai',
        text: "🔄 **Operations context reset.** How can I assist you?",
        cardType: null,
        cardData: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          { label: "📋 Today's Briefing", prompt: "Give me today's briefing" },
          { label: "🔍 Lookup Customer", prompt: "Show me Mulugeta's appointment." },
          { label: "💰 Monthly Revenue", prompt: "How much did we make this month?" }
        ]
      }
    ]);
  };

  const toggleCustomerHistory = (custId) => {
    setExpandedCustomerHistory(prev => ({
      ...prev,
      [custId]: !prev[custId]
    }));
  };

  // Helper to format markdown text
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, index) => {
      if (!line.trim()) {
        return <div key={index} className="h-1" />;
      }
      return (
        <div key={index} className="leading-relaxed">
          {renderInlineMarkdown(line)}
        </div>
      );
    });
  };

  const renderInlineMarkdown = (line) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* ── Fixed Floating Trigger Button in Bottom-Right Viewport ──── */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3">
        {/* Main Floating Pill Trigger Button */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Close Nhatty House Staff AI' : 'Open Nhatty House Staff AI Operations Assistant'}
          className={`group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer border ${
            isOpen
              ? 'bg-[#140F0C] text-[#FAF6F1] border-white/20 hover:bg-[#201A16]'
              : 'bg-gradient-to-r from-[#140F0C] via-[#241D17] to-[#140F0C] text-white border-[#E5A93C]/60 hover:border-[#E5A93C] shadow-[#E5A93C]/20 hover:shadow-[#E5A93C]/35 hover:-translate-y-0.5'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-[#E5A93C]/15 blur-md pointer-events-none group-hover:bg-[#E5A93C]/25 transition-all" />

          {/* Icon Badge */}
          <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#140F0C] shadow-sm flex-shrink-0">
            {isOpen ? (
              <X className="w-4 h-4 stroke-[3]" />
            ) : (
              <Bot className="w-4 h-4 stroke-[2.5]" />
            )}
          </div>

          {/* Button Text */}
          <div className="text-left leading-tight pr-1">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#E5A93C] block font-bold">
              {isOpen ? 'Close' : 'Operations AI'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-['Cinzel',serif] text-white tracking-wide block">
              Nhatty Staff AI
            </span>
          </div>

          {/* Live pulse dot */}
          {!isOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>

      {/* ── Floating Staff AI Modal Window ───────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[410px] md:w-[430px] h-[580px] max-h-[82vh] bg-[#FAF6F1] rounded-3xl shadow-2xl border border-[#E2D7C8] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* ── Luxury Header ──────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-[#140F0C] via-[#221A15] to-[#140F0C] text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between border-b border-white/10 shadow-sm relative overflow-hidden flex-shrink-0">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#E5A93C]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#92400E] flex items-center justify-center text-[#140F0C] shadow-md border border-[#FDE68A]/40">
                  <Bot className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#140F0C] rounded-full animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm sm:text-base font-['Cinzel',serif] tracking-wide text-white leading-tight truncate">
                    Nhatty Staff AI
                  </h3>
                  <span className="text-[8px] sm:text-[9px] font-mono font-extrabold bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] px-1.5 py-0.2 rounded uppercase flex-shrink-0">
                    Operations
                  </span>
                </div>
                <p className="text-[11px] text-[#C5B9AB] flex items-center gap-1 truncate mt-0.5">
                  <span>Internal Operations</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Live Assistant</span>
                </p>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-1.5 relative z-10 flex-shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-2 rounded-xl text-[#C5B9AB] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-[#C5B9AB] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Staff AI"
                aria-label="Close Staff AI"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Quick Action Suggestion Chips ──────────────────────── */}
          <div className="bg-[#FAF2E3] border-b border-[#E5A93C]/30 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x flex-shrink-0">
            <button
              onClick={() => handleSend("Give me today's briefing")}
              className="flex-shrink-0 snap-start text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#140F0C] hover:text-white text-[#8C4717] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-2xs"
            >
              📋 Briefing
            </button>
            <button
              onClick={() => handleSend("Show me Mulugeta's appointment.")}
              className="flex-shrink-0 snap-start text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#140F0C] hover:text-white text-[#8C4717] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-2xs"
            >
              🔍 Mulugeta
            </button>
            <button
              onClick={() => handleSend("How much did we make today?")}
              className="flex-shrink-0 snap-start text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#140F0C] hover:text-white text-[#8C4717] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-2xs"
            >
              💰 Revenue
            </button>
            <button
              onClick={() => handleSend("Which barber completed the most appointments this month?")}
              className="flex-shrink-0 snap-start text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#140F0C] hover:text-white text-[#8C4717] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-2xs"
            >
              🏆 Top Barber
            </button>
            <button
              onClick={() => handleSend("Which appointments are still pending verification?")}
              className="flex-shrink-0 snap-start text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#140F0C] hover:text-white text-[#8C4717] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-2xs"
            >
              ⏳ Pending
            </button>
          </div>

          {/* ── Conversation Messages Scroll Area ──────────────────── */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 min-h-0 text-[#1E1915]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[88%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#140F0C] flex-shrink-0 mb-0.5 shadow-2xs">
                        <Bot className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}

                    <div
                      className={`p-3 sm:p-3.5 rounded-2xl shadow-xs text-xs sm:text-[13px] leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#140F0C] font-semibold rounded-br-xs shadow-md shadow-[#E5A93C]/10'
                          : 'bg-white border border-[#E6DDD1] text-[#1E1915] rounded-bl-xs space-y-2.5'
                      }`}
                    >
                      <div>{renderFormattedText(msg.text)}</div>

                      {/* ── 1. Compact Customer Profile Card ─────────── */}
                      {!isUser && msg.cardType === 'customer_profile' && msg.cardData && (
                        <div className="bg-[#FAF6F1] border border-[#E6DDD1] rounded-xl p-2.5 sm:p-3 space-y-2 text-xs text-[#1E1915] mt-1">
                          <div className="flex items-center justify-between border-b border-[#E6DDD1] pb-1.5 flex-wrap gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#C88A22]" />
                              <span className="font-extrabold text-xs text-[#1E1915] font-['Cinzel',serif]">
                                {msg.cardData.customerName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.cardData.customerPhone)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-[#E6DDD1] text-[#8C4717] hover:border-[#E5A93C] cursor-pointer"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{msg.cardData.customerPhone}</span>
                              {copiedText === msg.cardData.customerPhone ? <CheckCheck className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-[#9E8B7F]" />}
                            </button>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                            <div className="bg-white p-1 rounded-md border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block font-mono text-[8px] uppercase">Visits</span>
                              <span className="font-extrabold font-mono text-[#1E1915]">{msg.cardData.totalCount}</span>
                            </div>
                            <div className="bg-white p-1 rounded-md border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block font-mono text-[8px] uppercase">Done</span>
                              <span className="font-extrabold font-mono text-emerald-600">{msg.cardData.completedCount}</span>
                            </div>
                            <div className="bg-white p-1 rounded-md border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block font-mono text-[8px] uppercase">Cancel</span>
                              <span className="font-extrabold font-mono text-red-600">{msg.cardData.cancelledCount}</span>
                            </div>
                            <div className="bg-white p-1 rounded-md border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block font-mono text-[8px] uppercase">Spend</span>
                              <span className="font-extrabold font-mono text-[#8C4717]">{msg.cardData.totalSpend} ETB</span>
                            </div>
                          </div>

                          {/* Expandable History Drawer */}
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleCustomerHistory(msg.cardData.customerPhone || msg.cardData.customerName)}
                              className="w-full flex items-center justify-between py-1 px-2 rounded-md bg-white hover:bg-[#FAF0DD] border border-[#E6DDD1] text-[10.5px] font-bold text-[#8C4717] transition-colors cursor-pointer"
                            >
                              <span>View History ({msg.cardData.allAppointments.length})</span>
                              {expandedCustomerHistory[msg.cardData.customerPhone || msg.cardData.customerName] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {expandedCustomerHistory[msg.cardData.customerPhone || msg.cardData.customerName] && (
                              <div className="space-y-1 mt-1.5 max-h-36 overflow-y-auto pr-1">
                                {msg.cardData.allAppointments.map((appt, idx) => (
                                  <div key={idx} className="bg-white p-1.5 rounded-md border border-[#E6DDD1] text-[10px] flex items-center justify-between gap-1.5">
                                    <div>
                                      <span className="font-bold text-[#1E1915] block">{appt.serviceName}</span>
                                      <span className="text-[9px] text-[#8C7A6D]">{formatAppointmentRelativeDate(appt.dateStr) || appt.dateStr} · {appt.barberName}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="font-mono font-bold text-[#8C4717] block">{appt.price || appt.amountPaid} ETB</span>
                                      <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                                        appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                        appt.status?.includes('Cancelled') ? 'bg-red-50 text-red-700' :
                                        'bg-amber-50 text-amber-800'
                                      }`}>
                                        {appt.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      
                      {/* ── 3. Interactive Customer Selection Card (Clarification / Search Results) ── */}
                      {!isUser && msg.cardType === 'clarification' && Array.isArray(msg.cardData) && (
                        <div className="space-y-1.5 mt-2">
                          <div className="text-[11px] font-bold text-[#8C4717] px-0.5 uppercase tracking-wider">
                            Select Customer:
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {msg.cardData.map((cust, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleSend(
                                  { type: 'customer_selection', customerId: cust.customerId || cust.customerPhone || cust.customerName, customerName: cust.customerName, customerPhone: cust.customerPhone },
                                  `${cust.customerName}${cust.customerPhone ? ' (' + cust.customerPhone + ')' : ''}`
                                )}
                                className="w-full text-left p-2.5 rounded-xl bg-[#FAF6F1] hover:bg-[#FAF0DD] border border-[#E6DDD1] hover:border-[#8C4717] transition-all cursor-pointer shadow-2xs group flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-xs text-[#1E1915] group-hover:text-[#8C4717] flex items-center gap-1.5 truncate">
                                    <User className="w-3.5 h-3.5 text-[#C88A22] flex-shrink-0" />
                                    <span className="truncate">{cust.customerName}</span>
                                  </div>
                                  {cust.customerPhone && (
                                    <div className="text-[10px] text-[#6E5D52] font-mono mt-0.5 flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5 text-[#9E8B7F] flex-shrink-0" />
                                      <span>{cust.customerPhone}</span>
                                    </div>
                                  )}
                                  {cust.latestAppointment && (
                                    <div className="text-[9.5px] text-[#8C7A6D] mt-0.5 truncate">
                                      {cust.latestAppointment.serviceName} · {formatAppointmentRelativeDate(cust.latestAppointment.dateStr) || cust.latestAppointment.dateStr}
                                    </div>
                                  )}
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-[#C88A22] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── 2. Compact Analytics Metric Card ─────────── */}
                      {!isUser && msg.cardType === 'analytics_metric' && msg.cardData && (
                        <div className="bg-[#FAF6F1] border border-[#E6DDD1] rounded-xl p-2.5 space-y-1.5 text-xs text-[#1E1915] mt-1">
                          <div className="flex items-center justify-between border-b border-[#E6DDD1] pb-1">
                            <span className="font-bold text-xs text-[#1E1915]">
                              {msg.cardData.title}
                            </span>
                            <span className="font-mono font-black text-sm text-[#8C4717]">
                              {msg.cardData.revenue?.toLocaleString() || 0} ETB
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                            <div className="bg-white p-1 rounded border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block text-[8px] uppercase">Completed</span>
                              <span className="font-bold text-emerald-700 font-mono">{msg.cardData.completedCount || 0}</span>
                            </div>
                            <div className="bg-white p-1 rounded border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block text-[8px] uppercase">Pending</span>
                              <span className="font-bold text-amber-800 font-mono">{msg.cardData.pendingCount || 0}</span>
                            </div>
                            <div className="bg-white p-1 rounded border border-[#E6DDD1]">
                              <span className="text-[#8C7A6D] block text-[8px] uppercase">Cancelled</span>
                              <span className="font-bold text-red-700 font-mono">{msg.cardData.cancelledCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Follow-up Suggestion Action Chips ────────── */}
                      {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="pt-2 border-t border-[#E6DDD1]/70 flex flex-wrap gap-1">
                          {msg.suggestions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                if (sug.action === 'filter_payment_pending' && onFilterPayment) {
                                  onFilterPayment('pending');
                                }
                                if (sug.action === 'filter_barber_yohannes' && onFilterBarber) {
                                  onFilterBarber('barber-4');
                                }
                                if (sug.action === 'select_customer' || sug.customerId || sug.prompt?.startsWith('__SELECT_CUSTOMER__:')) {
                                  handleSend(
                                    { type: 'customer_selection', customerId: sug.customerId || sug.prompt?.replace('__SELECT_CUSTOMER__:', ''), customerName: sug.customerName || sug.label, customerPhone: sug.customerPhone },
                                    sug.label
                                  );
                                  return;
                                }
                                if (sug.action === 'select_appointment' || sug.prompt?.startsWith('__SELECT_APPOINTMENT__:')) {
                                  handleSend(
                                    { type: 'appointment_selection', ref: sug.ref || sug.prompt?.replace('__SELECT_APPOINTMENT__:', '') },
                                    sug.label
                                  );
                                  return;
                                }
                                handleSend(sug.prompt || sug.label);
                              }}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40 hover:bg-[#FAF0DD] transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>{sug.label}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-[#C88A22]" />
                            </button>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>

                  <span className="text-[10px] text-[#9E8B7F] font-mono px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Live Typing Indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#140F0C] flex-shrink-0 mb-0.5 shadow-2xs">
                  <Bot className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="bg-white border border-[#E6DDD1] px-3.5 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Fixed Prompt Input Bar ──────────────────────────────── */}
          <div className="p-3 bg-white border-t border-[#E6DDD1] flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Staff AI anything..."
                className="flex-1 bg-[#FAF6F1] border border-[#E6DDD1] focus:border-[#E5A93C] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#1E1915] placeholder:text-[#9E8B7F] outline-none transition-all ring-0 focus:ring-2 focus:ring-[#E5A93C]/20"
              />

              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className="p-2.5 rounded-xl bg-[#140F0C] text-[#E5A93C] hover:bg-[#221A15] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
