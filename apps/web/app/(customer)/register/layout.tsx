import { AuthFrame } from '@/components/customer/auth-frame';

export default function CustomerRegisterLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
