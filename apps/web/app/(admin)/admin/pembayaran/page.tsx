'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Banknote, CheckCircle2, Clock, Plus, Receipt, Trash2, XCircle } from 'lucide-react';
import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  type PaymentMethodValue
} from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { bookingCode, formatRp } from '@/lib/format';
import { todayWIB } from '@/lib/wib';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { Plate } from '@/components/customer/plate';
import { adminSchedule } from '@/components/admin/format';
import { DailyRevenueChart } from '@/components/admin/charts';
import {
  AdminDialog,
  AdminPageHeader,
  Field,
  Pagination,
  SearchInput,
  Segmented,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnDanger,
  btnPrimary,
  btnRow,
  btnRowDanger,
  btnSecondary,
  inputCls,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

type PaymentStatus = 'pending' | 'paid' | 'failed';
type PaymentType = 'dp' | 'pelunasan';

interface Payment {
  id: string;
  amount: number | string;
  payment_type: PaymentType;
  method: PaymentMethodValue;
  status: PaymentStatus;
  midtrans_ref: string | null;
  note: string | null;
  paid_at: string | null;
  created_at: string;
  booking: {
    id: string;
    status: string;
    scheduled_at: string;
    estimated_cost: number | string;
    final_cost: number | string | null;
    customer: { id: string; full_name: string; phone: string };
    vehicle: { plate_number: string; brand: string; model: string };
  };
  recorder: { id: string; full_name: string } | null;
}

interface ListResponse {
  payments: Payment[];
  summary: {
    paid: number;
    pending: number;
    failed: number;
    paid_count: number;
    pending_count: number;
    failed_count: number;
  };
  daily: Array<{ day: string; amount: number }>;
  meta: { total: number; page: number; limit: number; total_pages: number };
}

interface BookingOption {
  id: string;
  status: string;
  scheduled_at: string;
  estimated_cost: number | string;
  final_cost?: number | string | null;
  customer: { full_name: string };
  vehicle: { plate_number: string; brand: string; model: string };
}

const STATUS_FILTERS: Array<{ value: '' | PaymentStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'paid', label: 'Lunas' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'failed', label: 'Gagal' }
];

const PAGE_SIZE = 20;

function num(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        status === 'paid' &&
          'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
        status === 'pending' &&
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
        status === 'failed' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
      )}
    >
      {status === 'paid' ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : status === 'pending' ? (
        <Clock className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

function PembayaranContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | PaymentStatus>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  // Tombol "Catat pembayaran" dari halaman booking mengirim ?booking_id=
  const presetBookingId = searchParams.get('booking_id');
  useEffect(() => {
    if (presetBookingId) setFormOpen(true);
  }, [presetBookingId]);

  useEffect(() => {
    const t = setTimeout(() => {
      const v = searchInput.trim();
      if (v !== search) {
        setSearch(v);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {})
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ['admin-payments', page, status, search, startDate, endDate],
    queryFn: () => fetcher(`/admin/payments?${params}`)
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-payments'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      fetcher(`/admin/payments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: (_d, v) => {
      toast.success(
        v.status === 'paid' ? 'Pembayaran ditandai lunas' : v.status === 'failed' ? 'Pembayaran ditandai gagal' : 'Status diperbarui'
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Catatan pembayaran dihapus');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const payments = data?.payments ?? [];
  const hasFilter = !!(status || search || startDate || endDate);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Pemasukan & pembayaran"
        description="Catat DP dan pelunasan dari pelanggan, lalu pantau uang yang benar-benar masuk."
        action={
          <button type="button" onClick={() => setFormOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden />
            Catat pembayaran
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          tone="green"
          icon={Banknote}
          label="Uang masuk (lunas)"
          value={formatRp(data?.summary.paid ?? 0)}
          note={`${data?.summary.paid_count ?? 0} transaksi`}
        />
        <SummaryCard
          tone="amber"
          icon={Clock}
          label="Menunggu pembayaran"
          value={formatRp(data?.summary.pending ?? 0)}
          note={`${data?.summary.pending_count ?? 0} transaksi`}
        />
        <SummaryCard
          tone="red"
          icon={XCircle}
          label="Gagal / batal"
          value={formatRp(data?.summary.failed ?? 0)}
          note={`${data?.summary.failed_count ?? 0} transaksi`}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-2 dark:border-slate-800">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Pemasukan harian</h2>
          <span className="text-[13px] text-slate-600 dark:text-slate-400" aria-live="polite">
            {isFetching ? 'Memperbarui...' : hasFilter ? 'Mengikuti filter di bawah' : '30 hari terakhir tercatat'}
          </span>
        </div>
        <div className="p-5">
          <DailyRevenueChart rows={data?.daily ?? []} />
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput
          id="cari-pembayaran"
          label="Cari pembayaran"
          placeholder="Nama pelanggan atau plat nomor"
          value={searchInput}
          onChange={setSearchInput}
        />
        <Segmented
          label="Filter status pembayaran"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_FILTERS}
        />
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="bayar-dari" className="mb-1 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Dari
            </label>
            <input
              id="bayar-dari"
              type="date"
              value={startDate}
              max={endDate || todayWIB()}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={clsx(inputCls, 'w-[150px]')}
            />
          </div>
          <div>
            <label htmlFor="bayar-sampai" className="mb-1 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Sampai
            </label>
            <input
              id="bayar-sampai"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={clsx(inputCls, 'w-[150px]')}
            />
          </div>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setStatus('');
                setSearchInput('');
                setSearch('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className={btnSecondary}
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {isLoading && <TableSkeleton rows={6} cols={6} />}

      {isError && (
        <ErrorState
          title="Data pembayaran belum bisa dimuat"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {data && payments.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={hasFilter ? 'Tidak ada pembayaran yang cocok' : 'Belum ada pembayaran tercatat'}
          description={
            hasFilter
              ? 'Coba ubah rentang tanggal atau filter statusnya.'
              : 'Catat DP atau pelunasan dari pelanggan lewat tombol "Catat pembayaran".'
          }
        />
      )}

      {data && payments.length > 0 && (
        <TableCard
          footer={
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.total_pages}
              total={data.meta.total}
              unit="pembayaran"
              onChange={setPage}
            />
          }
        >
          <table className="w-full min-w-[920px] text-sm">
            <thead className={theadCls}>
              <tr>
                <Th>Waktu</Th>
                <Th>Booking</Th>
                <Th>Jenis</Th>
                <Th align="right">Jumlah</Th>
                <Th>Status</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <p className="whitespace-nowrap text-slate-900 dark:text-white">
                      {adminSchedule(p.paid_at ?? p.created_at)}
                    </p>
                    <p className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-400">
                      {PAYMENT_METHOD_LABEL[p.method]}
                      {p.recorder ? ` · ${p.recorder.full_name}` : ''}
                    </p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Plate number={p.booking.vehicle.plate_number} size="sm" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {p.booking.customer.full_name}
                        </p>
                        <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                          <span className="font-mono">{bookingCode(p.booking.id)}</span> · tagihan{' '}
                          {formatRp(num(p.booking.final_cost ?? p.booking.estimated_cost))}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-slate-800 dark:text-slate-200">
                      {PAYMENT_TYPE_LABEL[p.payment_type]}
                    </span>
                    {p.midtrans_ref && (
                      <p className="truncate font-mono text-[12px] text-slate-500 dark:text-slate-400">{p.midtrans_ref}</p>
                    )}
                  </Td>
                  <Td align="right">
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatRp(num(p.amount))}
                    </span>
                  </Td>
                  <Td>
                    <PaymentStatusBadge status={p.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {p.status !== 'paid' && (
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: p.id, status: 'paid' })}
                          className={btnRow}
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          Tandai lunas
                        </button>
                      )}
                      {p.status !== 'failed' && (
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: p.id, status: 'failed' })}
                          className={btnRow}
                        >
                          <XCircle className="h-4 w-4" aria-hidden />
                          Tandai gagal
                        </button>
                      )}
                      {p.status !== 'paid' && (
                        <button type="button" onClick={() => setDeleteTarget(p)} className={btnRowDanger}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Hapus
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      <PaymentFormDialog
        open={formOpen}
        presetBookingId={presetBookingId}
        onClose={() => setFormOpen(false)}
        onSaved={invalidate}
      />

      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Hapus catatan pembayaran"
        description={
          deleteTarget
            ? `${formatRp(num(deleteTarget.amount))} dari ${deleteTarget.booking.customer.full_name} akan dihapus.`
            : ''
        }
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Batal
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className={btnDanger}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, hapus'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Hanya pembayaran yang belum lunas yang bisa dihapus. Transaksi lunas cukup ditandai gagal bila batal.
        </p>
      </AdminDialog>
    </div>
  );
}

const TONE: Record<string, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
};

function SummaryCard({
  tone,
  icon: Icon,
  label,
  value,
  note
}: {
  tone: keyof typeof TONE;
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <span className={clsx('flex h-10 w-10 items-center justify-center rounded-ctl', TONE[tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">{note}</p>
    </div>
  );
}

// ── Dialog catat pembayaran ──────────────────────────────────────────

function PaymentFormDialog({
  open,
  presetBookingId,
  onClose,
  onSaved
}: {
  open: boolean;
  presetBookingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bookingSearch, setBookingSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<PaymentType>('pelunasan');
  const [method, setMethod] = useState<PaymentMethodValue>('tunai');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setBookingSearch('');
    setDebounced('');
    setBookingId(presetBookingId ?? '');
    setAmount('');
    setType('pelunasan');
    setMethod('tunai');
    setStatus('paid');
    setRef('');
    setNote('');
  }, [open, presetBookingId]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(bookingSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [bookingSearch]);

  const searchQuery = useQuery<{ bookings: BookingOption[] }>({
    queryKey: ['admin-bookings-pay-search', debounced],
    queryFn: () => fetcher(`/admin/bookings?search=${encodeURIComponent(debounced)}&limit=8`),
    enabled: open && debounced.length >= 2
  });

  // Booking terpilih: diambil langsung supaya tetap tampil walau tidak ada di hasil pencarian.
  const selectedQuery = useQuery<BookingOption>({
    queryKey: ['admin-booking', bookingId],
    queryFn: () => fetcher(`/admin/bookings/${bookingId}`),
    enabled: open && !!bookingId
  });

  // Pembayaran yang sudah tercatat untuk booking ini, untuk menghitung sisa tagihan.
  const paidQuery = useQuery<ListResponse>({
    queryKey: ['admin-payments', 'by-booking', bookingId],
    queryFn: () => fetcher(`/admin/payments?booking_id=${bookingId}&limit=100`),
    enabled: open && !!bookingId
  });

  const selected = selectedQuery.data ?? null;
  const billed = selected ? num(selected.final_cost ?? selected.estimated_cost) : 0;
  const alreadyPaid = useMemo(
    () =>
      (paidQuery.data?.payments ?? [])
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + num(p.amount), 0),
    [paidQuery.data]
  );
  const outstanding = Math.max(0, billed - alreadyPaid);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetcher('/admin/payments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Pembayaran berhasil dicatat');
      onSaved();
      onClose();
    },
    onError: (e: Error) => setFormError(e.message)
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!bookingId) return setFormError('Pilih booking yang dibayar dulu.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setFormError('Jumlah pembayaran harus lebih dari 0.');

    saveMutation.mutate({
      booking_id: bookingId,
      amount: value,
      payment_type: type,
      method,
      status,
      midtrans_ref: ref.trim() || null,
      note: note.trim() || null
    });
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Catat pembayaran"
      description="Cari booking pelanggan, lalu isi jumlah yang diterima di kasir."
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="submit" form="form-bayar" disabled={saveMutation.isPending} className={btnPrimary}>
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan pembayaran'}
          </button>
        </>
      }
    >
      <form id="form-bayar" onSubmit={submit} className="space-y-4" noValidate>
        {!bookingId ? (
          <Field id="bayar-booking" label="Booking" required hint="Ketik minimal 2 huruf nama pelanggan atau plat nomor.">
            <input
              id="bayar-booking"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              className={inputCls}
              placeholder="Budi atau B 1234 GO"
            />
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {searchQuery.isFetching && <p className="px-1 text-sm text-slate-600 dark:text-slate-400">Mencari...</p>}
              {debounced.length >= 2 && !searchQuery.isFetching && (searchQuery.data?.bookings ?? []).length === 0 && (
                <p className="px-1 text-sm text-slate-600 dark:text-slate-400">Tidak ada booking yang cocok.</p>
              )}
              {(searchQuery.data?.bookings ?? []).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBookingId(b.id);
                    setAmount(String(num(b.final_cost ?? b.estimated_cost)));
                  }}
                  className="flex w-full items-center gap-2 rounded-chip px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Plate number={b.vehicle.plate_number} size="sm" className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {b.customer.full_name}
                    </span>
                    <span className="block truncate text-[13px] text-slate-600 dark:text-slate-400">
                      <span className="font-mono">{bookingCode(b.id)}</span> · {adminSchedule(b.scheduled_at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRp(num(b.final_cost ?? b.estimated_cost))}
                  </span>
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <div className="rounded-ctl border border-slate-200 p-3 dark:border-slate-800">
            {selectedQuery.isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Memuat booking...</p>}
            {selected && (
              <>
                <div className="flex items-center gap-2">
                  <Plate number={selected.vehicle.plate_number} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {selected.customer.full_name}
                    </p>
                    <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                      <span className="font-mono">{bookingCode(selected.id)}</span> · {adminSchedule(selected.scheduled_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingId('');
                      setAmount('');
                    }}
                    className={btnRow}
                  >
                    Ganti
                  </button>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-[13px] dark:border-slate-800">
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Tagihan</dt>
                    <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatRp(billed)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Sudah dibayar</dt>
                    <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatRp(alreadyPaid)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Sisa</dt>
                    <dd
                      className={clsx(
                        'font-semibold tabular-nums',
                        outstanding > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'
                      )}
                    >
                      {formatRp(outstanding)}
                    </dd>
                  </div>
                </dl>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(outstanding))}
                    className="mt-2 text-[13px] font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-100"
                  >
                    Isi jumlah dengan sisa tagihan
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bayar-jumlah" label="Jumlah diterima" required>
            <input
              id="bayar-jumlah"
              type="number"
              min={0}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              placeholder="250000"
            />
          </Field>
          <Field id="bayar-jenis" label="Jenis pembayaran" required>
            <select id="bayar-jenis" value={type} onChange={(e) => setType(e.target.value as PaymentType)} className={inputCls}>
              <option value="dp">{PAYMENT_TYPE_LABEL.dp}</option>
              <option value="pelunasan">{PAYMENT_TYPE_LABEL.pelunasan}</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bayar-metode" label="Cara bayar" required>
            <select
              id="bayar-metode"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodValue)}
              className={inputCls}
            >
              {PAYMENT_METHOD.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="bayar-status" label="Status" required>
            <select
              id="bayar-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className={inputCls}
            >
              <option value="paid">{PAYMENT_STATUS_LABEL.paid}</option>
              <option value="pending">{PAYMENT_STATUS_LABEL.pending}</option>
            </select>
          </Field>
        </div>

        <Field id="bayar-ref" label="Nomor referensi" hint="Opsional: nomor transfer, struk EDC, atau kode QRIS.">
          <input id="bayar-ref" value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
        </Field>

        <Field id="bayar-catatan" label="Catatan">
          <input
            id="bayar-catatan"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            placeholder="Dibayar di kasir oleh pemilik kendaraan"
          />
        </Field>

        {formError && (
          <p
            role="alert"
            className="rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {formError}
          </p>
        )}
      </form>
    </AdminDialog>
  );
}

export default function PembayaranPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={6} />}>
      <PembayaranContent />
    </Suspense>
  );
}
