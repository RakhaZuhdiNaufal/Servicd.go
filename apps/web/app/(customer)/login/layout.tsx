// Customer login/register bypass CustomerShell (no auth guard — user isn't logged in yet)
export default function CustomerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {children}
    </div>
  );
}
