'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Copy, Pencil, Plus, Power, Tag, Ticket, Trash2, Users } from 'lucide-react';
import { promoSummary, type PromoDTO } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { formatRp } from '@/lib/format';
import { todayWIB } from '@/lib/wib';
import { EmptyState, ErrorState } from '@/components/customer/states';
import { adminDate } from '@/components/admin/format';
import {
  AdminDialog,
  AdminPageHeader,
  Field,
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

type PromoState = 'aktif' | 'terjadwal' | 'habis' | 'kedaluwarsa' | 'nonaktif';

interface AdminPromo extends PromoDTO {
  redemption_count: number;
  state: PromoState;
}

interface ListResponse {
  promos: AdminPromo[];
  meta: { total: number; active: number; total_redeemed: number };
}

interface Redemption {
  id: string;
  discount_amount: number;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  booking: { id: string; scheduled_at: string; status: string } | null;
}

const STATE_FILTERS: Array<{ value: '' | PromoState; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'terjadwal', label: 'Terjadwal' },
  { value: 'habis', label: 'Kuota habis' },
  { value: 'kedaluwarsa', label: 'Kedaluwarsa' },
  { value: 'nonaktif', label: 'Nonaktif' }
];

const STATE_STYLE: Record<PromoState, string> = {
  aktif: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  terjadwal: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300',
  habis: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
  kedaluwarsa: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  nonaktif: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

const STATE_LABEL: Record<PromoState, string> = {
  aktif: 'Aktif',
  terjadwal: 'Belum mulai',
  habis: 'Kuota habis',
  kedaluwarsa: 'Kedaluwarsa',
  nonaktif: 'Nonaktif'
};

/** ISO dari server -> "2026-12-31" untuk input type=date (kalender WIB). */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(iso));
}

export default function VoucherPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'' | PromoState>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminPromo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromo | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminPromo | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch } = useQuery<ListResponse>({
    queryKey: ['admin-promos', search, state],
    queryFn: () =>
      fetcher(`/admin/promos?${new URLSearchParams({ ...(search ? { search } : {}), ...(state ? { status: state } : {}) })}`)
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-promos'] });
    qc.invalidateQueries({ queryKey: ['promos'] });
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetcher(`/admin/promos/${id}`, { method: 'PUT', body: JSON.stringify({ is_active }) }),
    onSuccess: (_d, v) => {
      toast.success(v.is_active ? 'Voucher diaktifkan' : 'Voucher dinonaktifkan');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/promos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Voucher dihapus atau dinonaktifkan');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const promos = data?.promos ?? [];

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Kode ${code} disalin`);
    } catch {
      toast.error('Browser menolak akses clipboard. Salin manual ya.');
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Voucher & kode promo"
        description="Kode diskon yang bisa dipakai pelanggan saat booking. Kuota dan masa berlaku dicek otomatis oleh sistem."
        action={
          <button
            type="button"
            onClick={() => {
              setEditTarget(null);
              setFormOpen(true);
            }}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Buat voucher
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Ticket} label="Total voucher" value={String(data?.meta.total ?? 0)} />
        <StatCard icon={Tag} label="Sedang aktif" value={String(data?.meta.active ?? 0)} />
        <StatCard icon={Users} label="Total dipakai pelanggan" value={String(data?.meta.total_redeemed ?? 0)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          id="cari-voucher"
          label="Cari voucher"
          placeholder="Kode atau judul voucher"
          value={searchInput}
          onChange={setSearchInput}
        />
        <Segmented label="Filter status voucher" value={state} onChange={setState} options={STATE_FILTERS} />
      </div>

      {isLoading && <TableSkeleton rows={5} cols={6} />}

      {isError && (
        <ErrorState title="Data voucher belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      )}

      {data && promos.length === 0 && (
        <EmptyState
          icon={Ticket}
          title={search || state ? 'Tidak ada voucher yang cocok' : 'Belum ada voucher'}
          description={
            search || state
              ? 'Coba ubah kata kunci atau filter statusnya.'
              : 'Buat kode diskon pertama supaya pelanggan bisa memakainya saat booking.'
          }
        />
      )}

      {data && promos.length > 0 && (
        <TableCard>
          <table className="w-full min-w-[900px] text-sm">
            <thead className={theadCls}>
              <tr>
                <Th>Kode</Th>
                <Th>Potongan</Th>
                <Th>Masa berlaku</Th>
                <Th align="right">Pemakaian</Th>
                <Th>Status</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {promos.map((p) => {
                const quotaLeft = p.quota != null ? Math.max(0, p.quota - p.used_count) : null;
                return (
                  <tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="rounded-plate bg-slate-900 px-2 py-1 font-mono text-[13px] font-semibold tracking-wide text-white dark:bg-slate-800">
                          {p.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(p.code)}
                          aria-label={`Salin kode ${p.code}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-chip text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                      <p className="mt-1 max-w-[240px] truncate text-[13px] text-slate-600 dark:text-slate-400">{p.title}</p>
                    </Td>
                    <Td>
                      <p className="whitespace-nowrap font-medium text-slate-900 dark:text-white">{promoSummary(p)}</p>
                      {p.min_spend != null && (
                        <p className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-400">
                          min. belanja {formatRp(p.min_spend)}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <p className="whitespace-nowrap text-slate-800 dark:text-slate-200">
                        {p.valid_from ? adminDate(p.valid_from) : 'Mulai kapan saja'}
                      </p>
                      <p className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-400">
                        {p.valid_until ? `s.d. ${adminDate(p.valid_until)}` : 'tanpa batas waktu'}
                      </p>
                    </Td>
                    <Td align="right">
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{p.used_count}</span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        {p.quota != null ? ` / ${p.quota}` : 'x'}
                      </span>
                      {quotaLeft !== null && (
                        <p className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">sisa {quotaLeft}</p>
                      )}
                      {p.per_customer_limit != null && (
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">maks {p.per_customer_limit}x/pelanggan</p>
                      )}
                    </Td>
                    <Td>
                      <span
                        className={clsx(
                          'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
                          STATE_STYLE[p.state]
                        )}
                      >
                        {STATE_LABEL[p.state]}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setDetailTarget(p)} className={btnRow}>
                          <Users className="h-4 w-4" aria-hidden />
                          Pemakaian
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTarget(p);
                            setFormOpen(true);
                          }}
                          className={btnRow}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ id: p.id, is_active: !p.is_active })}
                          className={btnRow}
                        >
                          <Power className="h-4 w-4" aria-hidden />
                          {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(p)} className={btnRowDanger}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Hapus
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      <PromoFormDialog
        open={formOpen}
        promo={editTarget}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSaved={invalidate}
      />

      <RedemptionDialog promo={detailTarget} onClose={() => setDetailTarget(null)} />

      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Hapus voucher"
        description={
          deleteTarget
            ? deleteTarget.used_count > 0
              ? `${deleteTarget.code} sudah dipakai ${deleteTarget.used_count}x, jadi hanya akan dinonaktifkan.`
              : `${deleteTarget.code} akan dihapus permanen.`
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
              {deleteMutation.isPending ? 'Memproses...' : 'Ya, lanjutkan'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Riwayat diskon pada booking lama tidak ikut berubah.
        </p>
      </AdminDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-slate-600 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Dialog buat/ubah voucher ─────────────────────────────────────────

function PromoFormDialog({
  open,
  promo,
  onClose,
  onSaved
}: {
  open: boolean;
  promo: AdminPromo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [type, setType] = useState<'persen' | 'nominal'>('persen');
  const [value, setValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [quota, setQuota] = useState('');
  const [perCustomer, setPerCustomer] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setCode(promo?.code ?? '');
    setTitle(promo?.title ?? '');
    setDescription(promo?.description ?? '');
    setBadge(promo?.badge ?? '');
    setType(promo?.discount_type ?? 'persen');
    setValue(promo ? String(promo.discount_value) : '');
    setMaxDiscount(promo?.max_discount != null ? String(promo.max_discount) : '');
    setMinSpend(promo?.min_spend != null ? String(promo.min_spend) : '');
    setQuota(promo?.quota != null ? String(promo.quota) : '');
    setPerCustomer(promo?.per_customer_limit != null ? String(promo.per_customer_limit) : '');
    setValidFrom(toDateInput(promo?.valid_from ?? null));
    setValidUntil(toDateInput(promo?.valid_until ?? null));
    setIsActive(promo?.is_active ?? true);
  }, [open, promo]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      promo
        ? fetcher(`/admin/promos/${promo.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : fetcher('/admin/promos', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(promo ? 'Voucher diperbarui' : 'Voucher baru dibuat');
      onSaved();
      onClose();
    },
    onError: (e: Error) => setFormError(e.message)
  });

  function optionalNumber(v: string): number | null {
    return v.trim() === '' ? null : Number(v);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amount = Number(value);
    if (!code.trim()) return setFormError('Kode voucher wajib diisi.');
    if (!title.trim()) return setFormError('Judul voucher wajib diisi.');
    if (!Number.isFinite(amount) || amount <= 0) return setFormError('Besar potongan harus lebih dari 0.');
    if (type === 'persen' && amount > 100) return setFormError('Diskon persen tidak boleh lebih dari 100%.');
    if (validFrom && validUntil && validFrom > validUntil) {
      return setFormError('Tanggal mulai tidak boleh setelah tanggal berakhir.');
    }

    saveMutation.mutate({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || null,
      badge: badge.trim() || null,
      discount_type: type,
      discount_value: amount,
      max_discount: type === 'persen' ? optionalNumber(maxDiscount) : null,
      min_spend: optionalNumber(minSpend),
      quota: optionalNumber(quota),
      per_customer_limit: optionalNumber(perCustomer),
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      is_active: isActive
    });
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={promo ? `Ubah voucher ${promo.code}` : 'Buat voucher baru'}
      description="Pelanggan memasukkan kode ini di langkah ringkasan saat booking."
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="submit" form="form-voucher" disabled={saveMutation.isPending} className={btnPrimary}>
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan voucher'}
          </button>
        </>
      }
    >
      <form id="form-voucher" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="voucher-kode" label="Kode voucher" required hint="Huruf, angka, dan tanda minus. Otomatis huruf besar.">
            <input
              id="voucher-kode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={clsx(inputCls, 'font-mono uppercase')}
              placeholder="HEMAT20"
            />
          </Field>
          <Field id="voucher-badge" label="Label kecil" hint="Opsional, contoh: Paling Populer.">
            <input id="voucher-badge" value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field id="voucher-judul" label="Judul" required>
          <input
            id="voucher-judul"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="Paket Servis Ringan & Tune Up"
          />
        </Field>

        <Field id="voucher-deskripsi" label="Deskripsi">
          <textarea
            id="voucher-deskripsi"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={clsx(inputCls, 'py-2')}
            placeholder="Dijelaskan ke pelanggan di halaman promo."
          />
        </Field>

        <div className="space-y-2">
          <Segmented
            label="Jenis potongan"
            value={type}
            onChange={(v) => setType(v)}
            options={[
              { value: 'persen' as const, label: 'Persen (%)' },
              { value: 'nominal' as const, label: 'Nominal (Rp)' }
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="voucher-nilai" label={type === 'persen' ? 'Besar diskon (%)' : 'Besar potongan (Rp)'} required>
              <input
                id="voucher-nilai"
                type="number"
                min={1}
                max={type === 'persen' ? 100 : undefined}
                step={type === 'persen' ? 1 : 1000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputCls}
              />
            </Field>
            {type === 'persen' && (
              <Field id="voucher-maks" label="Potongan maksimum (Rp)" hint="Opsional, batas rupiah untuk diskon persen.">
                <input
                  id="voucher-maks"
                  type="number"
                  min={0}
                  step={1000}
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="voucher-min" label="Minimal belanja (Rp)" hint="Opsional.">
            <input
              id="voucher-min"
              type="number"
              min={0}
              step={1000}
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="voucher-kuota" label="Kuota total" hint="Kosong = tanpa batas.">
            <input
              id="voucher-kuota"
              type="number"
              min={promo?.used_count || 1}
              step={1}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="voucher-per-pelanggan" label="Maks per pelanggan" hint="Kosong = bebas.">
            <input
              id="voucher-per-pelanggan"
              type="number"
              min={1}
              step={1}
              value={perCustomer}
              onChange={(e) => setPerCustomer(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="voucher-mulai" label="Berlaku mulai" hint="Kosong = berlaku sejak sekarang.">
            <input
              id="voucher-mulai"
              type="date"
              value={validFrom}
              min={promo ? undefined : todayWIB()}
              onChange={(e) => setValidFrom(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="voucher-sampai" label="Berlaku sampai" hint="Kosong = tanpa batas waktu.">
            <input
              id="voucher-sampai"
              type="date"
              value={validUntil}
              min={validFrom || undefined}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 dark:border-slate-600"
          />
          Voucher aktif dan bisa dipakai pelanggan
        </label>

        {promo && promo.used_count > 0 && (
          <p className="rounded-ctl bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            Voucher ini sudah dipakai {promo.used_count}x, jadi kuotanya tidak bisa diturunkan di bawah angka itu.
          </p>
        )}

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

// ── Dialog riwayat pemakaian ─────────────────────────────────────────

function RedemptionDialog({ promo, onClose }: { promo: AdminPromo | null; onClose: () => void }) {
  const query = useQuery<AdminPromo & { redemptions: Redemption[] }>({
    queryKey: ['admin-promo-detail', promo?.id],
    queryFn: () => fetcher(`/admin/promos/${promo!.id}`),
    enabled: !!promo
  });

  const rows = query.data?.redemptions ?? [];
  const totalDiscount = rows.reduce((sum, r) => sum + r.discount_amount, 0);

  return (
    <AdminDialog
      open={!!promo}
      onClose={onClose}
      title={promo ? `Pemakaian voucher ${promo.code}` : 'Pemakaian voucher'}
      description={promo ? `${promo.used_count}x dipakai${promo.quota != null ? ` dari kuota ${promo.quota}` : ''}.` : undefined}
      footer={
        <button type="button" onClick={onClose} className={btnSecondary}>
          Tutup
        </button>
      }
    >
      {query.isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Memuat riwayat pemakaian...</p>}
      {query.isError && <p className="text-sm text-red-700 dark:text-red-300">Riwayat pemakaian gagal dimuat.</p>}
      {query.data && rows.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">Voucher ini belum pernah dipakai pelanggan.</p>
      )}
      {rows.length > 0 && (
        <>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
            Total potongan yang sudah diberikan:{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">{formatRp(totalDiscount)}</strong>
          </p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900 dark:text-white">
                    {r.customer?.full_name ?? 'Pelanggan dihapus'}
                  </span>
                  <span className="block text-slate-600 dark:text-slate-400">{adminDate(r.created_at)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-900 dark:text-white">
                  -{formatRp(r.discount_amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminDialog>
  );
}
