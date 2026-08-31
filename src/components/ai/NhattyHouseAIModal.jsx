import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Scissors,
  ArrowRight,
  Phone,
  ExternalLink,
  Calendar,
  CreditCard,
  MapPin,
  Clock,
  User
} from 'lucide-react';
import { processMessage } from '../../services/aiAssistantEngine';
import { getActiveBooking, subscribeToBookingStore } from '../../data/bookingStore';

const INITIAL_GREETING = {
  id: 'msg-init',
  role: 'ai',
  text: `Hello! Welcome to **Nhatty Barber House** at Lucy Hotel. 👋\n\nI'm your virtual receptionist. I can help with services, barbers, appointment bookings, payments, and location.\n\nHow can I help you today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  actions: [
    { label: '💈 View Services', type: 'quick' },
    { label: '📅 How to Book', type: 'quick' },
    { label: '✂️ Our Barbers', type: 'quick' },
    { label: '🎫 My Appointment', type: 'quick' },
    { label: '📍 Location & Hours', type: 'quick' },
    { label: '🔄 Cancellation & Refund', type: 'quick' },
  ]
};

export default function NhattyHouseAIModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeBooking, setActiveBooking] = useState(() => getActiveBooking());
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync active booking in real-time
  useEffect(() => {
    const unsub = subscribeToBookingStore(() => {
      setActiveBooking(getActiveBooking());
    });
    return () => unsub();
  }, []);

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

  if (!isOpen) return null;

  const handleSendMessage = (textToSend = null) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setIsTyping(true);

    // Simulate natural AI thinking delay (350ms - 550ms)
    setTimeout(() => {
      const response = processMessage(query, newHistory);
      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'ai',
        text: response.text,
        actions: response.actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_GREETING]);
    setInputValue('');
    setIsTyping(false);
  };

  const handleActionClick = (action) => {
    if (action.type === 'navigate' && action.path) {
      onClose();
      navigate(action.path);
    } else if (action.type === 'call' && action.phone) {
      window.location.href = `tel:${action.phone.replace(/\s+/g, '')}`;
    } else if (action.type === 'link' && action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'quick') {
      const cleanText = action.label.replace(/^[^\w\s]+/, '').trim();
      handleSendMessage(cleanText);
    }
  };

  // Helper to format simple markdown (bold, lists, blockquotes)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, index) => {
      // Empty line spacer
      if (!line.trim()) {
        return <div key={index} className="h-1.5" />;
      }

      // Blockquote
      if (line.startsWith('>')) {
        return (
          <div
            key={index}
            className="border-l-2 border-[#E5A93C] pl-2.5 my-1 text-xs italic text-[#6E5D52] bg-[#FAF6F1]/80 py-1 rounded-r-md"
          >
            {renderInlineMarkdown(line.substring(1).trim())}
          </div>
        );
      }

      // Bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <div key={index} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs sm:text-[13px] leading-relaxed">
            <span className="text-[#C88A22] font-bold mt-0.5">•</span>
            <span>{renderInlineMarkdown(line.substring(1).trim())}</span>
          </div>
        );
      }

      // Standard line
      return (
        <p key={index} className="text-xs sm:text-[13px] leading-relaxed my-0.5">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Inline bold parser
  const renderInlineMarkdown = (line) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-[#1E1915]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return (
          <em key={i} className="italic text-[#6E5D52]">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[410px] md:w-[430px] h-[580px] max-h-[82vh] bg-[#FAF6F1] rounded-3xl shadow-2xl border border-[#E2D7C8] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      
      {/* ── Chat Header ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1E1915] via-[#28211C] to-[#171310] text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between border-b border-white/10 shadow-sm relative overflow-hidden flex-shrink-0">
        {/* Ambient subtle glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#E5A93C]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] shadow-md">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#1E1915] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm sm:text-base font-['Cinzel',serif] tracking-wide text-white leading-tight">
                Nhatty House AI
              </h3>
              <span className="text-[9px] font-mono font-bold bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] px-1.5 py-0.2 rounded uppercase">
                MVP Assistant
              </span>
            </div>
            <p className="text-[11px] text-[#C5B9AB] flex items-center gap-1">
              <span>Lucy Hotel Branch</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Online</span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5 relative z-10">
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-[#C5B9AB] hover:text-white hover:bg-white/10 transition-colors"
            title="Restart conversation"
            aria-label="Restart conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#C5B9AB] hover:text-white hover:bg-white/10 transition-colors"
            title="Close Assistant"
            aria-label="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Active Ticket Quick-Bar (If customer has active booking) ── */}
      {activeBooking && (
        <div className={`border-b px-4 py-2 flex items-center justify-between text-xs flex-shrink-0 ${
          activeBooking.status === 'Customer Cancelled' || activeBooking.status === 'Cancelled'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-[#FAF2E3] border-[#E5A93C]/30'
        }`}>
          <div className="flex items-center gap-2 truncate">
            <span className={`w-2 h-2 rounded-full ${
              activeBooking.status === 'Customer Cancelled' || activeBooking.status === 'Cancelled'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`} />
            <span className="text-[#8C4717] font-extrabold truncate">
              {activeBooking.status === 'Customer Cancelled' || activeBooking.status === 'Cancelled' ? 'Cancelled Record:' : 'Active Booking:'}{' '}
              <span className="font-mono text-[#1E1915]">{activeBooking.ref}</span>
              {activeBooking.barberName && activeBooking.startTime ? ` • ${activeBooking.barberName} (${activeBooking.startTime})` : ''}
            </span>
          </div>
          <button
            onClick={() => handleActionClick({ type: 'navigate', path: '/my-appointment' })}
            className="text-[11px] font-extrabold text-[#C88A22] hover:text-[#8C4717] underline flex items-center gap-0.5 flex-shrink-0"
          >
            <span>{activeBooking.status === 'Customer Cancelled' || activeBooking.status === 'Cancelled' ? 'View Details' : 'View Pass'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Conversation Messages Scroll Area ──────────────────── */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0 text-[#1E1915]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[85%]">
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] flex-shrink-0 mb-0.5 shadow-xs">
                    <Bot className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] font-medium rounded-br-xs shadow-md shadow-[#E5A93C]/10'
                      : 'bg-white border border-[#E6DDD1] text-[#1E1915] rounded-bl-xs'
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Interactive Action Buttons attached to AI message */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E6DDD1]/70 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          className={`inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs ${
                            act.type === 'navigate'
                              ? 'bg-[#1E1915] text-[#FAF6F1] hover:bg-[#E5A93C] hover:text-[#1A1614]'
                              : act.type === 'call'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : act.type === 'link'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                              : 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40 hover:bg-[#FAF0DD]'
                          }`}
                        >
                          {act.type === 'call' && <Phone className="w-3 h-3 text-emerald-600" />}
                          {act.type === 'link' && <ExternalLink className="w-3 h-3 text-blue-600" />}
                          {act.type === 'navigate' && <Calendar className="w-3 h-3 text-[#E5A93C]" />}
                          <span>{act.label}</span>
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
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] flex-shrink-0 mb-0.5 shadow-xs">
              <Bot className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="bg-white border border-[#E6DDD1] px-4 py-3 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#C88A22] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E6DDD1] flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Nhatty House AI anything..."
              disabled={isTyping}
              className="w-full bg-[#FAF6F1] border border-[#E2D7C8] focus:border-[#E5A93C] focus:bg-white text-xs sm:text-sm text-[#1E1915] placeholder-[#9E8B7F] rounded-2xl px-4 py-3 outline-none transition-all pr-10 shadow-inner"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E8B7F] hover:text-[#1E1915] text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[#1A1614] shadow-md transition-all ${
              inputValue.trim() && !isTyping
                ? 'bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] shadow-[#E5A93C]/30 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-[#E6DDD1] text-[#9E8B7F] cursor-not-allowed opacity-60'
            }`}
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

    </div>
  );
}
