'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { CornerDownLeft, Loader2, Search } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { bookingCode } from '@/lib/format';
import { StatusBadge } from '@/components/status-badge';
import { Plate } from '@/components/customer/plate';
import { ADMIN_NAV } from '@/components/admin/nav';

interface Booking {
  id: string;
  customer: { full_name: string };
  vehicle: { plate_number: string; brand?: string; model?: string };
  status: 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';
  scheduled_at: string;
}

const itemCls =
  'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-chip px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-900 dark:text-slate-200 dark:data-[selected=true]:bg-primary-900/40 dark:data-[selected=true]:text-white';
const groupCls =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[13px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-600 dark:[&_[cmdk-group-heading]]:text-slate-400';

/**
 * Pencarian Ctrl+K: lompat ke halaman admin, atau cari booking lewat
 * GET /admin/bookings?search= (nama pelanggan atau plat nomor).
 * Memakai <dialog> native, jadi Escape menutup dan fokus terkunci di dalam.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal memfokuskan elemen pertama (root cmdk); arahkan ke kolom cari
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!open && d.open) d.close();
    if (!open) {
      setSearch('');
      setDebounced('');
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-bookings-search', debounced],
    queryFn: () =>
      fetcher<{ bookings: Booking[] }>(`/admin/bookings?search=${encodeURIComponent(debounced)}&limit=8`),
    enabled: open && debounced.length >= 2,
    staleTime: 10_000
  });

  const bookings = debounced.length >= 2 ? data?.bookings ?? [] : [];
  const q = search.trim().toLowerCase();
  const pages = ADMIN_NAV.filter((n) => !q || n.label.toLowerCase().includes(q));

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Cari booking atau halaman"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      {open && (
        <Command shouldFilter={false} loop label="Cari booking atau halaman" className="flex max-h-[70vh] flex-col">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 px-4 focus-within:border-primary-600 dark:border-slate-700 dark:focus-within:border-primary-500">
            <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            <Command.Input
              ref={inputRef}
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Nama pelanggan, plat nomor, atau nama halaman"
              className="h-14 w-full min-w-0 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-white dark:placeholder:text-slate-400"
            />
            {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" aria-label="Mencari" />}
            <kbd className="hidden shrink-0 rounded-plate border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:inline">
              Esc
            </kbd>
          </div>

          <Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
            {debounced.length >= 2 && (
              <Command.Group heading="Booking" className={groupCls}>
                {isError && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
                    Pencarian booking gagal.
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="min-h-[36px] rounded-chip px-2 font-semibold underline-offset-2 hover:underline"
                    >
                      Coba lagi
                    </button>
                  </div>
                )}
                {!isError && !isFetching && bookings.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                    Tidak ada booking atas nama atau plat &quot;{debounced}&quot;.
                  </p>
                )}
                {bookings.map((b) => (
                  <Command.Item
                    key={b.id}
                    value={`booking-${b.id}`}
                    onSelect={() =>
                      go(`/admin/bookings?search=${encodeURIComponent(b.vehicle.plate_number)}&id=${b.id}`)
                    }
                    className={itemCls}
                  >
                    <Plate number={b.vehicle.plate_number} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.customer.full_name}</p>
                      <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                        <span className="font-mono">{bookingCode(b.id)}</span>
                        {b.vehicle.brand ? ` · ${b.vehicle.brand} ${b.vehicle.model ?? ''}` : ''}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex">
                      <StatusBadge status={b.status} size="sm" />
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {pages.length > 0 && (
              <Command.Group heading="Halaman" className={groupCls}>
                {pages.map(({ href, label, icon: Icon }) => (
                  <Command.Item key={href} value={`page-${href}`} onSelect={() => go(href)} className={itemCls}>
                    <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                    <span className="flex-1">{label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {debounced.length < 2 && pages.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Ketik minimal 2 huruf untuk mencari booking.
              </p>
            )}
          </Command.List>

          <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2.5 text-[12px] text-slate-600 dark:border-slate-700 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /> buka
            </span>
            <span>Panah atas/bawah untuk memilih</span>
          </div>
        </Command>
      )}
    </dialog>
  );
}
