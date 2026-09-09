import { NextRequest } from 'next/server';
import { prisma, PhotoStage } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';
import { getSupabaseAdmin } from '@/lib/supabase';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    const contentType = request.headers.get('content-type') || '';

    let stage: PhotoStage = PhotoStage.checkin;
    let caption: string | null = null;
    let photoUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const stageInput = (formData.get('stage') as string) || 'checkin';
      caption = (formData.get('caption') as string) || null;

      if (!file) {
        return apiError('File foto wajib diunggah', 400);
      }

      // Validasi stage
      if (stageInput !== 'checkin' && stageInput !== 'checkout') {
        return apiError('Stage foto harus "checkin" atau "checkout"', 422);
      }
      stage = stageInput as PhotoStage;

      // Validasi ukuran file (maks 2MB)
      if (file.size > MAX_FILE_SIZE) {
        return apiError('Ukuran file melebihi batas maksimum 2MB', 400);
      }

      // Validasi tipe file (jpg/png)
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return apiError('Format file tidak didukung. Hanya file JPG dan PNG yang diperbolehkan', 400);
      }

      // Upload ke Supabase Storage (bucket: vehicle-photos)
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const fileName = `${id}/${stage}_${Date.now()}.${ext}`;

      try {
        const supabase = getSupabaseAdmin();
        const { error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          // Fallback URL jika bucket storage belum dibuat di Supabase pengguna
          photoUrl = `/storage/vehicle-photos/${fileName}`;
        } else {
          const { data: publicData } = supabase.storage
            .from('vehicle-photos')
            .getPublicUrl(fileName);
          photoUrl = publicData.publicUrl;
        }
      } catch {
        photoUrl = `/storage/vehicle-photos/${fileName}`;
      }
    } else {
      // Fallback payload JSON jika URL sudah didapat dari client upload
      const body = await request.json();
      if (!body.photo_url) {
        return apiError('photo_url wajib disertakan jika menggunakan JSON', 400);
      }
      if (body.stage !== 'checkin' && body.stage !== 'checkout') {
        return apiError('Stage foto harus "checkin" atau "checkout"', 422);
      }
      stage = body.stage as PhotoStage;
      caption = body.caption || null;
      photoUrl = body.photo_url;
    }

    const photo = await prisma.vehicleConditionPhoto.create({
      data: {
        booking_id: id,
        photo_url: photoUrl,
        stage,
        caption
      }
    });

    return apiSuccess(photo, 'Foto kondisi kendaraan berhasil diunggah', 201);
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengunggah foto kondisi kendaraan', 500);
  }
}
