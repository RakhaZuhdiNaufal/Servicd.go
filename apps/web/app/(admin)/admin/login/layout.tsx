// Halaman login admin: AdminShell melewatkan rute ini apa adanya (tanpa sidebar dan tanpa auth guard).
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
