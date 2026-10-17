import { AuthFrame } from '@/components/customer/auth-frame';

export default function CustomerLoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
