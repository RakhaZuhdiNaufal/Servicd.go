'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/skeletons';
import { StatusBadge } from '@/components/status-badge';
import { toast } from 'sonner';
import { LayoutGrid, Table2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { clsx } from 'clsx';

type BookingStatus = 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';

interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  complaint_notes: string | null;
  estimated_cost: number;
  customer: { id: string; full_name: string; phone: string; email: string };
  vehicle: { plate_number: string; brand: string; model: string; vehicle_type: string };
  mechanic: { id: string; full_name: string } | null;
  booking_services: Array<{ service: { name: string; price: number } }>;
}

interface ListResponse {
  bookings: Booking[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

const KANBAN_COLS: { id: BookingStatus; label: string }[] = [
  { id: 'menunggu', label: 'Menunggu' },
  { id: 'diproses', label: 'Diproses' },
  { id: 'selesai', label: 'Selesai' }
];

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailId, setDetailId] = useState<string | null>(searchParams.get('id'));

  // Reset detailId from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setDetailId(id);
  }, [searchParams]);

  const qParams = new URLSearchParams({
    page: String(page),
    limit: '50',
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {})
  });

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['admin-bookings', page, statusFilter, startDate, endDate],
    queryFn: () => fetcher(`/admin/bookings?${qParams}`)
  });

  const detailBooking = data?.bookings.find((b) => b.id === detailId) ?? null;

  // Status update mutation (used by both table actions + kanban drag)
  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: BookingStatus; note?: string }) =>
      fetcher(`/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
      }),
    onSuccess: () => {
      toast.success('Status booking diperbarui');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // Assign mechanic (gap: no mechanic list endpoint — use text input)
  const [mechanicInput, setMechanicInput] = useState('');
  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }: { id: string; mechanic_id: string }) =>
      fetcher(`/admin/bookings/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ mechanic_id })
      }),
    onSuccess: () => {
      toast.success('Mekanik di-assign');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setMechanicInput('');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // Kanban drag-drop — optimistic update
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as BookingStatus;
    const bookingId = result.draggableId;
    const booking = data?.bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status === newStatus) return;
    statusMutation.mutate({ id: bookingId, status: newStatus });
  }

  const bookings = data?.bookings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Booking</h1>
        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
          <button
            onClick={() => setView('table')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition',
              view === 'table'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Table2 className="h-4 w-4" />
            Tabel
          </button>
          <button
            onClick={() => setView('kanban')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition',
              view === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="menunggu">Menunggu</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
        <span className="text-slate-400 text-sm">–</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
        {(statusFilter || startDate || endDate) && (
          <button
            onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <>
          {isLoading ? (
            <SkeletonTable rows={10} cols={6} />
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {['Pelanggan', 'Kendaraan', 'Jadwal', 'Layanan', 'Status', 'Aksi'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setDetailId(b.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{b.customer.full_name}</p>
                        <p className="text-xs text-slate-500">{b.customer.phone}</p>
                      </td>
                      <td className="px-4 py-3 font-data text-sm font-semibold">{b.vehicle.plate_number}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[160px]">
                        <p className="truncate">{b.booking_services.map((s) => s.service.name).join(', ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-primary-600 text-xs font-medium">Detail →</span>
                      </td>
                    </tr>
                  ))}
                  {!bookings.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Tidak ada booking ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data && data.meta.total_pages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{data.meta.total} booking</span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 py-1">{page} / {data.meta.total_pages}</span>
                <button disabled={page === data.meta.total_pages} onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-4 min-h-[400px]">
            {KANBAN_COLS.map((col) => {
              const colBookings = bookings.filter((b) => b.status === col.id);
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx(
                        'rounded-lg border p-3 space-y-2 min-h-[200px] transition-colors',
                        snapshot.isDraggingOver
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-950'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={col.id} size="sm" />
                        <span className="text-xs font-mono text-slate-500">{colBookings.length}</span>
                      </div>
                      {colBookings.map((b, index) => (
                        <Draggable key={b.id} draggableId={b.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setDetailId(b.id)}
                              className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1"
                            >
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {b.customer.full_name}
                              </p>
                              <p className="text-xs font-data text-slate-600 dark:text-slate-400">
                                {b.vehicle.plate_number}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ── DETAIL SHEET ── */}
      <Sheet open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailBooking ? (
            <>
              <SheetHeader>
                <SheetTitle>Detail Booking</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">{detailBooking.customer.full_name}</p>
                    <p className="text-slate-500 font-data">{detailBooking.customer.phone}</p>
                    <p className="text-slate-500">{detailBooking.customer.email}</p>
                  </div>
                  <StatusBadge status={detailBooking.status} />
                </div>

                <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Kendaraan</p>
                  <p className="font-data font-bold text-lg">{detailBooking.vehicle.plate_number}</p>
                  <p className="text-slate-500">{detailBooking.vehicle.brand} {detailBooking.vehicle.model} · {detailBooking.vehicle.vehicle_type}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Layanan</p>
                  {detailBooking.booking_services.map(({ service }, i) => (
                    <div key={i} className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{service.name}</span>
                      <span className="font-data">{formatRp(service.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                    <span>Estimasi Total</span>
                    <span className="font-data">{formatRp(detailBooking.estimated_cost)}</span>
                  </div>
                </div>

                {detailBooking.complaint_notes && (
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Catatan Keluhan</p>
                    <p className="text-slate-600 dark:text-slate-400">{detailBooking.complaint_notes}</p>
                  </div>
                )}

                {/* Status update */}
                <div className="space-y-2">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Ubah Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['menunggu', 'diproses', 'selesai', 'dibatalkan'] as BookingStatus[]).map((s) => (
                      <button
                        key={s}
                        disabled={detailBooking.status === s || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: detailBooking.id, status: s })}
                        className={clsx(
                          'rounded-md border px-3 py-2 text-xs font-medium transition disabled:opacity-40',
                          detailBooking.status === s
                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assign mechanic — gap notice */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Assign Mekanik
                    {detailBooking.mechanic && (
                      <span className="ml-2 text-xs text-slate-500 font-normal">
                        (saat ini: {detailBooking.mechanic.full_name})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ Endpoint daftar mekanik belum tersedia — masukkan UUID mekanik secara manual.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={mechanicInput}
                      onChange={(e) => setMechanicInput(e.target.value)}
                      placeholder="UUID mekanik…"
                      className="flex-1 rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-data focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      disabled={!mechanicInput || assignMutation.isPending}
                      onClick={() => assignMutation.mutate({ id: detailBooking.id, mechanic_id: mechanicInput })}
                      className="rounded-md bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 text-xs font-medium transition disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400">
              Pilih booking untuk melihat detail
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
