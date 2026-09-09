'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { StatusBadge } from '@/components/status-badge';
import { Calendar } from 'lucide-react';

interface Booking {
  id: string;
  customer: { full_name: string };
  vehicle: { plate_number: string };
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  scheduled_at: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-bookings-search', search],
    queryFn: () =>
      fetcher<{ bookings: Booking[] }>(`/admin/bookings?search=${encodeURIComponent(search)}&limit=8`),
    enabled: open && search.length >= 1,
    staleTime: 10_000
  });

  const bookings = data?.bookings ?? [];

  function select(id: string) {
    onClose();
    router.push(`/admin/bookings?id=${id}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <CommandInput
        placeholder="Cari booking (nama pelanggan, plat nomor)…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {search ? 'Tidak ada booking ditemukan.' : 'Ketik untuk mencari…'}
        </CommandEmpty>
        {bookings.length > 0 && (
          <CommandGroup heading="Booking">
            {bookings.map((b) => (
              <CommandItem key={b.id} onSelect={() => select(b.id)} className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.customer.full_name}</p>
                  <p className="text-xs text-slate-500 font-data">{b.vehicle.plate_number}</p>
                </div>
                <StatusBadge status={b.status} size="sm" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
