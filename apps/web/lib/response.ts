import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export function apiSuccess<T>(data: T, message = 'Berhasil', status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

export function apiError(message = 'Terjadi kesalahan', status = 400, data: any = null) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      data,
      message
    },
    { status }
  );
}
