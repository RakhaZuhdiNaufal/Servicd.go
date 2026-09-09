'use client';

import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { SkeletonCard, SkeletonTable } from '@/components/skeletons';
import { StatusBadge } from '@/components/status-badge';
import { Users, Car, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface Summary {
  total_revenue: number;
  total_customers: number;
  total_vehicles: number;
  bookings_by_status: Record<string, number>;
  top_services: Array<{ name: string; total_bookings: number; total_revenue: number }>;
  recent_bookings: Array<{
    id: string;
    status: string;
    scheduled_at: string;
    customer: { full_name: string; phone: string };
    vehicle: { plate_number: string; brand: string; model: string };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  menunggu: '#F59E0B',
  diproses: '#3B82F6',
  selesai: '#16A34A',
  dibatalkan: '#DC2626'
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery<Summary>({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetcher('/admin/dashboard/summary'),
    refetchInterval: 60_000
  });

  if (isLoading) return <SkeletonCard count={4} />;

  const chartData = Object.entries(data?.bookings_by_status ?? {}).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: STATUS_COLORS[status] ?? '#94A3B8'
  }));

  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Pelanggan',
            value: data?.total_customers ?? 0,
            icon: Users,
            color: 'text-blue-600'
          },
          {
            label: 'Total Kendaraan',
            value: data?.total_vehicles ?? 0,
            icon: Car,
            color: 'text-amber-600'
          },
          {
            label: 'Booking Menunggu',
            value: data?.bookings_by_status?.menunggu ?? 0,
            icon: Calendar,
            color: 'text-orange-600'
          },
          {
            label: 'Total Revenue',
            value: formatRp(data?.total_revenue ?? 0),
            icon: DollarSign,
            color: 'text-green-600'
          }
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-md bg-slate-100 dark:bg-slate-800 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Top Services */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-500" />
            Booking per Status
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="35%">
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Booking']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Layanan Terlaris
          </h2>
          <div className="space-y-3">
            {(data?.top_services ?? []).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs text-slate-400 shrink-0">{i + 1}.</span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-semibold text-slate-800 dark:text-white">{s.total_bookings}x</p>
                  <p className="text-xs text-slate-500 font-data">{formatRp(s.total_revenue)}</p>
                </div>
              </div>
            ))}
            {!data?.top_services?.length && (
              <p className="text-sm text-slate-400 text-center py-6">Belum ada data layanan</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Booking Terbaru</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {(data?.recent_bookings ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {b.customer.full_name}
                </p>
                <p className="text-xs text-slate-500 font-data">
                  {b.vehicle.plate_number} · {b.vehicle.brand} {b.vehicle.model}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 shrink-0">
                {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <StatusBadge status={b.status as any} size="sm" />
            </div>
          ))}
          {!data?.recent_bookings?.length && (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada booking</p>
          )}
        </div>
      </div>
    </div>
  );
}
