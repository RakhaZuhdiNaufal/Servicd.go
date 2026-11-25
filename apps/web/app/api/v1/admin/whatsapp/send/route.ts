import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Normalisasi nomor HP Indonesia ke format standar internasional tanpa plus (628xxxxxxxx).
 * Contoh input:
 * - 081234567890 -> 6281234567890
 * - +62 812-3456-7890 -> 6281234567890
 * - 6281234567890 -> 6281234567890
 * - 81234567890 -> 6281234567890
 */
export function normalizeWaReceiver(phone: string): string {
  let cleaned = phone.replace(/\D/g, ''); // Hapus semua karakter non-angka

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return apiError('Hanya admin yang memiliki izin mengirim pesan WhatsApp', 403);
    }

    const body = await request.json();
    const { phone, message, receiver: manualReceiver } = body;

    const rawPhone = phone || manualReceiver;
    if (!rawPhone || typeof rawPhone !== 'string') {
      return apiError('Nomor HP tujuan (phone/receiver) wajib diisi', 422);
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return apiError('Pesan WhatsApp (message) tidak boleh kosong', 422);
    }

    const formattedReceiver = normalizeWaReceiver(rawPhone);

    // Validasi panjang nomor HP Indonesia (minimal 10 digit, maksimal 15 digit setelah awalan 62)
    if (!formattedReceiver.startsWith('62') || formattedReceiver.length < 11 || formattedReceiver.length > 16) {
      return apiError(`Format nomor telepon tidak valid: ${rawPhone}. Pastikan nomor HP aktif.`, 422);
    }

    // Ambil API Key dari Environment Variable atau gunakan default dari dashboard Moonwa
    const apiKey =
      process.env.MOONWA_API_KEY ||
      process.env.NEXT_PUBLIC_MOONWA_API_KEY ||
      '1aeed0bdae67008b7004d4e1bb7a5e873c51313a';

    // Endpoint Moonwa API
    const apiUrl =
      process.env.MOONWA_API_URL ||
      'https://api.moonwa.id/v1/send-message';

    const moonwaPayload = {
      api_key: apiKey,
      receiver: formattedReceiver,
      data: {
        message: message.trim()
      }
    };

    // Kirim request dari server Next.js ke server Moonwa (Bebas dari masalah CORS browser)
    const moonwaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moonwaPayload)
    });

    const responseText = await moonwaResponse.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!moonwaResponse.ok) {
      return apiError(
        responseData?.message || `Gagal mengirim WhatsApp via Moonwa (kode HTTP ${moonwaResponse.status})`,
        moonwaResponse.status,
        responseData
      );
    }

    return apiSuccess(
      {
        receiver: formattedReceiver,
        moonwa_response: responseData
      },
      `Pesan WhatsApp berhasil dikirim ke ${formattedReceiver} via Moonwa`
    );
  } catch (error: any) {
    return apiCatch(error, 'Terjadi kesalahan saat memproses pengiriman WhatsApp Moonwa');
  }
}
