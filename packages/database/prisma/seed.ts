import { PrismaClient, UserRole, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Petunjuk untuk User:
 * Profile di tabel ini membutuhkan `auth_user_id` yang valid dari Supabase Auth (`auth.users.id`).
 *
 * Cara membuat user Supabase Auth:
 * 1. Buka Supabase Dashboard -> Authentication -> Users -> "Add User" -> "Create User"
 * 2. Buat minimal:
 *    - 1 Admin: misal admin@servicego.id
 *    - 2 Customer: misal customer1@gmail.com, customer2@gmail.com
 * 3. Copy UUID `User UID` dari dashboard Supabase dan ganti nilai `DUMMY_AUTH_ID_*` di bawah ini
 *    atau jalankan seed ini langsung dengan nilai dummy jika untuk testing relasi schema.
 */

const DUMMY_AUTH_ID_ADMIN = '00000000-0000-0000-0000-000000000001';
const DUMMY_AUTH_ID_CUSTOMER_1 = '00000000-0000-0000-0000-000000000002';
const DUMMY_AUTH_ID_CUSTOMER_2 = '00000000-0000-0000-0000-000000000003';

async function main() {
  console.log('Seeding database ServiceGo...');

  // 1. Branch
  const branch = await prisma.branch.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'ServiceGo Pusat - Kebon Jeruk',
      address: 'Jl. Raya Perjuangan No. 88, Jakarta Barat',
      phone: '021-5551234',
      capacity_per_slot: 3
    }
  });
  console.log(`Branch created: ${branch.name}`);

  // 2. Mechanics
  const mechanic1 = await prisma.mechanic.upsert({
    where: { id: '22222222-2222-2222-2222-222222222221' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222221',
      branch_id: branch.id,
      full_name: 'Budi Santoso',
      specialty: 'Mesin & Transmisi',
      is_active: true
    }
  });

  const mechanic2 = await prisma.mechanic.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      branch_id: branch.id,
      full_name: 'Agus Hermawan',
      specialty: 'Rem & Kelistrikan',
      is_active: true
    }
  });
  console.log(`Mechanics created: ${mechanic1.full_name}, ${mechanic2.full_name}`);

  // 3. Services (5 services)
  const servicesData = [
    {
      id: '33333333-3333-3333-3333-333333333301',
      name: 'Servis Rutin / Tune-up',
      description: 'Pembersihan ruang bakar, cek busi, filter udara, dan tune up performa mesin.',
      price: 250000,
      duration_minutes: 60,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333302',
      name: 'Ganti Oli Mesin + Filter',
      description: 'Penggantian oli mesin full synthetic dan filter oli baru.',
      price: 175000,
      duration_minutes: 30,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333303',
      name: 'Servis Rem & Flushing Minyak Rem',
      description: 'Pembersihan kanvas rem, cek piringan rotor, dan penggantian minyak rem.',
      price: 150000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333304',
      name: 'Spooring & Balancing 4 Roda',
      description: 'Penyelarasan sudut roda presisi komputer 3D dan balancing roda.',
      price: 200000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333305',
      name: 'Cek & Servis Kelistrikan / Aki',
      description: 'Diagnosa kelistrikan scanner OBD2, alternator, dynamo starter, dan tes beban aki.',
      price: 120000,
      duration_minutes: 30,
      is_active: true
    }
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: s
    });
  }
  console.log(`5 Services created successfully`);

  // 4. Profiles (1 admin, 2 customers)
  const adminProfile = await prisma.profile.upsert({
    where: { auth_user_id: DUMMY_AUTH_ID_ADMIN },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444401',
      auth_user_id: DUMMY_AUTH_ID_ADMIN,
      full_name: 'Admin Utama Bengkel',
      phone: '081234567890',
      email: 'admin@servicego.id',
      role: UserRole.admin
    }
  });

  const customerProfile1 = await prisma.profile.upsert({
    where: { auth_user_id: DUMMY_AUTH_ID_CUSTOMER_1 },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444402',
      auth_user_id: DUMMY_AUTH_ID_CUSTOMER_1,
      full_name: 'Hafiz Rizky',
      phone: '081298765432',
      email: 'hafiz@customer.id',
      role: UserRole.customer
    }
  });

  const customerProfile2 = await prisma.profile.upsert({
    where: { auth_user_id: DUMMY_AUTH_ID_CUSTOMER_2 },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444403',
      auth_user_id: DUMMY_AUTH_ID_CUSTOMER_2,
      full_name: 'Dewi Lestari',
      phone: '081311223344',
      email: 'dewi@customer.id',
      role: UserRole.customer
    }
  });
  console.log(`Profiles created: Admin (${adminProfile.full_name}), Customer 1 (${customerProfile1.full_name}), Customer 2 (${customerProfile2.full_name})`);

  // 5. Sample Vehicles for customers
  await prisma.vehicle.upsert({
    where: { plate_number: 'B 1234 SG' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555501',
      owner_id: customerProfile1.id,
      plate_number: 'B 1234 SG',
      brand: 'Honda',
      model: 'HR-V 1.5 SE',
      year: 2022,
      vehicle_type: VehicleType.mobil,
      last_odometer_km: 24500
    }
  });

  await prisma.vehicle.upsert({
    where: { plate_number: 'B 5678 GO' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555502',
      owner_id: customerProfile2.id,
      plate_number: 'B 5678 GO',
      brand: 'Yamaha',
      model: 'NMAX 155',
      year: 2023,
      vehicle_type: VehicleType.motor,
      last_odometer_km: 8200
    }
  });
  console.log(`Sample vehicles created`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
