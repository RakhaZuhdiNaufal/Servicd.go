import { z } from 'zod';
import { PHOTO_STAGE } from '../constants';

export const uploadPhotoSchema = z.object({
  stage: z.enum(PHOTO_STAGE, { errorMap: () => ({ message: 'Stage foto harus checkin atau checkout' }) }),
  caption: z.string().optional().nullable()
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
