import { prisma } from '@servicego/database';

export interface AuthUser {
  profileId: string;
  authId: string;
  role: 'admin' | 'customer';
  email: string;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const authId = request.headers.get('x-auth-id');
  if (!authId) return null;

  let profileId = request.headers.get('x-profile-id') || '';
  let role = (request.headers.get('x-user-role') as 'admin' | 'customer') || 'customer';
  const email = request.headers.get('x-user-email') || '';

  if (!profileId) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { auth_user_id: authId }
      });
      if (profile) {
        profileId = profile.id;
        role = profile.role as 'admin' | 'customer';
      }
    } catch {
      // Ignore if DB is not reached
    }
  }

  return {
    profileId,
    authId,
    role,
    email
  };
}
