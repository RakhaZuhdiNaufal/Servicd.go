/**
 * Bentuk data pembayaran dari GET /api/v1/bookings/[id] (tabel `payments`).
 * Dicatat kasir bengkel lewat panel admin; pelanggan hanya melihat.
 */
export interface Payment {
  id: string;
  amount: number | string;
  payment_type: 'dp' | 'pelunasan';
  method: 'tunai' | 'transfer' | 'kartu' | 'ewallet';
  status: 'pending' | 'paid' | 'failed';
  midtrans_ref: string | null;
  note: string | null;
  paid_at: string | null;
  created_at: string;
}

export const PAYMENT_TYPE: Record<Payment['payment_type'], string> = {
  dp: 'Uang muka (DP)',
  pelunasan: 'Pelunasan'
};

export const PAYMENT_METHOD: Record<Payment['method'], string> = {
  tunai: 'Tunai',
  transfer: 'Transfer bank',
  kartu: 'Kartu debit/kredit',
  ewallet: 'E-wallet'
};

export const PAYMENT_STATUS: Record<Payment['status'], string> = {
  pending: 'Menunggu pembayaran',
  paid: 'Lunas',
  failed: 'Gagal'
};

/** Total yang sudah benar-benar lunas, dipakai struk dan kartu pembayaran. */
export function sudahDibayar(payments: Payment[]) {
  return payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
}
