'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { AlertTriangle, History, PackagePlus, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { STOCK_STATUS_LABEL, type StockStatus } from '@servicego/shared';
import { fetcher } from '@/lib/fetcher';
import { formatRp } from '@/lib/format';
import { ErrorState, EmptyState } from '@/components/customer/states';
import { adminSchedule } from '@/components/admin/format';
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

interface LinkedService {
  service_id: string;
  qty_needed: number;
  name: string;
  is_active: boolean;
}

interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  stock_qty: number;
  min_qty: number;
  price: number | null;
  note: string | null;
  is_active: boolean;
  status: StockStatus;
  services: LinkedService[];
}

interface ListResponse {
  items: StockItem[];
  meta: { total: number; out_of_stock: number; low: number };
}

interface Service {
  id: string;
  name: string;
  is_active: boolean;
}

interface Movement {
  id: string;
  type: 'masuk' | 'keluar' | 'penyesuaian';
  quantity: number;
  stock_after: number;
  note: string | null;
  created_at: string;
  changer: { id: string; full_name: string } | null;
}

const STATUS_FILTERS: Array<{ value: '' | StockStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'habis', label: 'Habis' },
  { value: 'menipis', label: 'Menipis' },
  { value: 'aman', label: 'Aman' }
];

const MOVEMENT_LABEL: Record<Movement['type'], string> = {
  masuk: 'Barang masuk',
  keluar: 'Barang keluar',
  penyesuaian: 'Hasil stok opname'
};

const PAGE_SIZE = 20;

function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        status === 'habis' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
        status === 'menipis' &&
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
        status === 'aman' &&
          'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          status === 'habis' ? 'bg-red-600' : status === 'menipis' ? 'bg-amber-500' : 'bg-green-600'
        )}
      />
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}

export default function StokPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | StockStatus>('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StockItem | null>(null);
  const [stockTarget, setStockTarget] = useState<StockItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null);

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

  const { data, isLoading, isError, error, refetch } = useQuery<ListResponse>({
    queryKey: ['admin-inventory', search, status],
    queryFn: () =>
      fetcher(
        `/admin/inventory?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(status ? { status } : {})
        })}`
      )
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: () => fetcher('/admin/services')
  });

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-inventory'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/inventory/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, _v, _c) => {
      toast.success('Barang berhasil dihapus atau dinonaktifkan');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const outOfStock = data?.meta.out_of_stock ?? 0;
  const low = data?.meta.low ?? 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Stok barang"
        description="Barang yang dipakai layanan bengkel. Layanan dengan barang habis sebaiknya dinonaktifkan dari katalog."
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
            Tambah barang
          </button>
        }
      />

      {(outOfStock > 0 || low > 0) && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <p className="flex-1 text-amber-900 dark:text-amber-100">
            {outOfStock > 0 && <strong className="font-semibold">{outOfStock} barang habis</strong>}
            {outOfStock > 0 && low > 0 && ' dan '}
            {low > 0 && <strong className="font-semibold">{low} barang menipis</strong>}. Cek layanan yang memakainya.
          </p>
          <Link
            href="/admin/services"
            className="inline-flex min-h-[40px] items-center rounded-ctl border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            Buka katalog layanan
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          id="cari-barang"
          label="Cari barang"
          placeholder="Nama barang atau kode"
          value={searchInput}
          onChange={setSearchInput}
        />
        <Segmented
          label="Filter status stok"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_FILTERS}
        />
      </div>

      {isLoading && <TableSkeleton rows={6} cols={5} />}

      {isError && (
        <ErrorState title="Data stok belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      )}

      {data && items.length === 0 && (
        <EmptyState
          icon={PackagePlus}
          title={search || status ? 'Tidak ada barang yang cocok' : 'Belum ada barang terdaftar'}
          description={
            search || status
              ? 'Coba ubah kata kunci atau filter statusnya.'
              : 'Tambahkan oli, filter, kampas rem, dan barang lain yang dipakai layanan bengkel.'
          }
        />
      )}

      {data && items.length > 0 && (
        <TableCard
          footer={
            <Pagination page={page} totalPages={totalPages} total={items.length} unit="barang" onChange={setPage} />
          }
        >
          <table className="w-full min-w-[840px] text-sm">
            <thead className={theadCls}>
              <tr>
                <Th>Barang</Th>
                <Th align="right">Stok</Th>
                <Th>Status</Th>
                <Th>Dipakai layanan</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {pageItems.map((item) => (
                <tr key={item.id} className={clsx(!item.is_active && 'opacity-60')}>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                        {item.sku ? <span className="font-mono">{item.sku}</span> : 'Tanpa kode'}
                        {item.price ? ` · ${formatRp(item.price)}/${item.unit}` : ''}
                        {!item.is_active && ' · nonaktif'}
                      </p>
                    </div>
                  </Td>
                  <Td align="right">
                    <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.stock_qty}
                    </span>
                    <span className="text-[13px] text-slate-600 dark:text-slate-400"> {item.unit}</span>
                    <p className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">min. {item.min_qty}</p>
                  </Td>
                  <Td>
                    <StockBadge status={item.status} />
                  </Td>
                  <Td>
                    {item.services.length === 0 ? (
                      <span className="text-[13px] text-slate-500 dark:text-slate-400">Belum dihubungkan</span>
                    ) : (
                      <div className="flex max-w-[280px] flex-wrap gap-1">
                        {item.services.map((s) => (
                          <span
                            key={s.service_id}
                            title={`${s.name} — ${s.qty_needed} ${item.unit} per servis`}
                            className={clsx(
                              'inline-flex max-w-[160px] items-center gap-1 truncate rounded-chip px-2 py-0.5 text-[12px]',
                              s.is_active
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-500'
                            )}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setStockTarget(item)} className={btnRow}>
                        <History className="h-4 w-4" aria-hidden />
                        Ubah stok
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(item);
                          setFormOpen(true);
                        }}
                        className={btnRow}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(item)} className={btnRowDanger}>
                        {item.services.length > 0 ? (
                          <Power className="h-4 w-4" aria-hidden />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                        {item.services.length > 0 ? 'Nonaktifkan' : 'Hapus'}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      <ItemFormDialog
        open={formOpen}
        item={editTarget}
        services={services}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSaved={invalidate}
      />

      <StockDialog item={stockTarget} onClose={() => setStockTarget(null)} onSaved={invalidate} />

      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title={deleteTarget && deleteTarget.services.length > 0 ? 'Nonaktifkan barang' : 'Hapus barang'}
        description={
          deleteTarget && deleteTarget.services.length > 0
            ? `${deleteTarget.name} masih dipakai ${deleteTarget.services.length} layanan, jadi hanya dinonaktifkan agar riwayatnya tetap utuh.`
            : deleteTarget
              ? `${deleteTarget.name} akan dihapus permanen.`
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
          Riwayat pergerakan stok barang ini tetap tersimpan.
        </p>
      </AdminDialog>
    </div>
  );
}

// ── Dialog tambah/edit barang ────────────────────────────────────────

function ItemFormDialog({
  open,
  item,
  services,
  onClose,
  onSaved
}: {
  open: boolean;
  item: StockItem | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [stockQty, setStockQty] = useState('0');
  const [minQty, setMinQty] = useState('0');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [links, setLinks] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setName(item?.name ?? '');
    setSku(item?.sku ?? '');
    setUnit(item?.unit ?? 'pcs');
    setStockQty(String(item?.stock_qty ?? 0));
    setMinQty(String(item?.min_qty ?? 0));
    setPrice(item?.price != null ? String(item.price) : '');
    setNote(item?.note ?? '');
    setIsActive(item?.is_active ?? true);
    setLinks(Object.fromEntries((item?.services ?? []).map((s) => [s.service_id, s.qty_needed])));
  }, [open, item]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      item
        ? fetcher(`/admin/inventory/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : fetcher('/admin/inventory', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(item ? 'Data barang diperbarui' : 'Barang baru ditambahkan');
      onSaved();
      onClose();
    },
    onError: (e: Error) => setFormError(e.message)
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const stock = Number(stockQty);
    const min = Number(minQty);
    if (!name.trim()) return setFormError('Nama barang wajib diisi.');
    if (!Number.isInteger(stock) || stock < 0) return setFormError('Stok harus bilangan bulat 0 atau lebih.');
    if (!Number.isInteger(min) || min < 0) return setFormError('Stok minimum harus bilangan bulat 0 atau lebih.');

    const payload: Record<string, unknown> = {
      name: name.trim(),
      sku: sku.trim() || null,
      unit: unit.trim() || 'pcs',
      min_qty: min,
      price: price.trim() === '' ? null : Number(price),
      note: note.trim() || null,
      is_active: isActive,
      services: Object.entries(links).map(([service_id, qty_needed]) => ({
        service_id,
        qty_needed: Math.max(1, Number(qty_needed) || 1)
      }))
    };
    // Stok hanya diisi saat membuat barang baru; perubahan setelah itu lewat dialog "Ubah stok"
    // supaya setiap perubahan punya catatan riwayat.
    if (!item) payload.stock_qty = stock;

    saveMutation.mutate(payload);
  }

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, 'id-ID')),
    [services]
  );

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={item ? 'Ubah data barang' : 'Tambah barang'}
      description="Hubungkan barang dengan layanan yang memakainya agar peringatan stok muncul di dashboard."
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="submit" form="form-barang" disabled={saveMutation.isPending} className={btnPrimary}>
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <form id="form-barang" onSubmit={submit} className="space-y-4" noValidate>
        <Field id="barang-nama" label="Nama barang" required>
          <input
            id="barang-nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Oli mesin 10W-40"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="barang-sku" label="Kode barang" hint="Opsional, harus unik.">
            <input id="barang-sku" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="OLI-1040" />
          </Field>
          <Field id="barang-unit" label="Satuan" required>
            <input id="barang-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} placeholder="liter" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="barang-stok"
            label={item ? 'Stok saat ini' : 'Stok awal'}
            hint={item ? 'Ubah lewat tombol "Ubah stok" agar tercatat riwayatnya.' : undefined}
          >
            <input
              id="barang-stok"
              type="number"
              min={0}
              step={1}
              value={stockQty}
              disabled={!!item}
              onChange={(e) => setStockQty(e.target.value)}
              className={clsx(inputCls, item && 'cursor-not-allowed opacity-60')}
            />
          </Field>
          <Field id="barang-min" label="Stok minimum" hint="Di bawah atau sama dengan angka ini dianggap menipis.">
            <input
              id="barang-min"
              type="number"
              min={0}
              step={1}
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field id="barang-harga" label="Harga beli per satuan" hint="Opsional, untuk menghitung nilai stok.">
          <input
            id="barang-harga"
            type="number"
            min={0}
            step={500}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
            placeholder="85000"
          />
        </Field>

        <Field id="barang-catatan" label="Catatan">
          <textarea
            id="barang-catatan"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={clsx(inputCls, 'py-2')}
            placeholder="Supplier, merek, atau info lain"
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">Dipakai layanan</legend>
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            Centang layanan yang membutuhkan barang ini, lalu isi berapa banyak terpakai per servis.
          </p>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-ctl border border-slate-200 p-2 dark:border-slate-800">
            {sortedServices.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-600 dark:text-slate-400">Belum ada layanan di katalog.</p>
            )}
            {sortedServices.map((s) => {
              const checked = s.id in links;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-chip px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <input
                    id={`svc-${s.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setLinks((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[s.id] = prev[s.id] ?? 1;
                        else delete next[s.id];
                        return next;
                      })
                    }
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 dark:border-slate-600"
                  />
                  <label htmlFor={`svc-${s.id}`} className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                    {s.name}
                    {!s.is_active && <span className="text-slate-500 dark:text-slate-400"> (nonaktif)</span>}
                  </label>
                  {checked && (
                    <input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`Jumlah ${unit} per servis untuk ${s.name}`}
                      value={links[s.id]}
                      onChange={(e) => setLinks((prev) => ({ ...prev, [s.id]: Number(e.target.value) }))}
                      className={clsx(inputCls, 'w-20 shrink-0 text-right')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 dark:border-slate-600"
          />
          Barang aktif dipakai bengkel
        </label>

        {formError && (
          <p role="alert" className="rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {formError}
          </p>
        )}
      </form>
    </AdminDialog>
  );
}

// ── Dialog ubah stok + riwayat ───────────────────────────────────────

function StockDialog({ item, onClose, onSaved }: { item: StockItem | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<Movement['type']>('masuk');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!item) return;
    setType('masuk');
    setQuantity('1');
    setNote('');
    setFormError(null);
  }, [item]);

  const historyQuery = useQuery<{ movements: Movement[] }>({
    queryKey: ['admin-inventory-history', item?.id],
    queryFn: () => fetcher(`/admin/inventory/${item!.id}/stock`),
    enabled: !!item
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetcher(`/admin/inventory/${item!.id}/stock`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res: any) => {
      toast.success(res?.status === 'habis' ? 'Stok tersimpan — barang ini sekarang habis' : 'Stok berhasil diperbarui');
      qc.invalidateQueries({ queryKey: ['admin-inventory-history', item?.id] });
      onSaved();
      onClose();
    },
    onError: (e: Error) => setFormError(e.message)
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) return setFormError('Jumlah harus bilangan bulat 0 atau lebih.');
    if (type !== 'penyesuaian' && qty < 1) return setFormError('Jumlah minimal 1.');
    mutation.mutate({ type, quantity: qty, note: note.trim() || null });
  }

  const preview = useMemo(() => {
    if (!item) return null;
    const qty = Number(quantity);
    if (!Number.isFinite(qty)) return null;
    if (type === 'masuk') return item.stock_qty + qty;
    if (type === 'keluar') return item.stock_qty - qty;
    return qty;
  }, [item, quantity, type]);

  return (
    <AdminDialog
      open={!!item}
      onClose={onClose}
      title={item ? `Ubah stok ${item.name}` : 'Ubah stok'}
      description={item ? `Stok sekarang ${item.stock_qty} ${item.unit}, minimum ${item.min_qty} ${item.unit}.` : undefined}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Tutup
          </button>
          <button type="submit" form="form-stok" disabled={mutation.isPending} className={btnPrimary}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan perubahan stok'}
          </button>
        </>
      }
    >
      <form id="form-stok" onSubmit={submit} className="space-y-4" noValidate>
        <Segmented
          label="Jenis perubahan"
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'masuk' as const, label: 'Masuk' },
            { value: 'keluar' as const, label: 'Keluar' },
            { value: 'penyesuaian' as const, label: 'Opname' }
          ]}
        />

        <Field
          id="stok-jumlah"
          label={type === 'penyesuaian' ? 'Stok hasil hitung ulang' : 'Jumlah'}
          required
          hint={
            preview !== null && item
              ? `Stok setelah disimpan: ${Math.max(0, preview)} ${item.unit}${preview < 0 ? ' (ditolak, tidak boleh minus)' : ''}`
              : undefined
          }
        >
          <input
            id="stok-jumlah"
            type="number"
            min={0}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field id="stok-catatan" label="Catatan">
          <input
            id="stok-catatan"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            placeholder={type === 'masuk' ? 'Kiriman dari supplier' : 'Terpakai servis siang'}
          />
        </Field>

        {formError && (
          <p role="alert" className="rounded-ctl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {formError}
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Riwayat terakhir</h3>
        {historyQuery.isLoading && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Memuat riwayat...</p>}
        {historyQuery.data && historyQuery.data.movements.length === 0 && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Belum ada perubahan stok yang tercatat.</p>
        )}
        <ul className="mt-2 space-y-2">
          {(historyQuery.data?.movements ?? []).slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0">
                <span className="font-medium text-slate-900 dark:text-white">{MOVEMENT_LABEL[m.type]}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {' '}
                  {m.type === 'keluar' ? '-' : m.type === 'masuk' ? '+' : '±'}
                  {m.quantity} → sisa {m.stock_after}
                </span>
                {m.note && <span className="block truncate text-slate-500 dark:text-slate-400">{m.note}</span>}
              </span>
              <span className="shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400">
                {adminSchedule(m.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AdminDialog>
  );
}
