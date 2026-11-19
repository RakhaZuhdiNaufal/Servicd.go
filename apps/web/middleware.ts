import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAnon, getSupabaseAdmin } from '@/lib/supabase';

// Daftar endpoint API publik yang tidak memerlukan autentikasi
const PUBLIC_API_ROUTES = [
  { path: '/api/v1/services', method: 'GET' },
  { path: '/api/v1/branches', method: 'GET' },
  { path: '/api/v1/bookings/available-slots', method: 'GET' },
  { path: '/api/v1/promos', method: 'GET' }
];

const AUTH_CONTEXT_HEADERS = ['x-auth-id', 'x-profile-id', 'x-user-role', 'x-user-email'];

/**
 * Cache hasil verifikasi token (30 detik).
 *
 * Tanpa ini setiap request API menempuh dua perjalanan ke Supabase (verifikasi token +
 * ambil profil) sebelum route-nya jalan. Satu halaman memanggil 6 API sekaligus, jadi
 * 12 perjalanan ke Tokyo hanya untuk auth — itu yang bikin tiap halaman menunggu lama.
 *
 * Risikonya: perubahan role baru terasa paling lama 30 detik. Entri juga tidak pernah
 * dipakai melewati masa berlaku tokennya sendiri.
 */
const TTL_MS = 30_000;
const authCache = new Map<string, { exp: number; auth: { id: string; email: string; profileId: string; role: string } }>();

/** Waktu kedaluwarsa token (detik epoch) dari payload JWT; hanya untuk membatasi umur cache. */
function tokenExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function cacheAmbil(token: string) {
  const hit = authCache.get(token);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    authCache.delete(token);
    return null;
  }
  return hit.auth;
}

function cacheSimpan(token: string, auth: { id: string; email: string; profileId: string; role: string }) {
  // Jangan pernah berlaku lebih lama dari tokennya sendiri.
  const batas = tokenExp(token);
  const exp = Math.min(Date.now() + TTL_MS, batas ?? Infinity);
  if (exp <= Date.now()) return;
  // Buang entri kedaluwarsa sesekali supaya Map tidak tumbuh terus.
  if (authCache.size > 500) {
    for (const [k, v] of authCache) if (Date.now() > v.exp) authCache.delete(k);
  }
  authCache.set(token, { exp, auth });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya proses rute /api/v1/**
  if (!pathname.startsWith('/api/v1')) {
    return NextResponse.next();
  }

  // Header konteks auth hanya boleh ditulis middleware. Buang versi kiriman klien di SEMUA rute
  // (termasuk publik) supaya route handler tidak pernah membaca identitas palsu.
  const requestHeaders = new Headers(request.headers);
  for (const h of AUTH_CONTEXT_HEADERS) requestHeaders.delete(h);

  // Cek apakah endpoint termasuk publik
  const isPublic = PUBLIC_API_ROUTES.some(
    (route) => route.path === pathname && route.method === request.method
  );

  if (isPublic) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Unauthorized: Header Authorization Bearer token diperlukan'
      },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Unauthorized: Token tidak boleh kosong'
      },
      { status: 401 }
    );
  }

  // Sudah diverifikasi baru-baru ini: lewati dua panggilan ke Supabase.
  const cached = cacheAmbil(token);
  if (cached) {
    if (pathname.startsWith('/api/v1/admin') && cached.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden: Akses ditolak, memerlukan peran admin' },
        { status: 403 }
      );
    }
    requestHeaders.set('x-auth-id', cached.id);
    requestHeaders.set('x-profile-id', cached.profileId);
    requestHeaders.set('x-user-role', cached.role);
    requestHeaders.set('x-user-email', cached.email);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  try {
    const supabase = getSupabaseAnon();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Unauthorized: Token tidak valid atau telah kedaluwarsa'
        },
        { status: 401 }
      );
    }

    // Role & profile_id SELALU dari tabel profiles (sumber kebenaran). Jangan dari app_metadata:
    // itu hanya salinan yang ditulis sync-profile dan tidak ikut berubah saat role diubah langsung
    // di database, jadi admin yang sudah dicabut masih lolos. user_metadata bahkan bisa diubah
    // pengguna sendiri. ponytail: satu query per request; bila jadi bottleneck, cache per auth id ~30 dtk.
    let role = '';
    let profileId = '';
    let lookupFailed = false;
    try {
      const { data: profile, error: profileError } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile) {
        profileId = profile.id;
        role = profile.role;
      }
    } catch {
      lookupFailed = true;
    }

    const isAdminRoute = pathname.startsWith('/api/v1/admin');

    // Fail closed: kalau role tidak bisa dipastikan, jangan beri akses admin.
    if (isAdminRoute && lookupFailed) {
      return NextResponse.json(
        { success: false, data: null, message: 'Layanan verifikasi akses sedang bermasalah. Coba lagi sebentar lagi.' },
        { status: 503 }
      );
    }

    // Belum punya profil (baru daftar) = pelanggan; profil dibuat oleh /auth/sync-profile.
    if (!role) role = 'customer';

    // Role-Based Access Control (RBAC) untuk endpoint admin
    if (isAdminRoute) {
      if (role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: 'Forbidden: Akses ditolak, memerlukan peran admin'
          },
          { status: 403 }
        );
      }
    }

    // Hanya hasil lookup yang berhasil yang disimpan; kalau gagal, request berikutnya coba lagi.
    if (!lookupFailed) {
      cacheSimpan(token, { id: user.id, email: user.email || '', profileId, role });
    }

    // Lampirkan context terverifikasi ke headers request
    requestHeaders.set('x-auth-id', user.id);
    requestHeaders.set('x-profile-id', profileId);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-email', user.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal server error saat verifikasi token: ' + (err?.message || '')
      },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: ['/api/v1/:path*']
};
