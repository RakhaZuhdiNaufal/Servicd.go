import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiCatch } from '@/lib/response';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function detectCategory(serviceName: string): string {
  const s = serviceName.toLowerCase();
  if (s.includes('oli') || s.includes('radiator') || s.includes('cairan') || s.includes('flush')) return 'Oli & Cairan';
  if (s.includes('mesin') || s.includes('tune') || s.includes('throttle') || s.includes('busi') || s.includes('transmisi') || s.includes('karburator')) return 'Mesin & Transmisi';
  if (s.includes('rem') || s.includes('brake') || s.includes('kampas') || s.includes('rotor')) return 'Sistem Rem';
  if (s.includes('aki') || s.includes('kelistrikan') || s.includes('starter') || s.includes('lampu') || s.includes('obd')) return 'Kelistrikan';
  if (s.includes('ac') || s.includes('freon') || s.includes('kondensor') || s.includes('filter ac')) return 'Servis AC';
  if (s.includes('spooring') || s.includes('balancing') || s.includes('kaki') || s.includes('shock') || s.includes('ban')) return 'Kaki-kaki & Suspensi';
  return 'Servis Berkala';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const search = searchParams.get('search')?.trim().toLowerCase();
    const isActiveParam = searchParams.get('is_active');

    const whereClause: any = {};
    if (branchId) whereClause.branch_id = branchId;
    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== '') {
      whereClause.is_active = isActiveParam === 'true';
    }

    const mechanics = await prisma.mechanic.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        },
        bookings: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate_number: true,
                brand: true,
                model: true,
                vehicle_type: true
              }
            },
            customer: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                email: true
              }
            },
            booking_services: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    duration_minutes: true
                  }
                }
              }
            },
            review: {
              select: {
                rating: true,
                comment: true,
                created_at: true
              }
            }
          },
          orderBy: {
            scheduled_at: 'desc'
          }
        }
      },
      orderBy: { full_name: 'asc' }
    });

    const now = new Date();
    // Start of current week (Monday)
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Generate last 6 months list for trend charting: [{ year, month, label }]
    const last6Months: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
      });
    }

    // Generate last 7 days list for weekly trend
    const last7Days: Array<{ dateStr: string; label: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayName = DAY_NAMES[d.getDay()];
      const dayNum = d.getDate();
      last7Days.push({
        dateStr: d.toISOString().slice(0, 10),
        label: `${dayName} (${dayNum})`
      });
    }

    let globalTotalCompletedThisMonth = 0;
    let globalTotalCompletedThisWeek = 0;
    let globalActiveJobs = 0;

    const list = mechanics.map((m) => {
      const allBookings = m.bookings;
      const completed = allBookings.filter((b) => b.status === 'selesai');
      const inProgress = allBookings.filter((b) => b.status === 'diproses');
      const weekCompleted = completed.filter((b) => new Date(b.scheduled_at) >= startOfWeek);
      const monthCompleted = completed.filter((b) => new Date(b.scheduled_at) >= startOfMonth);

      globalTotalCompletedThisMonth += monthCompleted.length;
      globalTotalCompletedThisWeek += weekCompleted.length;
      globalActiveJobs += inProgress.length;

      // Ratings calculation
      const reviews = allBookings.map((b) => b.review).filter((r): r is NonNullable<typeof r> => !!r);
      const avgRating =
        reviews.length > 0
          ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
          : null;

      // Monthly Trend (6 bulan terakhir)
      const monthlyTrend = last6Months.map(({ year, month, label }) => {
        const count = completed.filter((b) => {
          const bd = new Date(b.scheduled_at);
          return bd.getFullYear() === year && bd.getMonth() === month;
        }).length;
        return {
          period: label,
          servis: count
        };
      });

      // Weekly/Daily Trend (7 hari terakhir)
      const weeklyTrend = last7Days.map(({ dateStr, label }) => {
        const count = completed.filter((b) => {
          const bdStr = new Date(b.scheduled_at).toISOString().slice(0, 10);
          return bdStr === dateStr;
        }).length;
        return {
          period: label,
          servis: count
        };
      });

      // Distribusi Kategori Layanan
      const categoryCounts: Record<string, number> = {};
      completed.forEach((b) => {
        b.booking_services.forEach((bs) => {
          const cat = detectCategory(bs.service.name);
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      });

      const totalCatServices = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
      const categoryDistribution = Object.entries(categoryCounts)
        .map(([name, count]) => ({
          name,
          count,
          percent: totalCatServices > 0 ? Math.round((count / totalCatServices) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Riwayat Pengerjaan Terakhir
      const recentJobs = allBookings.slice(0, 15).map((b) => ({
        id: b.id,
        scheduled_at: b.scheduled_at.toISOString(),
        status: b.status,
        customer_name: b.customer?.full_name || 'Pelanggan Walk-in',
        customer_phone: b.customer?.phone || null,
        vehicle_plate: b.vehicle?.plate_number || '-',
        vehicle_name: b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : 'Kendaraan',
        vehicle_type: b.vehicle?.vehicle_type || 'mobil',
        services: b.booking_services.map((bs) => bs.service.name),
        rating: b.review?.rating ?? null,
        review_comment: b.review?.comment ?? null
      }));

      return {
        id: m.id,
        branch_id: m.branch_id,
        full_name: m.full_name,
        specialty: m.specialty,
        is_active: m.is_active,
        branch: m.branch,
        stats: {
          total_completed: completed.length,
          month_completed: monthCompleted.length,
          week_completed: weekCompleted.length,
          active_jobs: inProgress.length,
          avg_rating: avgRating,
          review_count: reviews.length
        },
        monthly_trend: monthlyTrend,
        weekly_trend: weeklyTrend,
        category_distribution: categoryDistribution,
        recent_jobs: recentJobs
      };
    });

    // Saring jika ada query pencarian teks
    const filteredList = search
      ? list.filter(
          (m) =>
            m.full_name.toLowerCase().includes(search) ||
            m.specialty.toLowerCase().includes(search) ||
            m.branch.name.toLowerCase().includes(search)
        )
      : list;

    // Cari top performer bulan ini
    const sortedByMonth = [...list].sort((a, b) => {
      if (b.stats.month_completed !== a.stats.month_completed) {
        return b.stats.month_completed - a.stats.month_completed;
      }
      return (b.stats.avg_rating ?? 0) - (a.stats.avg_rating ?? 0);
    });
    const topPerformer = sortedByMonth[0] ?? null;

    const activeCount = list.filter((m) => m.is_active).length;
    const avgPerMechanic = activeCount > 0 ? Number((globalTotalCompletedThisMonth / activeCount).toFixed(1)) : 0;

    const response = {
      summary: {
        total_mechanics: list.length,
        active_mechanics: activeCount,
        completed_this_month: globalTotalCompletedThisMonth,
        completed_this_week: globalTotalCompletedThisWeek,
        active_jobs: globalActiveJobs,
        avg_services_per_mechanic: avgPerMechanic,
        top_performer: topPerformer
          ? {
              id: topPerformer.id,
              name: topPerformer.full_name,
              specialty: topPerformer.specialty,
              branch_name: topPerformer.branch.name,
              month_completed: topPerformer.stats.month_completed,
              avg_rating: topPerformer.stats.avg_rating
            }
          : null
      },
      mechanics: filteredList
    };

    return apiSuccess(response, 'Data performa mekanik berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data performa mekanik');
  }
}
