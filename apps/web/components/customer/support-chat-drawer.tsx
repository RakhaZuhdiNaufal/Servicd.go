'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, Send, Headphones, ChevronDown, Loader2, LogIn, RotateCw } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDateWIB, formatTimeWIB, wibDateKey } from '@/lib/format';
import { MAX_MESSAGE_LENGTH, type CustomerSupportChat } from '@/lib/support-chat';

// Jawaban cepat: hanya berisi hal yang benar-benar ada di aplikasi. Tidak disimpan ke server.
const QUICK_ANSWERS = [
  {
    id: 'faq-booking',
    question: 'Bagaimana cara booking servis?',
    answer:
      'Tekan tombol Booking servis, lalu pilih kendaraan, layanan, bengkel (bila ada lebih dari satu), dan jadwal. Untuk konfirmasi booking kamu perlu masuk ke akun.'
  },
  {
    id: 'faq-jam',
    question: 'Jam berapa saja bisa datang?',
    answer:
      'Slot kedatangan tersedia per jam (WIB): 08.00 sampai 11.00 dan 13.00 sampai 16.00. Slot yang sudah penuh tidak bisa dipilih di form booking.'
  },
  {
    id: 'faq-status',
    question: 'Di mana cek status servis?',
    answer:
      'Buka menu Riwayat, lalu pilih booking kamu. Statusnya: Menunggu Konfirmasi, Sedang Dikerjakan, Selesai / Siap Diambil, atau Dibatalkan.'
  },
  {
    id: 'faq-promo',
    question: 'Bagaimana pakai kode promo?',
    answer:
      'Isi kode promo di ringkasan booking, lalu tekan Pakai. Diskon langsung dipotong dari estimasi biaya layanan yang kamu pilih.'
  },
  {
    id: 'faq-ubah',
    question: 'Bisa ubah atau batalkan jadwal?',
    answer:
      'Perubahan jadwal belum bisa dilakukan sendiri di aplikasi. Tulis permintaanmu ke CS lewat chat di bawah, atau telepon bengkel.'
  }
];

const QUICK_REPLIES_CUSTOMER = ['Mau ubah jadwal booking', 'Mau tanya estimasi biaya', 'Status servis saya bagaimana?'];

interface SupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  /** null = tamu (belum login). */
  chat: CustomerSupportChat | null;
  loginHref: string;
}

export function SupportChatDrawer({ isOpen, onClose, userEmail, chat, loginHref }: SupportChatDrawerProps) {
  const [inputValue, setInputValue] = useState('');
  const [faqOpen, setFaqOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const isGuest = !chat;
  const messages = chat?.messages ?? [];

  // Tamu langsung melihat jawaban cepat; yang sudah login fokus ke chat.
  useEffect(() => {
    if (isOpen) setFaqOpen(isGuest || messages.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isGuest]);

  // Gulir ke pesan terbaru (tanpa animasi).
  useEffect(() => {
    if (isOpen && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, isOpen]);

  // Balasan CS ditandai dibaca selama drawer terbuka.
  const unread = chat?.unreadFromAdmin ?? 0;
  const markRead = chat?.markRead;
  useEffect(() => {
    if (isOpen && unread > 0 && markRead) markRead();
  }, [isOpen, unread, markRead]);

  // Saat dibuka: simpan elemen pemicu, fokus ke tombol tutup. Saat ditutup: kembalikan fokus.
  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      closeBtnRef.current?.focus();
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape menutup, Tab tetap di dalam dialog.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Kunci scroll halaman saat drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!chat || !inputValue.trim() || chat.sending) return;
    const ok = await chat.send(inputValue);
    if (ok) setInputValue('');
  }

  if (!isOpen) return null;

  const faq = QUICK_ANSWERS.find((f) => f.id === activeFaq);
  const resolved = chat?.conversation?.status === 'resolved';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={onClose} aria-hidden="true" className="fixed inset-0 bg-slate-950/50" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-drawer-title"
        aria-describedby="support-drawer-desc"
        className="relative z-10 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-md"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-100">
              <Headphones className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="support-drawer-title" className="font-semibold text-slate-900 dark:text-white">
                Bantuan ServiceGo
              </h2>
              <p id="support-drawer-desc" className="text-sm text-slate-600 dark:text-slate-400">
                {isGuest ? 'Jawaban cepat. Masuk untuk chat dengan CS.' : 'Chat dengan tim CS. Balasan masuk di sini.'}
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup bantuan"
            title="Tutup (Esc)"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Jawaban cepat (lokal, tidak dikirim ke CS) */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setFaqOpen((v) => !v)}
            aria-expanded={faqOpen}
            aria-controls="support-faq"
            className="flex min-h-[48px] w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900 transition-colors"
          >
            Jawaban cepat
            <ChevronDown className={clsx('h-4 w-4 shrink-0', faqOpen && 'rotate-180')} aria-hidden />
          </button>
          {faqOpen && (
            <div id="support-faq" className="space-y-3 px-4 pb-4">
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                {QUICK_ANSWERS.map((f) => (
                  <li key={f.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveFaq((cur) => (cur === f.id ? null : f.id))}
                      aria-pressed={activeFaq === f.id}
                      className={clsx(
                        'min-h-[44px] whitespace-nowrap rounded-chip border px-3 py-2 text-left text-sm font-medium transition-colors sm:whitespace-normal',
                        activeFaq === f.id
                          ? 'border-primary-600 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-900/40 dark:text-primary-100'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-primary-600 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-100'
                      )}
                    >
                      {f.question}
                    </button>
                  </li>
                ))}
              </ul>
              {faq && (
                <p className="rounded-ctl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-live="polite">
                  {faq.answer}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Percakapan dengan CS */}
        <div ref={logRef} className="flex-1 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Percakapan dengan CS">
          {isGuest && (
            <div className="space-y-3 rounded-ctl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
              <p className="font-semibold text-slate-900 dark:text-white">Chat dengan CS butuh akun</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Supaya CS bisa melihat booking dan kendaraanmu, masuk dulu. Riwayat chat tersimpan di akunmu.
              </p>
              <Link
                href={loginHref}
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Masuk untuk chat
              </Link>
            </div>
          )}

          {chat && chat.loading && messages.length === 0 && (
            <div className="space-y-3" aria-busy>
              <div className="h-12 w-2/3 rounded-ctl shimmer" />
              <div className="ml-auto h-10 w-1/2 rounded-ctl shimmer" />
            </div>
          )}

          {chat && chat.error && messages.length === 0 && !chat.loading && (
            <div role="alert" className="space-y-2 rounded-ctl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
              <p className="text-red-800 dark:text-red-200">{chat.error}</p>
              <button
                type="button"
                onClick={() => chat.reload()}
                className="inline-flex min-h-[40px] items-center gap-1.5 font-semibold text-red-800 hover:underline dark:text-red-200"
              >
                <RotateCw className="h-4 w-4" aria-hidden />
                Coba lagi
              </button>
            </div>
          )}

          {chat && !chat.loading && !chat.error && messages.length === 0 && (
            <div className="space-y-3 py-6 text-center">
              <p className="font-semibold text-slate-900 dark:text-white">Belum ada pesan</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tulis pertanyaanmu di bawah. Tim CS akan membalas di sini, dan kamu bisa menutup drawer ini sambil menunggu.
              </p>
              <ul className="flex flex-wrap justify-center gap-2 pt-1">
                {QUICK_REPLIES_CUSTOMER.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => setInputValue(q)}
                      className="min-h-[40px] rounded-chip border border-slate-300 px-3 text-sm text-slate-700 hover:border-primary-600 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-100 transition-colors"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.length > 0 && (
            <ol className="space-y-3">
              {messages.map((m, i) => {
                const mine = m.sender_type === 'customer';
                const prev = messages[i - 1];
                const newDay = !prev || wibDateKey(prev.created_at) !== wibDateKey(m.created_at);
                return (
                  <li key={m.id}>
                    {newDay && (
                      <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        {formatDateWIB(m.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    )}
                    <div className={clsx('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                      <div
                        className={clsx(
                          'max-w-[85%] whitespace-pre-wrap break-words rounded-ctl px-4 py-2.5 text-sm leading-relaxed',
                          mine
                            ? 'bg-primary-600 text-white'
                            : 'border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                        )}
                      >
                        {!mine && <span className="sr-only">CS: </span>}
                        {m.message}
                      </div>
                      <span className="px-1 text-xs text-slate-600 dark:text-slate-400">
                        {mine ? 'Kamu' : m.sender_type === 'bot' ? 'Pesan otomatis' : 'CS ServiceGo'}, {formatTimeWIB(m.created_at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {resolved && (
            <p className="mt-4 rounded-ctl bg-slate-100 p-3 text-center text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              CS menandai percakapan ini selesai. Kirim pesan lagi kalau masih ada yang ingin ditanyakan.
            </p>
          )}
        </div>

        {/* Input */}
        {chat && (
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
            {chat.error && messages.length > 0 && (
              <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">
                {chat.error}
              </p>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <label htmlFor="support-input" className="sr-only">
                Tulis pesan untuk CS
              </label>
              <textarea
                id="support-input"
                rows={1}
                value={inputValue}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tulis pesan untuk CS..."
                className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-ctl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || chat.sending}
                aria-label="Kirim pesan"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 transition-colors"
              >
                {chat.sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Enter untuk kirim, Shift+Enter untuk baris baru.{userEmail ? ` Masuk sebagai ${userEmail}.` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
