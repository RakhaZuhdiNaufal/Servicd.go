import type { Promo } from '@servicego/database';
import type { PromoDTO } from '@servicego/shared';

/** Baris tabel `promos` -> bentuk JSON yang dipakai klien (Decimal jadi number). */
export function toPromoDTO(promo: Promo): PromoDTO {
  const value = Number(promo.discount_value);
  return {
    id: promo.id,
    code: promo.code,
    title: promo.title,
    description: promo.description,
    badge: promo.badge,
    discount_type: promo.discount_type,
    discount_value: value,
    max_discount: promo.max_discount != null ? Number(promo.max_discount) : null,
    min_spend: promo.min_spend != null ? Number(promo.min_spend) : null,
    // Voucher nominal tidak punya persen; dikirim 0 supaya tampilan lama tidak salah hitung.
    discount_percent: promo.discount_type === 'persen' ? value : 0,
    quota: promo.quota,
    used_count: promo.used_count,
    per_customer_limit: promo.per_customer_limit,
    valid_from: promo.valid_from ? promo.valid_from.toISOString() : null,
    valid_until: promo.valid_until ? promo.valid_until.toISOString() : null,
    is_active: promo.is_active
  };
}
