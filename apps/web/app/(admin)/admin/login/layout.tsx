// Admin login uses the root layout directly — no AdminShell, no auth guard
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
