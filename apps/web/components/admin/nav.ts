import { LayoutDashboard, Calendar, Users, Car, Wrench, UserCog, Headphones } from 'lucide-react';

/** Menu panel admin. Dipakai sidebar dan pencarian Ctrl+K. */
export const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Booking', icon: Calendar },
  { href: '/admin/support', label: 'Live Support', icon: Headphones },
  { href: '/admin/customers', label: 'Pelanggan', icon: Users },
  { href: '/admin/vehicles', label: 'Kendaraan', icon: Car },
  { href: '/admin/services', label: 'Layanan', icon: Wrench },
  { href: '/admin/mechanics', label: 'Mekanik', icon: UserCog }
];
