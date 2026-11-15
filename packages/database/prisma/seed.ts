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
  // Seed menulis data contoh (profil dummy, booking contoh). Jangan pernah jalan ke produksi tanpa sengaja.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== '1') {
    throw new Error('Seed ditolak: NODE_ENV=production. Set ALLOW_SEED=1 bila benar-benar disengaja.');
  }
  console.log('Seeding database ServiceGo...');

  // 1. Branch: ServiceGo hanya punya SATU bengkel.
  const BRANCH_ID = '11111111-1111-1111-1111-111111111113';
  const branchData = {
    name: 'ServiceGo Depok',
    address: 'Jl. Margonda Raya No. 45, Beji, Kota Depok',
    phone: '021-77201234',
    capacity_per_slot: 3
  };
  const branch = await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: branchData,
    create: { id: BRANCH_ID, ...branchData }
  });

  // Migrasi data lama dari seed 5 cabang: pindahkan mekanik & booking ke bengkel ini, lalu hapus cabang lain.
  // DESTRUKTIF (mengubah data booking/mekanik nyata), jadi hanya jalan bila diminta eksplisit:
  //   SEED_CLEANUP_BRANCHES=1 pnpm prisma:seed
  if (process.env.SEED_CLEANUP_BRANCHES === '1') {
    await prisma.mechanic.updateMany({ where: { branch_id: { not: BRANCH_ID } }, data: { branch_id: BRANCH_ID } });
    await prisma.booking.updateMany({
      where: { AND: [{ branch_id: { not: null } }, { branch_id: { not: BRANCH_ID } }] },
      data: { branch_id: BRANCH_ID }
    });
    const removed = await prisma.branch.deleteMany({ where: { id: { not: BRANCH_ID } } });
    console.log(`Cabang lama dihapus: ${removed.count}.`);
  } else {
    const others = await prisma.branch.count({ where: { id: { not: BRANCH_ID } } });
    if (others > 0) {
      console.log(`Ada ${others} cabang lain; dibiarkan. Jalankan dengan SEED_CLEANUP_BRANCHES=1 untuk menggabungkannya.`);
    }
  }
  console.log(`Branch seeded: ${branch.name}.`);

  // 2. Mechanics
  const mechanic1 = await prisma.mechanic.upsert({
    where: { id: '22222222-2222-2222-2222-222222222221' },
    update: { branch_id: branch.id },
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
    update: { branch_id: branch.id },
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      branch_id: branch.id,
      full_name: 'Agus Hermawan',
      specialty: 'Rem & Kelistrikan',
      is_active: true
    }
  });
  console.log(`Mechanics created: ${mechanic1.full_name}, ${mechanic2.full_name}`);

  // 3. Services (22 services across 7 categories)
  const servicesData = [
    // Mesin & Performa
    {
      id: '33333333-3333-3333-3333-333333333301',
      name: 'Servis Rutin / Tune-up',
      description: 'Pembersihan ruang bakar, cek busi, filter udara, dan tune up performa mesin.',
      price: 250000,
      duration_minutes: 60,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333306',
      name: 'Carbon Clean / Gurah Mesin',
      description: 'Pembersihan kerak karbon ruang bakar silinder untuk memulihkan akselerasi dan efisiensi BBM.',
      price: 350000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333307',
      name: 'Pembersihan Throttle Body & Kalibrasi',
      description: 'Pembersihan katup gas throttle body dan reset sensor injeksi idle learn.',
      price: 125000,
      duration_minutes: 30,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333308',
      name: 'Overhaul Ringan & Skir Klep',
      description: 'Pembersihan kerak klep mesin, penggantian paking deksel, dan uji kompresi silinder.',
      price: 750000,
      duration_minutes: 150,
      is_active: true
    },

    // Oli & Cairan
    {
      id: '33333333-3333-3333-3333-333333333302',
      name: 'Ganti Oli Mesin + Filter',
      description: 'Penggantian oli mesin full synthetic dan filter oli baru original.',
      price: 175000,
      duration_minutes: 30,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333309',
      name: 'Kuras & Flushing Oli Transmisi Matic',
      description: 'Flushing total sirkulasi oli transmisi otomatis (ATF/CVT) dengan mesin dialiser presisi.',
      price: 300000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333310',
      name: 'Ganti Oli Gardan & Diferensial',
      description: 'Penggantian oli pelumas gardan roda belakang dengan formulasi heavy duty gear.',
      price: 130000,
      duration_minutes: 25,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333311',
      name: 'Kuras Radiator & Coolant Flush',
      description: 'Pengurasan total cairan pendingin radiator dan pengisian air pendingin radiator coolant anti-rust.',
      price: 140000,
      duration_minutes: 30,
      is_active: true
    },

    // Rem
    {
      id: '33333333-3333-3333-3333-333333333303',
      name: 'Servis Rem & Flushing Minyak Rem',
      description: 'Pembersihan kanvas rem 4 roda, cek piringan rotor, dan bleeding minyak rem DOT 4.',
      price: 150000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333312',
      name: 'Ganti Kampas Rem Depan / Belakang',
      description: 'Pemasangan kampas rem baru original, pelumasan pin kaliper, dan uji pengereman.',
      price: 180000,
      duration_minutes: 40,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333313',
      name: 'Bubut Piringan Rotor Rem (Disc)',
      description: 'Perataan permukaan piringan rem cakram bergelombang agar pengereman stabil tanpa getar.',
      price: 220000,
      duration_minutes: 60,
      is_active: true
    },

    // Kelistrikan & Aki
    {
      id: '33333333-3333-3333-3333-333333333305',
      name: 'Cek & Servis Kelistrikan / Aki',
      description: 'Diagnosa scanner OBD2 kelistrikan, uji alternator, dinamo starter, dan uji beban aki.',
      price: 120000,
      duration_minutes: 30,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333314',
      name: 'Ganti Aki Baru & Uji Dinamo Starter',
      description: 'Pemasangan aki maintenance free baru dan penyesuaian voltase pengisian alternator.',
      price: 150000,
      duration_minutes: 25,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333315',
      name: 'Instalasi & Servis Lampu LED Proyektor',
      description: 'Upgrade lampu utama headlamp projektor LED dan leveling fokus sorot cahaya malam.',
      price: 175000,
      duration_minutes: 45,
      is_active: true
    },

    // AC & Pendingin Kabin
    {
      id: '33333333-3333-3333-3333-333333333316',
      name: 'Servis AC Rutin & Fogging Kabin',
      description: 'Pembersihan blower, semprot pembersih evaporator, dan fogging antibakteri kabin mobil.',
      price: 195000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333317',
      name: 'Kuras Freon & Isi Oli Kompresor AC',
      description: 'Pengosongan vakum sirkulasi AC, pengisian freon murni R134a, dan oli kompresor dingin maksimal.',
      price: 280000,
      duration_minutes: 50,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333318',
      name: 'Ganti Filter Kabin AC (PM 2.5)',
      description: 'Penggantian filter AC kabin karbon aktif penangkal debu, polusi, dan bau tak sedap.',
      price: 95000,
      duration_minutes: 15,
      is_active: true
    },

    // Pemasangan Kaca Film & Detailing
    {
      id: '33333333-3333-3333-3333-333333333319',
      name: 'Pemasangan Kaca Film Full Kaca',
      description: 'Pemasangan kaca film tolak panas UV & Infrared 99% bergaransi 5 tahun (depan, samping, belakang).',
      price: 650000,
      duration_minutes: 120,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333320',
      name: 'Pembersihan Jamur Kaca & Water Spot',
      description: 'Poles pembersih kerak jamur kaca depan dan samping dengan lapisan repellent air hujan.',
      price: 180000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333321',
      name: 'Poles Bodi & Detailing Eksterior',
      description: 'Poles bodi 2 tahap penghilang baret halus (swirl mark), wax mengkilap dan perlindungan cat.',
      price: 450000,
      duration_minutes: 90,
      is_active: true
    },

    // Kaki-kaki & Ban
    {
      id: '33333333-3333-3333-3333-333333333304',
      name: 'Spooring & Balancing 4 Roda',
      description: 'Penyelarasan sudut roda presisi komputer 3D dan balancing bobot putaran roda.',
      price: 200000,
      duration_minutes: 45,
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333322',
      name: 'Inspeksi Kaki-kaki & Shockbreaker',
      description: 'Pemeriksaan tie rod, ball joint, karet bushing arm, dan uji kebocoran shockbreaker.',
      price: 135000,
      duration_minutes: 35,
      is_active: true
    }
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        description: s.description,
        price: s.price,
        duration_minutes: s.duration_minutes,
        is_active: s.is_active
      },
      create: s
    });
  }
  console.log(`${servicesData.length} Services created/updated successfully`);

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
    where: {
      owner_id_plate_number: {
        owner_id: customerProfile1.id,
        plate_number: 'B 1234 SG'
      }
    },
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
    where: {
      owner_id_plate_number: {
        owner_id: customerProfile2.id,
        plate_number: 'B 5678 GO'
      }
    },
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
