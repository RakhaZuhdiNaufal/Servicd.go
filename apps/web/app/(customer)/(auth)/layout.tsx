import { AuthFrame } from '@/components/customer/auth-frame';

export default function CustomerAuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}