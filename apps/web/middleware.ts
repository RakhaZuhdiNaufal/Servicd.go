import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAnon, getSupabaseAdmin } from '@/lib/supabase';

// Daftar endpoint API publik yang tidak memerlukan autentikasi
const PUBLIC_API_ROUTES = [
  { path: '/api/v1/services', method: 'GET' },
  { path: '/api/v1/branches', method: 'GET' },
  { path: '/api/v1/bookings/available-slots', method: 'GET' },
  { path: '/api/v1/promos', method: 'GET' }
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya proses rute /api/v1/**
  if (!pathname.startsWith('/api/v1')) {
    return NextResponse.next();
  }

  // Cek apakah endpoint termasuk publik
  const isPublic = PUBLIC_API_ROUTES.some(
    (route) => route.path === pathname && route.method === request.method
  );

  if (isPublic) {
    return NextResponse.next();
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

    // Role & profile_id HANYA dari app_metadata (diisi server lewat service role).
    // user_metadata bisa diubah sendiri oleh pengguna dari browser (supabase.auth.updateUser),
    // jadi tidak boleh dipakai untuk hak akses.
    let role = (user.app_metadata?.role || '') as string;
    let profileId = (user.app_metadata?.profile_id || '') as string;

    // Jika belum ada di app_metadata, cari di tabel profiles via Supabase Admin
    if ((!profileId || !role) && pathname !== '/api/v1/auth/sync-profile') {
      try {
        const adminSupabase = getSupabaseAdmin();
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('id, role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profile) {
          profileId = profile.id;
          role = profile.role;
        }
      } catch {
        // Fallback jika database belum terhubung
      }
    }

    if (!role) role = 'customer';

    // Role-Based Access Control (RBAC) untuk endpoint admin
    if (pathname.startsWith('/api/v1/admin')) {
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

    // Lampirkan context terverifikasi ke headers request
    const requestHeaders = new Headers(request.headers);
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
