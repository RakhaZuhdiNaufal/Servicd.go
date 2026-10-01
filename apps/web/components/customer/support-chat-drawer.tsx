'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Headphones,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'cs';
  text: string;
  timestamp: string;
}

const TEMPLATE_FAQS = [
  {
    id: 'faq-1',
    question: 'Berapa lama estimasi pengerjaan servis berkala?',
    answer:
      'Servis berkala (Tune Up, Ganti Oli, dan Cek 20 Titik) biasanya membutuhkan waktu 45–90 menit tergantung antrean bengkel. Anda bisa memantau status pengerjaan secara real-time di halaman Riwayat Servis.'
  },
  {
    id: 'faq-2',
    question: 'Apakah ada garansi setelah servis selesai?',
    answer:
      'Ya, tentu! ServiceGo memberikan Garansi Pengerjaan & Suku Cadang hingga 1.000 KM atau 14 hari kerja di seluruh bengkel rekanan resmi kami. Jika keluhan masih berlanjut, pengerjaan ulang bebas biaya jasa.'
  },
  {
    id: 'faq-3',
    question: 'Bagaimana cara pakai voucher promo SERVISHEMAT20?',
    answer:
      'Kode voucher SERVISHEMAT20 memberikan diskon 20% untuk booking pertama Anda. Cukup masukkan kode ini di kolom "Kode Promo" saat mengisi formulir booking baru.'
  },
  {
    id: 'faq-4',
    question: 'Apakah bisa booking servis untuk hari ini?',
    answer:
      'Bisa! Anda dapat memilih jadwal servis untuk hari ini (selama slot bengkel masih tersedia) atau menjadwalkannya hingga 14 hari ke depan. Jam operasional bengkel rata-rata 08:00 – 16:30 WIB.'
  },
  {
    id: 'faq-5',
    question: 'Metode pembayaran apa saja yang diterima?',
    answer:
      'Kami mendukung pembayaran tunai langsung di kasir bengkel (Cash on Service), Transfer Bank / Virtual Account (BCA, Mandiri, BRI, BNI), serta QRIS dan E-Wallet (GoPay, OVO, ShopeePay).'
  }
];

interface SupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function SupportChatDrawer({ isOpen, onClose, userEmail }: SupportChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: 'Halo Kak! 👋 Selamat datang di Layanan Bantuan & Live Chat ServiceGo. Ada yang bisa kami bantu seputar servis atau kendaraan Anda hari ini?',
      timestamp: 'Baru saja'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // Handle template click
  function handleSelectFAQ(faq: typeof TEMPLATE_FAQS[number]) {
    if (isTyping) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: faq.question,
      timestamp: getFormattedTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: faq.answer,
        timestamp: getFormattedTime()
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1100);
  }

  // Handle custom user submit
  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: getFormattedTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulated CS escalation response as agreed in plan
    setTimeout(() => {
      setIsTyping(false);
      const csReply: ChatMessage = {
        id: 'cs-' + Date.now(),
        sender: 'cs',
        text: 'Baik Kak, pesan Anda sudah kami teruskan ke tim Customer Support ServiceGo. Tim CS kami sedang meninjau keluhan Anda dan akan segera membalas di sini dalam beberapa menit. Harap tidak meninggalkan website ini ya 🙏',
        timestamp: getFormattedTime()
      };
      setMessages((prev) => [...prev, csReply]);
    }, 1200);
  }

  function handleResetChat() {
    setMessages([
      {
        id: 'init-' + Date.now(),
        sender: 'bot',
        text: 'Halo Kak! 👋 Percakapan telah diatur ulang. Silakan pilih pertanyaan atau tulis keluhan servis Anda kembali.',
        timestamp: getFormattedTime()
      }
    ]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop with Blur */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Slide-over Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-drawer-title"
        className="relative z-10 w-full sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
                <Headphones className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="support-drawer-title" className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Customer Support ServiceGo
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Respon Cepat · Bantuan Booking & Teknis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              title="Mulai Ulang Percakapan"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Tutup Bantuan"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick FAQ Suggestion Chips Bar */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" />
            <span>Pertanyaan Populer:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {TEMPLATE_FAQS.map((faq) => (
              <button
                key={faq.id}
                type="button"
                disabled={isTyping}
                onClick={() => handleSelectFAQ(faq)}
                className="shrink-0 text-left px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {faq.question}
              </button>
            ))}
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Welcome Info Box */}
          <div className="p-3.5 rounded-2xl bg-primary-50/70 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 flex items-start gap-3 text-xs text-primary-950 dark:text-primary-200">
            <ShieldCheck className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold text-primary-900 dark:text-primary-100">
                Pusat Bantuan Resmi ServiceGo
              </p>
              <p className="text-[11px] text-primary-700/80 dark:text-primary-300/80 leading-relaxed">
                Punya pertanyaan garansi, biaya estimasi, atau perubahan jadwal booking? Tanyakan di bawah ini.
              </p>
            </div>
          </div>

          {/* Messages List */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-primary-600 text-white rounded-tr-xs'
                      : msg.sender === 'cs'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 rounded-tl-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  {msg.sender === 'cs' && (
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-400 mb-1">
                      <Headphones className="h-3 w-3" />
                      <span>Agen Support</span>
                    </div>
                  )}
                  <p>{msg.text}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCircle2 className="h-3 w-3 text-primary-500" />}
                </div>
              </div>
            );
          })}

          {/* Animated Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-600 flex items-center justify-center shrink-0 text-xs">
                <Headphones className="h-3.5 w-3.5" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="text-[11px] text-slate-400 ml-1.5">CS sedang mengetik...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              placeholder="Tulis pesan atau pertanyaan Anda..."
              className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Kirim Pesan"
              className="h-10 w-10 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shrink-0 shadow-sm shadow-primary-600/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
            <span>Didukung Customer Service ServiceGo</span>
            {userEmail && <span className="truncate max-w-[180px]">{userEmail}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
