'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

export const SUPPORT_UNREAD_KEY = ['admin-support-unread'] as const;

/**
 * Jumlah percakapan Live Support yang punya pesan pelanggan belum dibaca admin.
 * Dibaca langsung dari Supabase (RLS membolehkan admin membaca semua percakapan),
 * lalu dihitung ulang setiap ada perubahan realtime di tabel percakapan.
 */
export function useSupportUnread(enabled: boolean, { live = true }: { live?: boolean } = {}) {
  const qc = useQueryClient();

  const query = useQuery<number>({
    queryKey: SUPPORT_UNREAD_KEY,
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('id')
        .gt('unread_admin_count', 0)
        .neq('status', 'resolved')
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    }
  });

  useEffect(() => {
    // Hanya satu pemakai (AdminShell) yang berlangganan realtime; pemakai lain cukup berbagi query key.
    if (!enabled || !live) return;
    const channel = supabase
      .channel('admin-shell-support-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => {
        qc.invalidateQueries({ queryKey: SUPPORT_UNREAD_KEY });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, live, qc]);

  return query;
}
