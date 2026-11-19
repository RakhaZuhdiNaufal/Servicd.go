'use client';

// Grafik panel admin (Recharts). Semua warna mengikuti token DESIGN.md dan ikut berganti
// saat tema gelap dinyalakan, karena Recharts butuh warna sebagai nilai JS, bukan kelas Tailwind.

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatRp } from '@/lib/format';

export type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'diproses' | 'selesai' | 'dibatalkan';

/** Warna per status booking: sama dengan StatusBadge supaya tabel dan grafik tidak berbeda arti. */
export const STATUS_COLOR: Record<BookingStatus, string> = {
  menunggu: '#F59E0B',
  dikonfirmasi: '#0EA5E9',
  diproses: '#2563EB',
  selesai: '#16A34A',
  dibatalkan: '#DC2626'
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  menunggu: 'Menunggu',
  dikonfirmasi: 'Dikonfirmasi',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan'
};

export const STATUS_SEQUENCE: BookingStatus[] = [
  'menunggu',
  'dikonfirmasi',
  'diproses',
  'selesai',
  'dibatalkan'
];

const nf = new Intl.NumberFormat('id-ID');

/** Tema gelap dipasang sebagai kelas di <html> oleh ThemeToggle; grafik ikut berganti tanpa reload. */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

function useChartTheme() {
  const dark = useIsDark();
  return useMemo(
    () => ({
      dark,
      grid: dark ? '#1E293B' : '#E2E8F0',
      axis: dark ? '#94A3B8' : '#64748B',
      cursor: dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.10)',
      surface: dark ? '#0F172A' : '#FFFFFF',
      revenue: dark ? '#60A5FA' : '#2563EB',
      bookings: dark ? '#34D399' : '#059669'
    }),
    [dark]
  );
}

/** Ringkas untuk sumbu: 1.250.000 -> "1,3 jt". */
function compactRp(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return nf.format(value);
}

/** "2026-11-18" -> "18 Nov" (tanggal sudah berupa hari kalender WIB dari server). */
function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return d.toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short' });
}

function TooltipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none rounded-ctl border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <div className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

// ── Donat distribusi status ──────────────────────────────────────────

interface DonutDatum {
  key: BookingStatus;
  label: string;
  value: number;
  color: string;
}

/**
 * Donat distribusi status booking. Sektor bisa di-hover (sektor lain meredup) dan diklik
 * untuk membuka daftar booking yang sudah terfilter status itu.
 * Legendanya dirender terpisah oleh halaman supaya tetap bisa dipakai lewat keyboard.
 */
export function StatusDonut({
  counts,
  active,
  onActiveChange,
  onSelect,
  height = 240
}: {
  counts: Record<BookingStatus, number>;
  active: BookingStatus | null;
  onActiveChange: (status: BookingStatus | null) => void;
  onSelect: (status: BookingStatus) => void;
  height?: number;
}) {
  const theme = useChartTheme();

  const data: DonutDatum[] = STATUS_SEQUENCE.map((key) => ({
    key,
    label: STATUS_LABEL[key],
    value: counts?.[key] ?? 0,
    color: STATUS_COLOR[key]
  })).filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const focused = data.find((d) => d.key === active) ?? null;
  const centerValue = focused ? focused.value : total;
  const centerLabel = focused ? focused.label : 'Total booking';
  const centerPct = focused && total ? Math.round((focused.value / total) * 100) : null;

  if (total === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-ctl border border-dashed border-slate-300 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400"
      >
        Belum ada booking yang tercatat.
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={6}
            stroke={theme.surface}
            strokeWidth={2}
            isAnimationActive="auto"
            animationDuration={600}
            onMouseEnter={(_, index) => onActiveChange(data[index]?.key ?? null)}
            onMouseLeave={() => onActiveChange(null)}
            onClick={(_, index) => {
              const key = data[index]?.key;
              if (key) onSelect(key);
            }}
            className="cursor-pointer focus:outline-none"
          >
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.color}
                fillOpacity={active && active !== d.key ? 0.28 : 1}
                style={{ transition: 'fill-opacity 150ms ease' }}
              />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            content={({ active: hovered, payload }) => {
              if (!hovered || !payload?.length) return null;
              const d = payload[0].payload as DonutDatum;
              const pct = total ? Math.round((d.value / total) * 100) : 0;
              return (
                <TooltipBox title={d.label}>
                  <p className="tabular-nums">
                    {nf.format(d.value)} booking · {pct}%
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">Klik untuk membuka daftarnya</p>
                </TooltipBox>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Angka di tengah donat: ikut sektor yang sedang disorot */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{nf.format(centerValue)}</span>
        <span className="mt-0.5 max-w-[8rem] text-[13px] text-slate-600 dark:text-slate-400">
          {centerLabel}
          {centerPct !== null && <span className="tabular-nums"> · {centerPct}%</span>}
        </span>
      </div>
    </div>
  );
}

// ── Tren harian ──────────────────────────────────────────────────────

export interface TrendRow {
  day: string;
  bookings: number;
  completed: number;
  revenue: number;
}

/**
 * Tren 14 hari terakhir. Metrik bisa diganti antara pendapatan (area) dan jumlah booking
 * (batang + garis booking selesai), supaya satu kartu memuat dua sudut pandang.
 */
export function TrendChart({
  rows,
  metric,
  height = 260
}: {
  rows: TrendRow[];
  metric: 'revenue' | 'bookings';
  height?: number;
}) {
  const theme = useChartTheme();
  const data = rows.map((r) => ({ ...r, label: dayLabel(r.day) }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sg-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.revenue} stopOpacity={0.35} />
              <stop offset="100%" stopColor={theme.revenue} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: theme.axis, fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: theme.axis, fontSize: 12 }}
            allowDecimals={false}
            tickFormatter={(v: number) => (metric === 'revenue' ? compactRp(v) : nf.format(v))}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as TrendRow & { label: string };
              return (
                <TooltipBox title={row.label}>
                  {metric === 'revenue' ? (
                    <>
                      <p className="tabular-nums">{formatRp(row.revenue)} dari booking selesai</p>
                      <p className="tabular-nums text-slate-500 dark:text-slate-400">
                        {nf.format(row.completed)} dari {nf.format(row.bookings)} booking selesai
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="tabular-nums">{nf.format(row.bookings)} booking dijadwalkan</p>
                      <p className="tabular-nums text-slate-500 dark:text-slate-400">
                        {nf.format(row.completed)} di antaranya selesai
                      </p>
                    </>
                  )}
                </TooltipBox>
              );
            }}
          />
          {metric === 'revenue' ? (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={theme.revenue}
              strokeWidth={2}
              fill="url(#sg-revenue-fill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              isAnimationActive="auto"
              animationDuration={600}
            />
          ) : (
            <>
              <Bar dataKey="bookings" fill={theme.revenue} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={theme.bookings}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pemasukan harian (halaman Pembayaran) ────────────────────────────

export interface DailyAmountRow {
  day: string;
  amount: number;
}

/** Batang pemasukan per hari dari pembayaran berstatus lunas. */
export function DailyRevenueChart({ rows, height = 220 }: { rows: DailyAmountRow[]; height?: number }) {
  const theme = useChartTheme();
  const data = rows.map((r) => ({ ...r, label: dayLabel(r.day) }));

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-ctl border border-dashed border-slate-300 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400"
      >
        Belum ada pembayaran lunas pada rentang ini.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: theme.axis, fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: theme.axis, fontSize: 12 }}
            tickFormatter={(v: number) => compactRp(v)}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as DailyAmountRow & { label: string };
              return (
                <TooltipBox title={row.label}>
                  <p className="tabular-nums">{formatRp(row.amount)} diterima</p>
                </TooltipBox>
              );
            }}
          />
          <Bar
            dataKey="amount"
            fill={theme.revenue}
            radius={[6, 6, 0, 0]}
            maxBarSize={32}
            isAnimationActive="auto"
            animationDuration={600}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Layanan terlaris ─────────────────────────────────────────────────

export interface TopServiceRow {
  service_id: string;
  name: string;
  total_bookings: number;
  total_revenue: number;
}

/** Batang horizontal layanan paling sering dipesan; klik batang membuka katalog layanan. */
export function TopServicesChart({
  rows,
  onSelect,
  height = 260
}: {
  rows: TopServiceRow[];
  onSelect?: (serviceId: string) => void;
  height?: number;
}) {
  const theme = useChartTheme();
  const data = [...rows].sort((a, b) => a.total_bookings - b.total_bookings);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: theme.axis, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={132}
            tickLine={false}
            axisLine={false}
            tick={{ fill: theme.axis, fontSize: 12 }}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as TopServiceRow;
              return (
                <TooltipBox title={row.name}>
                  <p className="tabular-nums">{nf.format(row.total_bookings)}x dipesan</p>
                  <p className="tabular-nums text-slate-500 dark:text-slate-400">
                    {formatRp(row.total_revenue)} dari harga saat booking
                  </p>
                </TooltipBox>
              );
            }}
          />
          <Bar
            dataKey="total_bookings"
            fill={theme.revenue}
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
            isAnimationActive="auto"
            animationDuration={600}
            onClick={(entry: any) => onSelect?.(entry?.payload?.service_id ?? entry?.service_id)}
            className={onSelect ? 'cursor-pointer' : undefined}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
