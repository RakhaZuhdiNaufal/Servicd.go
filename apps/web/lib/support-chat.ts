'use client';

// Live CS (PLAN.md #2). Klien membaca/menulis langsung ke Supabase; keamanan dijaga RLS
// di supabase/support_chat.sql (pelanggan hanya bisa akses percakapan miliknya, admin semua).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export type SupportStatus = 'active' | 'resolved' | 'closed';
export type SenderType = 'customer' | 'admin' | 'bot';

export interface SupportConversation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: SupportStatus;
  last_message: string | null;
  last_message_at: string;
  unread_admin_count: number;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const MAX_MESSAGE_LENGTH = 2000;

/** Tambah/ganti pesan berdasarkan id, tetap urut waktu. Dipakai untuk hasil insert + event realtime. */
export function upsertMessage(list: SupportMessage[], msg: SupportMessage): SupportMessage[] {
  const idx = list.findIndex((m) => m.id === msg.id);
  const next = idx >= 0 ? list.map((m, i) => (i === idx ? msg : m)) : [...list, msg];
  return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Pesan error Supabase/Postgres yang ramah untuk pengguna. */
export function friendlySupportError(err: unknown): string {
  const raw = (err as { message?: string; code?: string })?.message ?? '';
  const code = (err as { code?: string })?.code ?? '';
  if (code === '42P01' || /relation .* does not exist/i.test(raw)) {
    return 'Fitur chat CS belum diaktifkan di server (tabel support belum dibuat).';
  }
  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'Kamu tidak punya akses ke percakapan ini.';
  }
  if (/fetch|network/i.test(raw)) return 'Tidak bisa terhubung ke server. Cek koneksi internet kamu.';
  return raw || 'Terjadi kesalahan. Coba lagi.';
}

/**
 * Chat CS untuk pelanggan yang sudah login. Satu pelanggan memakai satu percakapan
 * (yang terbaru); percakapan baru dibuat otomatis saat pesan pertama dikirim.
 */
export function useCustomerSupportChat(userId: string | null) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: conv, error: convErr } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('customer_id', userId)
        .neq('status', 'closed')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (convErr) throw convErr;
      setConversation(conv as SupportConversation | null);

      if (conv) {
        const { data: msgs, error: msgErr } = await supabase
          .from('support_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })
          .limit(500);
        if (msgErr) throw msgErr;
        setMessages((msgs ?? []) as SupportMessage[]);
      } else {
        setMessages([]);
      }
    } catch (e) {
      setError(friendlySupportError(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    load();
  }, [userId, load]);

  // Realtime: pesan baru (dari admin atau dari tab lain) langsung masuk.
  const conversationId = conversation?.id;
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support-room:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => upsertMessage(prev, payload.new as SupportMessage))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_conversations', filter: `id=eq.${conversationId}` },
        (payload) => setConversation(payload.new as SupportConversation)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const body = text.trim();
      if (!userId || !body) return false;
      if (body.length > MAX_MESSAGE_LENGTH) {
        setError(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
        return false;
      }
      setSending(true);
      setError(null);
      try {
        let conv = conversation;
        if (!conv) {
          const { data, error: insErr } = await supabase
            .from('support_conversations')
            .insert({ customer_id: userId })
            .select('*')
            .single();
          if (insErr) throw insErr;
          conv = data as SupportConversation;
          setConversation(conv);
        }
        const { data: msg, error: msgErr } = await supabase
          .from('support_messages')
          .insert({ conversation_id: conv.id, sender_type: 'customer', sender_id: userId, message: body })
          .select('*')
          .single();
        if (msgErr) throw msgErr;
        setMessages((prev) => upsertMessage(prev, msg as SupportMessage));
        return true;
      } catch (e) {
        setError(friendlySupportError(e));
        return false;
      } finally {
        setSending(false);
      }
    },
    [userId, conversation]
  );

  const unreadFromAdmin = useMemo(
    () => messages.filter((m) => m.sender_type === 'admin' && !m.is_read).length,
    [messages]
  );

  const markRead = useCallback(async () => {
    if (!conversationId || unreadFromAdmin === 0) return;
    const { error: rpcErr } = await supabase.rpc('support_mark_read', { p_conversation_id: conversationId });
    if (!rpcErr) {
      setMessages((prev) => prev.map((m) => (m.sender_type === 'admin' ? { ...m, is_read: true } : m)));
    }
  }, [conversationId, unreadFromAdmin]);

  return { conversation, messages, loading, error, sending, send, reload: load, unreadFromAdmin, markRead };
}

export type CustomerSupportChat = ReturnType<typeof useCustomerSupportChat>;
