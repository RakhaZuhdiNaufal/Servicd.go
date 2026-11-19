import {
  LayoutDashboard,
  Calendar,
  Users,
  Car,
  Wrench,
  UserCog,
  Headphones,
  Package,
  Wallet,
  Ticket,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/** Kelompok menu panel admin terstruktur. */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    group: 'Operasional',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/bookings', label: 'Booking', icon: Calendar },
      { href: '/admin/pembayaran', label: 'Pembayaran', icon: Wallet },
      { href: '/admin/support', label: 'Live Support', icon: Headphones }
    ]
  },
  {
    group: 'Pelanggan & Armada',
    items: [
      { href: '/admin/customers', label: 'Pelanggan', icon: Users },
      { href: '/admin/vehicles', label: 'Kendaraan', icon: Car }
    ]
  },
  {
    group: 'Katalog & Stok',
    items: [
      { href: '/admin/services', label: 'Layanan', icon: Wrench },
      { href: '/admin/stok', label: 'Stok Barang', icon: Package },
      { href: '/admin/voucher', label: 'Voucher', icon: Ticket }
    ]
  },
  {
    group: 'Engineering',
    items: [
      { href: '/admin/mechanics', label: 'Mekanik', icon: UserCog },
      { href: '/admin/mechanics/performance', label: 'Performa', icon: TrendingUp }
    ]
  }
];

/** Flat array seluruh menu admin untuk Command Palette (Ctrl+K). */
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
