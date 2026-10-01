'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { SkeletonCard } from '@/components/skeletons';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCog, Building2, Wrench, Search, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

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

export default function MechanicsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Mechanic | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: mechanics = [], isLoading } = useQuery<Mechanic[]>({
    queryKey: ['admin-mechanics'],
    queryFn: () => fetcher('/admin/mechanics')
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches')
  });

  function openAdd() {
    setEditTarget(null);
    setFullName('');
    setSpecialty('');
    setBranchId(branches[0]?.id || '');
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(m: Mechanic) {
    setEditTarget(m);
    setFullName(m.full_name);
    setSpecialty(m.specialty);
    setBranchId(m.branch_id);
    setIsActive(m.is_active);
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: { branch_id: string; full_name: string; specialty: string; is_active: boolean }) =>
      editTarget
        ? fetcher(`/admin/mechanics/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : fetcher('/admin/mechanics', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(editTarget ? 'Data mekanik diperbarui' : 'Mekanik baru berhasil ditambahkan');
      qc.invalidateQueries({ queryKey: ['admin-mechanics'] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/mechanics/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Mekanik berhasil dihapus/dinonaktifkan');
      qc.invalidateQueries({ queryKey: ['admin-mechanics'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !specialty.trim() || !branchId) {
      toast.error('Mohon lengkapi semua bidang yang wajib diisi');
      return;
    }
    saveMutation.mutate({
      branch_id: branchId,
      full_name: fullName.trim(),
      specialty: specialty.trim(),
      is_active: isActive
    });
  }

  // Filter mechanics
  const filtered = mechanics.filter((m) => {
    const matchSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.specialty.toLowerCase().includes(search.toLowerCase()) ||
      m.branch.name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter ? m.branch_id === branchFilter : true;
    const matchStatus =
      statusFilter === 'active'
        ? m.is_active
        : statusFilter === 'inactive'
        ? !m.is_active
        : true;
    return matchSearch && matchBranch && matchStatus;
  });

  if (isLoading) return <SkeletonCard count={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary-500" />
            <span>Mekanik Bengkel</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data staf teknisi, spesialisasi keahlian, penempatan cabang, dan alokasi kerja
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 transition shadow-sm w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Mekanik</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mekanik (nama, spesialisasi, cabang)..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Semua Cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Grid of Mechanics */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <UserCog className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-slate-500 font-medium">Tidak ada mekanik yang sesuai dengan filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
                      {m.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                        {m.full_name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                        <Wrench className="h-3 w-3" />
                        {m.specialty}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      m.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{m.branch.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pengerjaan Aktif:</span>
                    <span
                      className={`font-semibold font-data px-2 py-0.5 rounded ${
                        m.active_jobs_count > 0
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m.active_jobs_count} Job
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => openEdit(m)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Yakin ingin ${m.is_active ? 'menonaktifkan / menghapus' : 'menghapus'} mekanik ${m.full_name}?`)) {
                      deleteMutation.mutate(m.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-md transition"
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Data Mekanik' : 'Tambah Mekanik Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap Mekanik <span className="text-red-500">*</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Spesialisasi / Keahlian <span className="text-red-500">*</span>
              </label>
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Contoh: Mesin & Transmisi, Kelistrikan, Rem & Suspensi"
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Penempatan Cabang Bengkel <span className="text-red-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Pilih Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300 select-none">
                Mekanik Aktif (dapat menerima penugasan booking)
              </label>
            </div>

            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-md bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-xs font-medium transition disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
