'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { shortBranchName } from '@/lib/format';
import { EmptyState, ErrorState } from '@/components/customer/states';
import {
  ActiveBadge,
  AdminDialog,
  AdminPageHeader,
  Field,
  Initials,
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

interface Mechanic {
  id: string;
  branch_id: string;
  full_name: string;
  specialty: string;
  is_active: boolean;
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  active_jobs_count: number;
}

interface Branch {
  id: string;
  name: string;
}

type StatusFilter = '' | 'active' | 'inactive';
type FormErrors = Partial<Record<'full_name' | 'specialty' | 'branch_id', string>>;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' }
];

export default function MechanicsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Mechanic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mechanic | null>(null);

  // State form
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { data: mechanics = [], isLoading, isError, error, refetch } = useQuery<Mechanic[]>({
    queryKey: ['admin-mechanics'],
    queryFn: () => fetcher('/admin/mechanics')
  });

  const { data: branches = [], isError: branchesError } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches')
  });

  function openAdd() {
    setEditTarget(null);
    setFullName('');
    setSpecialty('');
    setBranchId(branches[0]?.id || '');
    setIsActive(true);
    setFormErrors({});
    saveMutation.reset();
    setDialogOpen(true);
  }

  function openEdit(m: Mechanic) {
    setEditTarget(m);
    setFullName(m.full_name);
    setSpecialty(m.specialty);
    setBranchId(m.branch_id);
    setIsActive(m.is_active);
    setFormErrors({});
    saveMutation.reset();
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: { branch_id: string; full_name: string; specialty: string; is_active: boolean }) =>
      editTarget
        ? fetcher(`/admin/mechanics/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : fetcher('/admin/mechanics', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(editTarget ? 'Data mekanik diperbarui' : 'Mekanik ditambahkan');
      qc.invalidateQueries({ queryKey: ['admin-mechanics'] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // API: mekanik dengan riwayat booking dinonaktifkan, yang belum pernah dipakai dihapus.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/mechanics/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Mekanik dihapus atau dinonaktifkan');
      qc.invalidateQueries({ queryKey: ['admin-mechanics'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FormErrors = {};
    if (!fullName.trim()) next.full_name = 'Nama mekanik wajib diisi';
    if (!specialty.trim()) next.specialty = 'Spesialisasi wajib diisi';
    if (!branchId) next.branch_id = 'Pilih cabang penempatan';
    setFormErrors(next);
    if (Object.keys(next).length) return;
    saveMutation.mutate({
      branch_id: branchId,
      full_name: fullName.trim(),
      specialty: specialty.trim(),
      is_active: isActive
    });
  }

  const q = search.trim().toLowerCase();
  const filtered = mechanics.filter((m) => {
    const matchSearch =
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      m.specialty.toLowerCase().includes(q) ||
      m.branch.name.toLowerCase().includes(q);
    const matchBranch = branchFilter ? m.branch_id === branchFilter : true;
    const matchStatus = statusFilter === 'active' ? m.is_active : statusFilter === 'inactive' ? !m.is_active : true;
    return matchSearch && matchBranch && matchStatus;
  });
  const hasFilter = !!q || !!branchFilter || !!statusFilter;

  function resetFilters() {
    setSearch('');
    setBranchFilter('');
    setStatusFilter('');
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Mekanik"
        description="Staf teknisi bengkel beserta lokasi penempatannya. Hanya mekanik aktif yang bisa ditugaskan ke booking."
        action={
          <button type="button" onClick={openAdd} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah mekanik
          </button>
        }
      />

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <SearchInput
          id="mechanic-search"
          label="Cari mekanik"
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, spesialisasi, atau cabang"
        />
        <label htmlFor="mechanic-branch" className="sr-only">
          Saring cabang
        </label>
        <select
          id="mechanic-branch"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className={`${inputCls} md:w-56`}
        >
          <option value="">Semua cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Segmented label="Status mekanik" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
      </div>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : isError ? (
        <ErrorState title="Daftar mekanik belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={hasFilter ? 'Tidak ada mekanik yang cocok' : 'Belum ada mekanik'}
          description={
            hasFilter
              ? 'Ubah kata kunci atau filter cabang dan status.'
              : 'Tambahkan mekanik supaya booking bisa ditugaskan ke teknisi.'
          }
          action={hasFilter ? { label: 'Reset filter', onClick: resetFilters } : { label: 'Tambah mekanik', onClick: openAdd }}
        />
      ) : (
        <TableCard
          footer={
            <p className="border-t border-slate-200 px-4 py-2.5 text-[13px] tabular-nums text-slate-600 dark:border-slate-800 dark:text-slate-400">
              {hasFilter ? `${filtered.length} dari ${mechanics.length} mekanik` : `${mechanics.length} mekanik`}
            </p>
          }
        >
          <table className="hidden w-full text-sm md:table">
            <thead className={theadCls}>
              <tr>
                <Th>Nama</Th>
                <Th>Cabang</Th>
                <Th align="right">Sedang dikerjakan</Th>
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {filtered.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Initials name={m.full_name} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">{m.full_name}</p>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400">{m.specialty}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-700 dark:text-slate-300">{shortBranchName(m.branch.name)}</Td>
                  <Td align="right" className="tabular-nums">
                    <span className={m.active_jobs_count > 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}>
                      {m.active_jobs_count}
                    </span>
                  </Td>
                  <Td>
                    <ActiveBadge active={m.is_active} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(m)} className={btnRow} aria-label={`Ubah ${m.full_name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Ubah
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(m)} className={btnRowDanger} aria-label={`Hapus ${m.full_name}`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Hapus
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className={`md:hidden ${tbodyCls}`}>
            {filtered.map((m) => (
              <li key={m.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Initials name={m.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{m.full_name}</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400">
                      {m.specialty} · {shortBranchName(m.branch.name)}
                    </p>
                    <p className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{m.active_jobs_count} sedang dikerjakan</p>
                  </div>
                  <ActiveBadge active={m.is_active} />
                </div>
                <div className="flex gap-1 pl-11">
                  <button type="button" onClick={() => openEdit(m)} className={`${btnRow} h-11 border border-slate-200 dark:border-slate-700`} aria-label={`Ubah ${m.full_name}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Ubah
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(m)} className={`${btnRowDanger} h-11`} aria-label={`Hapus ${m.full_name}`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </TableCard>
      )}

      {/* Tambah / ubah */}
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? 'Ubah data mekanik' : 'Tambah mekanik'}
        footer={
          <>
            <button type="button" onClick={() => setDialogOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" form="mechanic-form" disabled={saveMutation.isPending} className={btnPrimary}>
              {saveMutation.isPending ? 'Menyimpan...' : editTarget ? 'Simpan perubahan' : 'Simpan mekanik'}
            </button>
          </>
        }
      >
        <form id="mechanic-form" noValidate onSubmit={handleSubmit} className="space-y-4">
          <Field id="m-name" label="Nama lengkap" error={formErrors.full_name} required>
            <input
              id="m-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama mekanik"
              aria-invalid={!!formErrors.full_name}
              aria-describedby={formErrors.full_name ? 'm-name-error' : undefined}
              className={inputCls}
            />
          </Field>
          <Field
            id="m-specialty"
            label="Spesialisasi"
            error={formErrors.specialty}
            hint="Contoh: Mesin & transmisi, Kelistrikan, Rem & kaki-kaki"
            required
          >
            <input
              id="m-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              aria-invalid={!!formErrors.specialty}
              aria-describedby={formErrors.specialty ? 'm-specialty-error' : 'm-specialty-hint'}
              className={inputCls}
            />
          </Field>
          <Field
            id="m-branch"
            label="Cabang penempatan"
            error={formErrors.branch_id ?? (branchesError ? 'Daftar cabang gagal dimuat. Tutup dialog lalu muat ulang halaman.' : undefined)}
            required
          >
            <select
              id="m-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              aria-invalid={!!formErrors.branch_id}
              aria-describedby={formErrors.branch_id || branchesError ? 'm-branch-error' : undefined}
              className={inputCls}
            >
              <option value="">Pilih cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-ctl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary-600"
            />
            <span className="text-sm">
              <span className="block font-medium text-slate-900 dark:text-white">Mekanik aktif</span>
              <span className="block text-[13px] text-slate-600 dark:text-slate-400">Bisa menerima penugasan booking.</span>
            </span>
          </label>
          {saveMutation.isError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {saveMutation.error.message}
            </p>
          )}
        </form>
      </AdminDialog>

      {/* Konfirmasi hapus */}
      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Hapus mekanik?"
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Batal
            </button>
            <button
              type="button"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className={btnDanger}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Hapus mekanik'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <strong className="text-slate-900 dark:text-white">{deleteTarget?.full_name}</strong> akan dihapus. Kalau pernah
          menangani booking, datanya tetap disimpan dan statusnya diubah menjadi nonaktif.
        </p>
      </AdminDialog>
    </div>
  );
}
