'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Inbox, Loader2, RotateCcw, RotateCw, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { formatDateWIB, formatNotificationTime, formatTimeWIB, isTodayWIB } from '@/lib/format';
import {
  MAX_MESSAGE_LENGTH,
  friendlySupportError,
  upsertMessage,
  type SupportConversation,
  type SupportMessage
} from '@/lib/support-chat';
import { AdminPageHeader, Initials, btnPrimary, btnSecondary, inputCls } from '@/components/admin/resource-ui';

type Filter = 'semua' | 'belum' | 'selesai';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'belum', label: 'Belum dibalas' },
  { key: 'selesai', label: 'Selesai' }
];

// Template balasan cepat untuk admin. Teks bisa diedit dulu sebelum dikirim.
const CANNED = [
  'Halo, terima kasih sudah menghubungi ServiceGo. Pesan kamu sudah kami terima, kami cek dulu ya.',
  'Boleh kirim kode booking kamu (contoh: SG-1A2B3C4D)? Kodenya ada di menu Riwayat.',
  'Jadwal bisa kami bantu ubah. Mau pindah ke tanggal dan jam berapa?',
  'Booking kamu sudah kami perbarui. Silakan cek statusnya di menu Riwayat.'
];

function matchesFilter(c: SupportConversation, f: Filter) {
  if (f === 'belum') return c.status !== 'resolved' && c.unread_admin_count > 0;
  if (f === 'selesai') return c.status === 'resolved';
  return true;
}

// Waktu di daftar percakapan: jam WIB untuk hari ini, tanggal WIB untuk hari lain.
function timeLabel(iso: string) {
  return isTodayWIB(iso) ? formatTimeWIB(iso) : formatDateWIB(iso, { day: 'numeric', month: 'short' });
}

function AdminSupportContent() {
  const { session } = useAuth();
  const adminId = session?.user.id ?? null;
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('semua');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const pendingPrefillRef = useRef<string | null>(null);
  const handledPrefillKeyRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200);
    if (error) setListError(friendlySupportError(error));
    else setConversations((data ?? []) as SupportConversation[]);
    setListLoading(false);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setRoomLoading(true);
    setRoomError(null);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (selectedIdRef.current !== conversationId) return;
    if (error) setRoomError(friendlySupportError(error));
    else setMessages(((data ?? []) as SupportMessage[]).reverse());
    setRoomLoading(false);
  }, []);

  const markRead = useCallback(async (conversationId: string) => {
    const { error } = await supabase.rpc('support_mark_read', { p_conversation_id: conversationId });
    if (!error) {
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_admin_count: 0 } : c)));
    }
  }, []);

  useEffect(() => {
    if (adminId) loadConversations();
  }, [adminId, loadConversations]);

  // Tangkap parameter dari halaman Kendaraan (?customerEmail=...&prefill=...)
  useEffect(() => {
    if (!adminId || listLoading) return;

    const targetEmail = searchParams.get('customerEmail')?.trim() || '';
    const targetAuthId = searchParams.get('authUserId')?.trim() || '';
    const targetCustomerId = searchParams.get('customerId')?.trim() || '';
    const targetName = searchParams.get('customerName')?.trim() || 'Pelanggan';
    const prefillText = searchParams.get('prefill') || '';

    if (!targetEmail && !targetAuthId && !targetCustomerId) return;

    const key = `${targetEmail}|${targetAuthId}|${targetCustomerId}|${prefillText.slice(0, 32)}`;
    if (handledPrefillKeyRef.current === key) return;
    handledPrefillKeyRef.current = key;

    async function openOrCreateTargetRoom() {
      const existing = conversations.find((c) => {
        const raw = c as Record<string, any>;
        if (targetEmail && c.customer_email?.toLowerCase() === targetEmail.toLowerCase()) return true;
        if (targetAuthId && raw.customer_id === targetAuthId) return true;
        if (targetCustomerId && raw.customer_id === targetCustomerId) return true;
        return false;
      });

      if (existing) {
        setFilter('semua');
        if (prefillText) {
          pendingPrefillRef.current = prefillText;
          setReply(prefillText);
        }
        setSelectedId(existing.id);
        return;
      }

      // Jika pemilik kendaraan belum pernah chat sebelumnya, buat percakapan baru
      const customerUid = targetAuthId || targetCustomerId;
      if (!customerUid) return;

      const { data: created, error } = await supabase
        .from('support_conversations')
        .insert({
          customer_id: customerUid,
          customer_name: targetName,
          customer_email: targetEmail || null,
          status: 'active'
        })
        .select('*')
        .single();

      if (error || !created) {
        if (prefillText) {
          try {
            await navigator.clipboard.writeText(prefillText);
            toast.info('Pelanggan belum pernah memulai chat. Pesan pengingat sudah disalin ke clipboard.');
          } catch {
            toast.error('Pelanggan ini belum memiliki ruang chat aktif.');
          }
        }
        return;
      }

      const newConv = created as SupportConversation;
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setFilter('semua');
      if (prefillText) {
        pendingPrefillRef.current = prefillText;
        setReply(prefillText);
      }
      setSelectedId(newConv.id);
    }

    openOrCreateTargetRoom();
  }, [adminId, listLoading, conversations, searchParams]);

  useEffect(() => {
    setMessages([]);
    if (pendingPrefillRef.current) {
      setReply(pendingPrefillRef.current);
      pendingPrefillRef.current = null;
    } else {
      setReply('');
    }
    if (!selectedId) {
      setRoomLoading(false);
      return;
    }
    loadMessages(selectedId);
    markRead(selectedId);
  }, [selectedId, loadMessages, markRead]);

  useEffect(() => {
    if (!adminId) return;
    const channel = supabase
      .channel('support-admin-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id?: string }).id;
          setConversations((prev) => prev.filter((c) => c.id !== oldId));
          return;
        }
        const row = payload.new as SupportConversation;
        setConversations((prev) => {
          const rest = prev.filter((c) => c.id !== row.id);
          return [row, ...rest].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const msg = payload.new as SupportMessage;
        if (msg.conversation_id === selectedIdRef.current) {
          setMessages((prev) => upsertMessage(prev, msg));
          if (msg.sender_type === 'customer') markRead(msg.conversation_id);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, markRead]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, selectedId]);

  const counts = useMemo(
    () => ({
      semua: conversations.length,
      belum: conversations.filter((c) => matchesFilter(c, 'belum')).length,
      selesai: conversations.filter((c) => matchesFilter(c, 'selesai')).length
    }),
    [conversations]
  );
  const visible = conversations.filter((c) => matchesFilter(c, filter));
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  async function sendReply(e?: React.FormEvent) {
    e?.preventDefault();
    const body = reply.trim();
    if (!selected || !adminId || !body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from('support_messages')
      .insert({ conversation_id: selected.id, sender_type: 'admin', sender_id: adminId, message: body })
      .select('*')
      .single();
    setSending(false);
    if (error) {
      toast.error(friendlySupportError(error));
      return;
    }
    setMessages((prev) => upsertMessage(prev, data as SupportMessage));
    setReply('');
  }

  async function setStatus(status: 'active' | 'resolved') {
    if (!selected) return;
    setStatusSaving(true);
    const { data, error } = await supabase
      .from('support_conversations')
      .update({ status })
      .eq('id', selected.id)
      .select('*')
      .single();
    setStatusSaving(false);
    if (error) {
      toast.error(friendlySupportError(error));
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === selected.id ? (data as SupportConversation) : c)));
    toast.success(status === 'resolved' ? 'Percakapan ditandai selesai' : 'Percakapan dibuka lagi');
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col gap-5">
      <AdminPageHeader
        title="Live Support"
        description="Chat pelanggan masuk langsung di sini. Balasanmu muncul di panel bantuan aplikasi pelanggan."
      />

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Inbox */}
        <section
          aria-label="Daftar percakapan"
          className={clsx(
            'flex min-h-0 w-full shrink-0 flex-col border-slate-200 dark:border-slate-800 md:w-[22rem] md:border-r',
            selectedId && 'hidden md:flex'
          )}
        >
          <div role="tablist" aria-label="Saring percakapan" className="flex gap-1 border-b border-slate-200 p-2 dark:border-slate-800">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                type="button"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  'flex min-h-[40px] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-chip px-1.5 text-[13px] font-medium transition-colors',
                  filter === f.key
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                {f.label}
                <span className="tabular-nums opacity-80">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy aria-label="Memuat percakapan">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 shrink-0 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-1/2 rounded shimmer" />
                      <div className="h-3 w-full rounded shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!listLoading && listError && (
              <div role="alert" className="m-3 space-y-2 rounded-ctl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
                <p className="font-semibold text-red-800 dark:text-red-200">Percakapan belum bisa dimuat</p>
                <p className="text-red-700 dark:text-red-300">{listError}</p>
                <button
                  type="button"
                  onClick={loadConversations}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl border border-red-300 bg-white px-3 font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-900/40"
                >
                  <RotateCw className="h-4 w-4" aria-hidden />
                  Coba lagi
                </button>
              </div>
            )}

            {!listLoading && !listError && visible.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Inbox className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {filter === 'belum'
                    ? 'Semua chat sudah dibalas.'
                    : filter === 'selesai'
                    ? 'Belum ada percakapan yang ditandai selesai.'
                    : 'Belum ada chat dari pelanggan.'}
                </p>
              </div>
            )}

            {!listLoading && !listError && visible.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((c) => {
                  const name = c.customer_name || c.customer_email || 'Pelanggan';
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        aria-current={active ? 'true' : undefined}
                        className={clsx(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                          active
                            ? 'bg-primary-50 dark:bg-primary-900/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        )}
                      >
                        <Initials name={name} />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={clsx(
                                'truncate text-sm text-slate-900 dark:text-white',
                                c.unread_admin_count > 0 ? 'font-semibold' : 'font-medium'
                              )}
                            >
                              {name}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                              {timeLabel(c.last_message_at)}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                              {c.last_message ?? 'Belum ada pesan'}
                            </span>
                            {c.unread_admin_count > 0 ? (
                              <span className="shrink-0 rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold leading-[18px] text-white tabular-nums">
                                <span className="sr-only">Belum dibaca: </span>
                                {c.unread_admin_count}
                              </span>
                            ) : c.status === 'resolved' ? (
                              <span className="shrink-0 text-xs text-green-700 dark:text-green-300">Selesai</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Ruang chat */}
        <section aria-label="Percakapan" className={clsx('min-h-0 min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Inbox className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pilih percakapan di kiri untuk mulai membalas.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="-ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                    aria-label="Kembali ke daftar percakapan"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="hidden sm:block">
                    <Initials name={selected.customer_name || selected.customer_email || 'Pelanggan'} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{selected.customer_name || 'Pelanggan'}</p>
                    <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                      {selected.customer_email}
                      {selected.status === 'resolved' ? ' · Selesai' : ' · Aktif'}
                    </p>
                  </div>
                </div>
                {selected.status === 'resolved' ? (
                  <button type="button" onClick={() => setStatus('active')} disabled={statusSaving} className={clsx(btnSecondary, 'shrink-0 px-3')}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Buka lagi
                  </button>
                ) : (
                  <button type="button" onClick={() => setStatus('resolved')} disabled={statusSaving} className={clsx(btnSecondary, 'shrink-0 px-3')}>
                    <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-300" aria-hidden />
                    Tandai selesai
                  </button>
                )}
              </header>

              <div ref={logRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
                {roomLoading && messages.length === 0 && (
                  <div className="space-y-3" aria-busy aria-label="Memuat pesan">
                    <div className="h-10 w-1/2 rounded-2xl shimmer" />
                    <div className="ml-auto h-10 w-1/3 rounded-2xl shimmer" />
                  </div>
                )}
                {roomError && (
                  <div role="alert" className="flex flex-wrap items-center gap-2 rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <span className="flex-1">{roomError}</span>
                    <button
                      type="button"
                      onClick={() => loadMessages(selected.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
                    >
                      <RotateCw className="h-4 w-4" aria-hidden />
                      Coba lagi
                    </button>
                  </div>
                )}
                {!roomLoading && !roomError && messages.length === 0 && (
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">Belum ada pesan di percakapan ini.</p>
                )}
                {messages.map((m) => {
                  const bot = m.sender_type === 'bot';
                  const mine = m.sender_type === 'admin' || bot;
                  return (
                    <div key={m.id} className={clsx('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                      <div
                        className={clsx(
                          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                          bot
                            ? 'rounded-br-md border border-dashed border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
                            : mine
                              ? 'rounded-br-md bg-primary-600 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                        )}
                      >
                        {m.message}
                      </div>
                      <span className="px-1 text-xs text-slate-600 dark:text-slate-400">
                        {bot ? 'Pesan otomatis' : mine ? 'CS' : selected.customer_name || 'Pelanggan'},{' '}
                        {formatNotificationTime(m.created_at, { todayLabel: 'Hari ini' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
                <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Balasan cepat">
                  {CANNED.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReply(t)}
                      title={t}
                      className="min-h-[36px] max-w-[16rem] shrink-0 truncate rounded-chip border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 transition-colors hover:border-primary-600 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-100"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <form onSubmit={sendReply} className="flex items-end gap-2">
                  <label htmlFor="admin-reply" className="sr-only">
                    Tulis balasan
                  </label>
                  <textarea
                    id="admin-reply"
                    rows={3}
                    value={reply}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Tulis balasan... (Enter untuk kirim, Shift+Enter baris baru)"
                    className={clsx(inputCls, 'min-w-0 flex-1 resize-none py-2')}
                  />
                  <button type="submit" disabled={!reply.trim() || sending} className={clsx(btnPrimary, 'min-h-[44px] shrink-0')}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                    Kirim
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-7.5rem)] items-center justify-center text-sm text-slate-500">
          Memuat Live Support...
        </div>
      }
    >
      <AdminSupportContent />
    </Suspense>
  );
}