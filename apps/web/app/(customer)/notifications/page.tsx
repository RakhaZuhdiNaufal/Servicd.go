'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Bookmark,
  BookmarkCheck,
  Clock,
  Play,
  Share2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  X,
  Search,
  Sparkles,
  Tag,
  Eye,
  Send,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

/* ─── DATA MODELS ─── */
interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: 'Mesin' | 'Rem & Kaki-kaki' | 'Oli & Pelumas' | 'Kelistrikan & AC' | 'Regulasi';
  image: string;
  readTime: string;
  timeAgo: string;
  author: {
    name: string;
    role: string;
  };
  views: string;
  isTrending?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  relatedService?: {
    name: string;
    description: string;
  };
  content: {
    summary: string;
    keyPoints: string[];
    bodyParagraphs: string[];
    mechanicNote: string;
  };
}

interface VideoGuide {
  id: string;
  title: string;
  duration: string;
  views: string;
  category: string;
  thumbnail: string;
  instructor: string;
  description: string;
}

/* ─── DATA SEED ─── */
const FEATURED_HERO_STORIES: Article[] = [
  {
    id: 'hero-1',
    title: '5 Tanda Kritis Oli Transmisi Mulai Habis Sebelum Kerusakan Fatal Gearbox',
    excerpt: 'Kenali gejala getaran mesin saat idle, bau hangus dari transmisi, dan keterlambatan respon akselerasi sebelum gearbox membutuhkan overhaul puluhan juta.',
    category: 'Oli & Pelumas',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    readTime: '4 mnt baca',
    timeAgo: '10 mnt lalu',
    author: {
      name: 'Bambang Supriyanto',
      role: 'Master Technician ServiceGo'
    },
    views: '18.4k',
    isHot: true,
    isTrending: true,
    relatedService: {
      name: 'Kuras & Ganti Oli Transmisi (Manual & Matic)',
      description: 'Layanan kuras total oli transmisi dengan ATF changer presisi.'
    },
    content: {
      summary: 'Oli transmisi berfungsi melumasi gear, mendinginkan gesekan, dan mentransfer tenaga hidrolik pada transmisi otomatis. Mengabaikan kondisinya berisiko merusak solenoid valve dan kampas kopling transmisi.',
      keyPoints: [
        'Transmisi terasa menyentak (jerking) saat perpindahan tuas dari P ke D atau R',
        'Suara dengungan (whining noise) halus saat mobil melaju pada kecepatan sedang',
        'Warna oli berubah menjadi cokelat pekat atau kehitaman dengan aroma gosong',
        'Mobil terasa kehilangan tenaga dan putaran mesin (RPM) tinggi tanpa akselerasi seimbang'
      ],
      bodyParagraphs: [
        'Banyak pemilik mobil mengira oli transmisi hanya perlu diperiksa saat kilometer tinggi. Padahal, kondisi lalu lintas stop-and-go di perkotaan membuat oli transmisi bekerja pada temperatur tinggi secara terus-menerus.',
        'Jika oli sudah terdegradasi, partikel gram besi halus akan tersirkulasi dan mengikis valve body. Melakukan flushing atau kuras oli setiap 20.000–40.000 KM adalah investasi pencegahan paling bijak dibandingkan biaya turun matic.'
      ],
      mechanicNote: 'Selalu gunakan spesifikasi oli transmisi yang sesuai rekomendasi buku manual kendaraan (misal ATF WS, CVT FE, atau GL-4).'
    }
  },
  {
    id: 'hero-2',
    title: 'Aturan Razia & Uji Emisi Jakarta 2026: Syarat Lolos Serta Sanksi Denda Terbaru',
    excerpt: 'Pemerintah daerah memperketat regulasi kelayakan gas buang kendaraan roda dua dan roda empat. Pelajari komponen apa saja yang wajib dicek di bengkel.',
    category: 'Regulasi',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    readTime: '3 mnt baca',
    timeAgo: '25 mnt lalu',
    author: {
      name: 'Tim Regulasi ServiceGo',
      role: 'Analisis Kebijakan Otomotif'
    },
    views: '24.1k',
    isHot: true,
    relatedService: {
      name: 'Uji Emisi & Tune Up Injeksi Ramah Lingkungan',
      description: 'Pembersihan ruang bakar dan sertifikasi uji emisi terintegrasi.'
    },
    content: {
      summary: 'Uji emisi mengukur kadar karbon monoksida (CO) dan hidrokarbon (HC). Kendaraan yang rutin servis berkala dan filter udara bersih memiliki tingkat kelulusan 98%.',
      keyPoints: [
        'Batas maksimal CO untuk mobil bensin injeksi pasca 2007 adalah 1.0% dan HC 150 ppm',
        'Penyebab umum gagal uji emisi: busi aus, catalytic converter tersumbat, dan filter udara kotor',
        'Data hasil uji emisi langsung tersinkronisasi ke aplikasi uji emisi resmi pemerintah daerah'
      ],
      bodyParagraphs: [
        'Sebelum melakukan pengujian resmi, pemilik kendaraan disarankan melakukan tune-up ringan untuk memastikan ruang pembakaran bersih dan pembakaran bahan bakar berjalan sempurna.'
      ],
      mechanicNote: 'Gunakan bahan bakar dengan oktan sesuai rasio kompresi mesin Anda untuk mengurangi deposit jelaga pada busi.'
    }
  },
  {
    id: 'hero-3',
    title: 'Beda Gejala Aki Lemah vs Dinamo Starter Rusak Saat Mobil Susah Dinyalakan',
    excerpt: 'Jangan buru-buru ganti aki baru! Seringkali masalah mesin tidak mau berputar berasal dari carbon brush dinamo starter atau klem terminal yang kendor.',
    category: 'Kelistrikan & AC',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
    readTime: '5 mnt baca',
    timeAgo: '1 jam lalu',
    author: {
      name: 'Rian Santoso',
      role: 'Spesialis Kelistrikan Otomotif'
    },
    views: '15.9k',
    isTrending: true,
    relatedService: {
      name: 'Pemeriksaan Sistem Kelistrikan & Aki',
      description: 'Tes beban tegangan aki, alternator charger, dan dinamo starter.'
    },
    content: {
      summary: 'Mengetahui perbedaan aki soak dan dinamo starter rusak bisa menghemat waktu Anda di jalan dan mencegah penggantian komponen yang sebetulnya masih prima.',
      keyPoints: [
        'Jika lampu indikator redup saat kunci diputar ke kontak ON, curigai voltase aki di bawah 11.8V',
        'Jika klakson kencang dan lampu terang namun mesin hanya bunyi "cetuk-cetuk", dinamo starter kemungkinan macet',
        'Periksa kerak putih pada kutub positif aki yang menghambat hantaran arus listrik'
      ],
      bodyParagraphs: [
        'Dinamo starter memiliki komponen bernama carbon brush dan solenoid switch yang memiliki batas usia pakai sekitar 80.000 KM.',
        'Servis dinamo starter umumnya hanya memerlukan pembersihan komutator dan penggantian arang starter dengan biaya jauh lebih ekonomis.'
      ],
      mechanicNote: 'Jika mobil manual mogok starter darurat, Anda bisa memanfaatkan dorongan gigi 2. Namun jangan diterapkan pada transmisi matic!'
    }
  }
];

const SIDE_FEATURED_STORIES: Article[] = [
  {
    id: 'side-1',
    title: 'Panduan Waktu Ganti Minyak Rem & Tanda Minyak Rem Sudah Keruh Terkontaminasi',
    excerpt: 'Titik didih minyak rem yang menurun akibat uap air dapat memicu rem blong (vapour lock) saat turunan panjang.',
    category: 'Rem & Kaki-kaki',
    image: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '30 mnt lalu',
    author: { name: 'Hadi Prasetyo', role: 'Teknisi Kaki-kaki' },
    views: '11.2k',
    isTrending: true,
    relatedService: {
      name: 'Bleeding & Kuras Minyak Rem DOT 3 / 4',
      description: 'Pembersihan udara palsu dan penggantian total minyak rem.'
    },
    content: {
      summary: 'Minyak rem bersifat higroskopis (menyerap uap air). Bila kadar air di atas 3%, titik didih minyak rem anjlok drastis.',
      keyPoints: [
        'Ganti minyak rem setiap 20.000 KM atau maksimal 2 tahun sekali',
        'Pedal rem terasa empuk atau ambles saat diinjak berulang kali',
        'Warna minyak rem berubah dari bening kekuningan menjadi keruh kecokelatan'
      ],
      bodyParagraphs: [
        'Pada saat melintasi jalur pegunungan atau turunan terjal, kaliper rem menghasilkan panas ekstrem yang bisa mendidihkan air di dalam selang rem.',
        'Saat air mendidih, terbentuk gelembung udara yang membuat tekanan pedal rem kosong.'
      ],
      mechanicNote: 'Jangan mencampur minyak rem beda DOT (misal DOT 3 dicampur DOT 5 berbasis silikon) karena merusak sil karet kaliper.'
    }
  },
  {
    id: 'side-2',
    title: 'Penyebab Bau Apek & Angin AC Kurang Dingin: Filter Kabin atau Evaporator?',
    excerpt: 'Sebelum memutuskan tambah freon, pastikan filter kabin tidak dipenuhi debu mikro dan jamur lembap.',
    category: 'Kelistrikan & AC',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '2 jam lalu',
    author: { name: 'Dicky Kurnia', role: 'AC Specialist' },
    views: '13.5k',
    relatedService: {
      name: 'Servis AC & Fogging Anti-Bakteri',
      description: 'Pembersihan blower, evaporator, ganti filter kabin PM 2.5.'
    },
    content: {
      summary: 'AC mobil yang bau apek disebabkan oleh berkembangnya spora jamur pada permukaan kisi-kisi evaporator yang lembap.',
      keyPoints: [
        'Filter kabin idealnya diganti tiap 10.000 KM untuk menjaga kesehatan saluran pernapasan',
        'Freon tidak akan pernah habis kecuali terdapat kebocoran pada pipa sambungan O-ring',
        'Nyalakan blower maksimal tanpa AC selama 2 menit sebelum mematikan mesin mobil'
      ],
      bodyParagraphs: [
        'Langkah sederhana mematikan tombol AC beberapa menit sebelum sampai di tujuan membantu mengeringkan embun di dalam boks evaporator sehingga jamur tidak mudah berkembang biak.'
      ],
      mechanicNote: 'Gunakan filter kabin dengan lapisan karbon aktif jika Anda sering berkendara di daerah berasap dan berdebu tebal.'
    }
  }
];

const MAIN_ARTICLE_LIST: Article[] = [
  {
    id: 'art-1',
    title: 'Tips Merawat Ban Mobil Agar Tidak Aus Sebelah & Hemat Konsumsi BBM',
    excerpt: 'Rotasi ban berkala setiap 10.000 KM dan spooring balancing menjaga stabilitas laju kendaraan di jalan tol.',
    category: 'Rem & Kaki-kaki',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '45 mnt lalu',
    author: { name: 'Agus Subekti', role: 'Wheel Alignment Specialist' },
    views: '9.4k',
    isTrending: true,
    relatedService: {
      name: 'Spooring, Balancing & Rotasi Ban 4 Roda',
      description: 'Penyelarasan sudut roda camber, caster, toe untuk keausan ban merata.'
    },
    content: {
      summary: 'Tekanan angin ban yang kurang 5 PSI saja dapat meningkatkan hambatan gulir (rolling resistance) dan boros bahan bakar hingga 8%.',
      keyPoints: [
        'Lakukan rotasi ban secara menyilang sesuai petunjuk arah rotasi (rotational arrow)',
        'Cek tekanan ban minimal 2 minggu sekali saat ban dalam kondisi dingin',
        'Waspadai getaran pada setir di kecepatan 80–100 km/jam tanda ban butuh balancing'
      ],
      bodyParagraphs: [
        'Spooring menjaga agar keempat roda mobil berada dalam sudut simetris terhadap sumbu sasis. Kaki-kaki yang melenceng membuat mobil cenderung membuang ke kiri atau ke kanan.'
      ],
      mechanicNote: 'Lihat stiker tekanan angin ideal yang tertempel pada pilar B pintu pengemudi.'
    }
  },
  {
    id: 'art-2',
    title: 'Penyebab Mesin Cepat Panas (Overheat) Saat Macet: Radiator atau Extra Fan?',
    excerpt: 'Kipas pendingin (extra fan) yang melemah seringkali tidak terdengar saat macet, memicu suhu air radiator mendidih.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=800&q=80',
    readTime: '5 mnt baca',
    timeAgo: '1 jam lalu',
    author: { name: 'Maman Sudrajat', role: 'Cooling System Tech' },
    views: '16.7k',
    isHot: true,
    relatedService: {
      name: 'Kuras Radiator Coolant & Cek Termostat',
      description: 'Penggantian cairan radiator anti-karat dan uji tekanan tutup radiator.'
    },
    content: {
      summary: 'Sistem pendingin mesin modern mengandalkan sirkulasi coolant, termostat pembuka katup, dan putaran motor extra fan.',
      keyPoints: [
        'Jangan pernah membuka tutup radiator saat jarum temperatur berada di tengah atau panas',
        'Gunakan selalu air radiator coolant berstandar OEM, hindari mengisi air keran yang mengandung mineral kapur',
        'Termostat yang macet dalam posisi tertutup akan menghambat aliran air dingin dari radiator ke blok silinder'
      ],
      bodyParagraphs: [
        'Air mineral biasa akan memicu kerak karat pada pipa saluran air radiator dalam hitungan bulan, menyebabkan kebocoran halus pada tabung kisi radiator.'
      ],
      mechanicNote: 'Bawa cadangan 1 botol coolant siap pakai (pre-mixed) di dalam bagasi untuk situasi darurat.'
    }
  },
  {
    id: 'art-3',
    title: 'Waspada Karat Kolong Mobil Pasca Musim Hujan: Perlukah Anti-Karat Tambahan?',
    excerpt: 'Cairan asam air hujan dan genangan air berlumpur mempercepat korosi pada gardan, knalpot, dan sasis monokok.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '2 jam lalu',
    author: { name: 'Yudha Pratama', role: 'Body & Chassis Tech' },
    views: '8.1k',
    isNew: true,
    relatedService: {
      name: 'Cuci Kolong Hidrolik & Pelapisan Anti-Karat',
      description: 'Pembersihan sasis bawah dan aplikasi lapisan aspal elastomer protektif.'
    },
    content: {
      summary: 'Pencegahan korosi sejak dini jauh lebih murah daripada mereparasi pelat sasis keropos yang merusak struktur keselamatan benturan.',
      keyPoints: [
        'Bilas kolong mobil sesegera mungkin setelah menerjang genangan air hujan atau banjir rob',
        'Perhatikan engsel pintu dan karet pintu yang sering menahan sisa kelembapan air',
        'Aplikasi anti-karat berbahan elastomer dapat meredam kebisingan kabin jalan tol'
      ],
      bodyParagraphs: [
        'Banyak mobil modern sudah memiliki lapisan galvanis dari pabrikan, namun benturan batu kerikil di kolong dapat mengelupas lapisan tersebut.'
      ],
      mechanicNote: 'Hindari menyemprot solar pada karet bushing kolong karena membuat karet melar dan getas.'
    }
  },
  {
    id: 'art-4',
    title: 'Merawat Motor Matic: Gejala V-Belt Mulai Retak & Kampas Ganda Gredek',
    excerpt: 'Suara getaran kasar saat tarikan awal motor matic biasanya berasal dari mangkok kopling kotor dan karet damper aus.',
    category: 'Rem & Kaki-kaki',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '3 jam lalu',
    author: { name: 'Rahmat Hidayat', role: 'CVT Specialist' },
    views: '14.8k',
    isTrending: true,
    relatedService: {
      name: 'Servis CVT Lengkap & Ganti V-Belt',
      description: 'Pembersihan debu kampas ganda, pelumasan roller & sliding sheave.'
    },
    content: {
      summary: 'CVT motor matic membutuhkan perawatan berkala setiap 8.000 KM untuk menjaga tarikan tetap halus dan konsumsi BBM optimal.',
      keyPoints: [
        'V-Belt wajib diganti maksimal pada 24.000 KM sebelum putus tiba-tiba di jalan',
        'Sensasi gredek pada RPM rendah disebabkan oleh debu gesekan kampas ganda',
        'Roller CVT yang sudah peang mengurangi kecepatan puncak (top speed)'
      ],
      bodyParagraphs: [
        'Membersihkan ruang CVT secara berkala mencegah penumpukan kotoran yang dapat mengikis dinding pulley depan dan belakang.'
      ],
      mechanicNote: 'Gunakan selalu grease/gemuk khusus bertemperatur tinggi (high-temp grease) untuk bagian CVT.'
    }
  },
  {
    id: 'art-5',
    title: 'Panduan Tune-Up Mesin Bensin: Kapan Harus Gurah Mesin & Carbon Clean?',
    excerpt: 'Deposit kerak karbon pada kepala piston memicu knocking (ngelitik), boros BBM, dan penurunan tenaga saat nanjak.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '4 jam lalu',
    author: { name: 'Bambang Supriyanto', role: 'Master Technician' },
    views: '19.2k',
    isHot: true,
    relatedService: {
      name: 'Tune Up Total & Carbon Clean Ruang Bakar',
      description: 'Pembersihan ruang bakar dengan cairan foam kimiawi khusus tanpa bongkar mesin.'
    },
    content: {
      summary: 'Gurah mesin (carbon cleaning) membersihkan kerak hitam sisa pembakaran yang menempel pada payung klep dan ruang kompresi.',
      keyPoints: [
        'Mesin menggelitik saat pedal gas diinjak di tanjakan adalah tanda rasio kompresi terganggu kerak',
        'Carbon clean efektif mengembalikan kompresi standar pabrikan',
        'Penggantian busi iridium sebaiknya dilakukan bersamaan dengan tune-up berkala'
      ],
      bodyParagraphs: [
        'Bahan bakar dengan oktan rendah lebih cepat meninggalkan endapan karbon pada ruang bakar mesin modern yang berasio kompresi tinggi di atas 10.5:1.'
      ],
      mechanicNote: 'Lakukan penggantian oli mesin setelah proses gurah mesin untuk memastikan sisa residu kimiawi terbuang tuntas.'
    }
  },
  {
    id: 'art-6',
    title: 'Mengenal Perbedaan Oli Mesin Full Sintetis, Semi Sintetis, dan Mineral',
    excerpt: 'Memahami kode viskositas SAE dan standar API Service agar mesin mobil Anda terlindungi maksimal dalam jangka panjang.',
    category: 'Oli & Pelumas',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    readTime: '5 mnt baca',
    timeAgo: '5 jam lalu',
    author: { name: 'Dendy Firmansyah', role: 'Lubricant Engineer' },
    views: '22.0k',
    isTrending: true,
    relatedService: {
      name: 'Paket Ganti Oli Mesin Full Synthetic',
      description: 'Oli mesin grade terbaik + penggantian filter oli original.'
    },
    content: {
      summary: 'Oli full sintetis memiliki molekul yang lebih seragam dan tahan terhadap oksidasi panas tinggi dibanding oli mineral.',
      keyPoints: [
        'Oli full sintetis mampu bertahan hingga 10.000 KM atau 6 bulan pemakaian',
        'Viskositas encer seperti 0W-20 cocok untuk mesin generasi modern dengan celah komponen sangat rapat',
        'Pastikan selalu mengganti filter oli setiap kali ganti oli mesin'
      ],
      bodyParagraphs: [
        'Oli mesin ibarat darah bagi kendaraan. Oli berkualitas tidak hanya melumasi, tapi juga menyerap panas dan mengikat kotoran gram ke filter oli.'
      ],
      mechanicNote: 'Jangan tergoda oli murah tanpa segel barcode resmi yang berisiko merupakan oli oplosan.'
    }
  },
  {
    id: 'art-7',
    title: 'Penyebab Shockbreaker Bocor & Bunyi Jedug Saat Melibas Polisi Tidur',
    excerpt: 'Oli rembes pada tabung strut dan karet stopper getas membuat bantingan mobil keras dan limbung di kecepatan tinggi.',
    category: 'Rem & Kaki-kaki',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '6 jam lalu',
    author: { name: 'Hadi Prasetyo', role: 'Teknisi Kaki-kaki' },
    views: '10.3k',
    isTrending: true,
    relatedService: {
      name: 'Penggantian Shockbreaker & Link Stabilizer',
      description: 'Pemeriksaan suspensi depan-belakang, peredam kejut dan bushing arm.'
    },
    content: {
      summary: 'Shockbreaker yang bocor kehilangan gaya redam rebound, menyebabkan ban memantul liar dan memperpanjang jarak pengereman.',
      keyPoints: [
        'Perhatikan rembesan oli basah yang mengikat debu tebal pada as shockbreaker',
        'Mobil mengayun lebih dari dua kali saat ditekan lalu dilepas di bagian pojok fender',
        'Keausan ban tidak merata berbentuk bopeng (cupping) akibat ban tidak menapak konstan'
      ],
      bodyParagraphs: [
        'Kerusakan shockbreaker sering kali dipicu oleh robeknya karet boot penutup debu. Debu pasir yang masuk menggores batang piston baja sehingga sil oli robek.'
      ],
      mechanicNote: 'Selalu ganti shockbreaker secara berpasangan (kiri dan kanan) agar kestabilan mobil seimbang.'
    }
  },
  {
    id: 'art-8',
    title: 'Lampu Indikator Check Engine Menyala: Apakah Masih Aman Dikendarai?',
    excerpt: 'Ketahui beda indikator berkedip (bahaya darurat) dan menyala konstan akibat sensor O2 atau tutup bensin kurang rapat.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    readTime: '5 mnt baca',
    timeAgo: '7 jam lalu',
    author: { name: 'Bambang Supriyanto', role: 'Master Technician' },
    views: '27.6k',
    isHot: true,
    relatedService: {
      name: 'Scanner Komputer OBD-II & Diagnosa Mesin',
      description: 'Pembacaan Diagnostic Trouble Codes (DTC) dan reset sensor sistem injeksi.'
    },
    content: {
      summary: 'Lampu check engine (MIL) memberi sinyal peringatan bahwa ECU mendeteksi parameter operasional mesin di luar batas toleransi normal.',
      keyPoints: [
        'Jika indikator menyala konstan tanpa gejala mogok, Anda masih bisa melaju ke bengkel terdekat',
        'Jika indikator BERKEDIP, segera menepi dan matikan mesin karena terjadi misfire parah yang merusak catalytic converter',
        'Penyebab paling sepele: tutup tangki bensin yang tidak terpasang hingga berbunyi klik'
      ],
      bodyParagraphs: [
        'Sensor oksigen dan catalytic converter adalah komponen paling sering memicu kode DTC P0420. Pemindaian scanner OBD-II adalah langkah pertama yang paling akurat.'
      ],
      mechanicNote: 'Jangan asal mencabut kutub aki untuk mematikan check engine tanpa memperbaiki sumber kerusakannya.'
    }
  },
  {
    id: 'art-9',
    title: 'Penyebab Tarikan Mobil Berat & Boros Bensin: Busi Aus atau Throttle Body Kotor?',
    excerpt: 'Tumpukan residu jelaga di katup throttle menghambat pasokan udara segar ke intake manifold sehingga respon pedal gas lemot.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '8 jam lalu',
    author: { name: 'Maman Sudrajat', role: 'Engine Tuner' },
    views: '14.1k',
    relatedService: {
      name: 'Pembersihan Throttle Body & Kalibrasi Sensor TPS',
      description: 'Pembersihan kupu-kupu katup gas dan relearn idle RPM komputer.'
    },
    content: {
      summary: 'Kombinasi busi yang sudah aus celahnya (gap melebar) dan throttle body kotor membuat pembakaran bensin tidak sempurna.',
      keyPoints: [
        'RPM mesin drop atau bergetar saat menyalakan kompresor AC saat idle',
        'Jarak celah elektroda busi standar adalah 0.8mm – 1.1mm tergantung jenis busi nikel/iridium',
        'Pembersihan throttle body pada mobil Drive-By-Wire (DBW) membutuhkan kehati-hatian agar sensor servo tidak error'
      ],
      bodyParagraphs: [
        'Uap oli dari selang PCV (Positive Crankcase Ventilation) secara alami mengembun di intake dan membentuk jelaga hitam lengket di sekeliling bilah throttle.'
      ],
      mechanicNote: 'Gunakan throttle cleaner yang aman untuk sensor (sensor-safe) tanpa merusak lapisan teflon seal di tepi katup gas.'
    }
  },
  {
    id: 'art-10',
    title: 'Panduan Merawat Aki Basah vs Aki Kering (MF): Tips Agar Awet Lebih dari 2 Tahun',
    excerpt: 'Pengecekan level air aki demineralisasi secara rutin dan menjaga voltase alternator tetap stabil di 13.8V - 14.4V.',
    category: 'Kelistrikan & AC',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '9 jam lalu',
    author: { name: 'Rian Santoso', role: 'Spesialis Kelistrikan' },
    views: '12.4k',
    isNew: true,
    relatedService: {
      name: 'Uji Beban Aki & Cek Dinamo Alternator',
      description: 'Pengukuran voltase cranking drop dan efisiensi pengisian dinamo ampere.'
    },
    content: {
      summary: 'Aki bebas perawatan (Maintenance Free / MF) tetap membutuhkan alternator yang sehat agar sel timbal kalsium di dalamnya tidak kering terpanggang panas mesin.',
      keyPoints: [
        'Aki basah wajib ditambah air aki botol biru (air suling murni), BUKAN botol merah (air zuur asam sulfat)',
        'Voltase aki saat mesin mati idealnya 12.4V – 12.7V. Bila di bawah 12V, sel mulai mengalami sulfasi',
        'Bersihkan serbuk putih di kutub aki dengan air panas dan oleskan gemuk tipis untuk mencegah oksidasi'
      ],
      bodyParagraphs: [
        'Penyebab utama aki MF drop sebelum waktunya adalah mobil jarang dipanaskan atau adanya arus bocor (parasitic draw) dari aksesoris alarm/audio non-standar.'
      ],
      mechanicNote: 'Jika mobil ditinggal lebih dari 2 minggu, cabut terminal negatif aki untuk mencegah aki drop total.'
    }
  },
  {
    id: 'art-11',
    title: 'Kapan Waktu Tepat Kuras Oli Gardan & Minyak Transmisi Manual?',
    excerpt: 'Gesekan gear diferensial menghasilkan gram halus yang jika dibiarkan dapat merusak gigi nanas (crown wheel & pinion).',
    category: 'Oli & Pelumas',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '10 jam lalu',
    author: { name: 'Dendy Firmansyah', role: 'Lubricant Engineer' },
    views: '8.9k',
    relatedService: {
      name: 'Ganti Oli Gardan & Transmisi GL-5 SAE 90/140',
      description: 'Penggantian oli transmisi manual & gardan belakang dengan pelumas heavy-duty.'
    },
    content: {
      summary: 'Oli gardan bekerja di bawah tekanan gesek ekstrem (hypoid gear) dan suhu tinggi tanpa bantuan pompa pendingin.',
      keyPoints: [
        'Ganti oli gardan setiap 20.000 KM atau 1 tahun sekali',
        'Gunakan standar API GL-5 untuk gardan belakang, dan API GL-4 untuk transmisi manual agar tidak mengikis sincronizer kuningan',
        'Suara mendengung keras dari kolong belakang saat kecepatan 60 km/jam adalah tanda gigi gardan sudah aus'
      ],
      bodyParagraphs: [
        'Oli gardan yang jarang diganti akan berubah warna menjadi hitam pekat berbau gosong menusuk dan kehilangan viskositas pelindung gigi.'
      ],
      mechanicNote: 'Periksa juga lubang pernapasan (breather valve) di atas gardan agar tidak mampet dan membuat sil roda bocor.'
    }
  },
  {
    id: 'art-12',
    title: 'Aturan Kaca Film Kendaraan Menurut Dishub: Tingkat Kegelapan Legal & Aman',
    excerpt: 'Standar VLT (Visible Light Transmission) kaca depan maksimal 40% dan samping 60% demi visibilitas malam hari.',
    category: 'Regulasi',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '11 jam lalu',
    author: { name: 'Tim Regulasi ServiceGo', role: 'Legal & Safety Officer' },
    views: '16.5k',
    relatedService: {
      name: 'Pemasangan Kaca Film Nano Ceramic Tolak Panas',
      description: 'Kaca film tolak sinar UV 99% dan infra merah tanpa mengganggu sinyal GPS.'
    },
    content: {
      summary: 'Memilih kaca film tidak sekadar mencari privasi yang gelap pekat, namun harus mempertimbangkan faktor keselamatan berkendara di malam hari dan saat hujan lebat.',
      keyPoints: [
        'Kaca depan disarankan memiliki kegelapan maksimal 40% (VLT minimal 35%-40%)',
        'Kaca film ceramic modern mampu menolak panas matahari hingga 90% meski dengan tingkat kegelapan yang relatif terang',
        'Kaca film yang terlalu gelap di kaca depan meningkatkan risiko kecelakaan saat bermanuver di jalan minim penerangan'
      ],
      bodyParagraphs: [
        'Kaca film berkualitas tinggi dilengkapi pelindung tolak sinar ultraviolet (UV400) yang melindungi dashboard dan jok kulit dari keretakan akibat radiasi matahari.'
      ],
      mechanicNote: 'Hindari membersihkan kaca film dengan cairan pembersih kaca yang mengandung amonia karena dapat memicu gelembung udara.'
    }
  },
  {
    id: 'art-13',
    title: 'AC Mobil Tidak Dingin Saat Siang Hari: Gejala Kondensor Tersumbat & Fan Lemah',
    excerpt: 'Debu dan kerikil yang menempel pada sirip kondensor menghambat pelepasan panas freon bertekanan tinggi.',
    category: 'Kelistrikan & AC',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '12 jam lalu',
    author: { name: 'Dicky Kurnia', role: 'AC Specialist' },
    views: '11.8k',
    relatedService: {
      name: 'Flushing AC & Cuci Kondensor High Pressure',
      description: 'Pembersihan kisi kondensor dan pemulihan sirkulasi freon R134a.'
    },
    content: {
      summary: 'Kondisi AC yang dingin di malam hari tapi hanya keluar angin panas di siang terik biasanya dipicu oleh kondensor yang gagal melepas kalor temperatur tinggi.',
      keyPoints: [
        'Kondensor terletak tepat di depan radiator dan mudah tertutup serangga atau lumpur kering',
        'Extra fan pendingin yang putarannya melambat membuat tekanan pipa discharge naik melebihi batas aman',
        'Katup ekspansi yang mulai tersumbat menghasilkan pengabutan freon yang tidak optimal'
      ],
      bodyParagraphs: [
        'Mencuci kondensor secara berkala dengan semprotan air bertekanan sedang (jangan terlalu keras agar sirip aluminium tidak tertekuk) sangat membantu menjaga efisiensi kompresor AC.'
      ],
      mechanicNote: 'Jika kompresor mengeluarkan bunyi dengung berat saat cuaca panas, segera matikan tombol A/C untuk mencegah kompresor jebol.'
    }
  },
  {
    id: 'art-14',
    title: 'Mitos vs Fakta Engine Flush: Kapan Wajib Dilakukan Saat Ganti Oli?',
    excerpt: 'Cairan engine flush melarutkan lumpur oli (oil sludge) sebelum pengisian oli baru pada kendaraan yang sering terjebak macet.',
    category: 'Oli & Pelumas',
    image: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '13 jam lalu',
    author: { name: 'Bambang Supriyanto', role: 'Master Technician' },
    views: '13.9k',
    relatedService: {
      name: 'Flushing Oli Mesin & Kuras Bak Carter',
      description: 'Pembersihan endapan kerak oli lama sebelum pengisian oli baru.'
    },
    content: {
      summary: 'Engine flush adalah cairan pelarut berformula deterjen aktif yang dicampurkan ke oli lama sesaat sebelum oli dibuang tuntas.',
      keyPoints: [
        'Disarankan dilakukan setiap 2-3 kali periode ganti oli untuk mobil yang sering stop-and-go di perkotaan',
        'Jangan pernah menjalankan mobil atau menginjak gas tinggi saat cairan flush sedang bekerja dalam kondisi idle',
        'Sangat direkomendasikan saat Anda beralih dari merk oli atau spesifikasi viskositas yang berbeda'
      ],
      bodyParagraphs: [
        'Endapan jelaga dan varnish oli lama yang tertinggal di celah ring piston dapat mengurangi performa oli baru yang baru saja Anda tuangkan.'
      ],
      mechanicNote: 'Pastikan mesin hanya dibiarkan menyala idle selama 10–15 menit sesuai instruksi botol flush sebelum baut karter dibuka.'
    }
  },
  {
    id: 'art-15',
    title: 'Aturan Pajak Progresif Kendaraan & Cara Blokir STNK Kendaraan yang Sudah Terjual',
    excerpt: 'Langkah mudah lapor jual online untuk menghindari tagihan progresif dan denda tilang ETLE pemilik baru.',
    category: 'Regulasi',
    image: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '14 jam lalu',
    author: { name: 'Tim Regulasi ServiceGo', role: 'Legal Officer' },
    views: '17.3k',
    relatedService: {
      name: 'Konsultasi Administrasi Dokumen Kendaraan',
      description: 'Bantuan verifikasi status kepemilikan dan panduan bea balik nama (BBNKB).'
    },
    content: {
      summary: 'Pemilik kendaraan yang telah menjual mobil atau motornya wajib segera melakukan pemblokiran data STNK agar tidak dikenakan tarif pajak progresif bertingkat pada kendaraan berikutnya.',
      keyPoints: [
        'Tarif pajak progresif bertambah persentase untuk setiap kendaraan kedua, ketiga, dan seterusnya dengan nama dan KK yang sama',
        'Surat tilang elektronik ETLE dari pelanggaran pembeli baru tidak akan salah alamat ke rumah Anda jika STNK sudah diblokir',
        'Proses pemblokiran saat ini sudah bisa diakses secara daring melalui portal Bapenda samsat masing-masing provinsi'
      ],
      bodyParagraphs: [
        'Siapkan fotokopi KTP, fotokopi STNK, bukti transaksi kwitansi jual-beli bermaterai, dan surat pernyataan lapor jual untuk mengurus blokir secara tuntas.'
      ],
      mechanicNote: 'Ingatkan pembeli untuk segera melakukan balik nama STNK dan BPKB dalam kurun waktu 30 hari pasca transaksi.'
    }
  },
  {
    id: 'art-16',
    title: 'Penyebab Suara Kletek-Kletek Pada Mesin: Celah Klep Longgar atau Tensioner Aus?',
    excerpt: 'Bunyi ketukan ritmis dari bagian atas silinder head menandakan rantai keteng kendor atau lifter klep kekurangan pelumasan.',
    category: 'Mesin',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '15 jam lalu',
    author: { name: 'Maman Sudrajat', role: 'Engine Tuner' },
    views: '15.6k',
    relatedService: {
      name: 'Stel Klep Presisi & Cek Rantai Keteng',
      description: 'Kalibrasi celah intake dan exhaust valve dengan feeler gauge standar pabrik.'
    },
    content: {
      summary: 'Suara ketukan berisik pada kepala silinder dapat merusak batang payung klep dan noken as jika diabaikan berlarut-larut.',
      keyPoints: [
        'Celah klep yang terlalu renggang memicu suara tik-tik kasar dan mengurangi tenaga puncak mesin',
        'Tensioner rantai keteng (timing chain) yang macet membuat rantai bergesekan langsung dengan dinding blok mesin',
        'Kualitas oli mesin yang buruk atau filter oli tersumbat mengurangi tekanan oli ke lifter klep hidrolik'
      ],
      bodyParagraphs: [
        'Penyetelan celah katup secara berkala setiap 40.000 KM memastikan katup membuka dan menutup pada durasi dan bukaan derajat yang tepat sesuai kompresi ideal.'
      ],
      mechanicNote: 'Penyetelan celah klep wajib dilakukan saat kondisi mesin benar-benar dingin (suhu ruang).'
    }
  },
  {
    id: 'art-17',
    title: 'Lampu Utama Mobil Redup Sebelah: Soket Meleleh, Relay Lemah, atau Bohlam Gosong?',
    excerpt: 'Hambatan tinggi pada kabel massa ground dan soket H4 yang meleleh sering memicu penurunan arus daya lampu depan.',
    category: 'Kelistrikan & AC',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    readTime: '3 mnt baca',
    timeAgo: '16 jam lalu',
    author: { name: 'Rian Santoso', role: 'Spesialis Kelistrikan' },
    views: '9.8k',
    relatedService: {
      name: 'Peremajaan Kabel Relay Lampu & Bohlam LED',
      description: 'Pemasangan wiring harness keramik dan set relay lampu tegangan tinggi.'
    },
    content: {
      summary: 'Pencahayaan yang redup atau tidak seimbang antara kiri dan kanan sangat berbahaya saat melaju kencang di malam hari.',
      keyPoints: [
        'Soket lampu berbahan plastik rentan meleleh jika dipasang bohlam berdaya 100/90W tanpa tambahan set relay eksternal',
        'Kabel massa (grounding) yang berkarat ke bodi mobil menghambat aliran arus balik negatif',
        'Bohlam halogen yang kaca dalamnya sudah berkabut abu-abu pekat pertanda filamen tungsten mulai putus'
      ],
      bodyParagraphs: [
        'Mengganti bohlam dengan LED berkualitas ber-driver arus konstan memberikan intensitas cahaya yang jauh lebih terang dengan konsumsi daya listrik aki yang lebih hemat.'
      ],
      mechanicNote: 'Jangan menyentuh kaca bohlam halogen dengan jari telanjang karena minyak kulit dapat memicu titik panas yang memecahkan kaca.'
    }
  },
  {
    id: 'art-18',
    title: 'Syarat & Alur Perpanjang STNK 5 Tahunan Plus Ganti Plat Nomor Terbaru 2026',
    excerpt: 'Panduan cek fisik nomor rangka dan nomor mesin di Samsat serta rincian biaya resmi PNBP TNKB dan SWDKLLJ.',
    category: 'Regulasi',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    readTime: '4 mnt baca',
    timeAgo: '17 jam lalu',
    author: { name: 'Tim Regulasi ServiceGo', role: 'Legal Officer' },
    views: '21.5k',
    relatedService: {
      name: 'Bantuan Cek Fisik & Administrasi Samsat',
      description: 'Layanan pendampingan gesek nomor rangka mesin dan pembayaran pajak tahunan.'
    },
    content: {
      summary: 'Perpanjangan STNK 5 tahunan mewajibkan kendaraan hadir secara fisik di Samsat untuk gesek nomor rangka dan nomor mesin asli.',
      keyPoints: [
        'Bawa dokumen asli: STNK, BPKB, dan KTP asli pemilik yang tertera di dokumen',
        'Pastikan posisi nomor rangka dan nomor mesin bersih dari lumpur atau oli agar proses gesek cepat selesai',
        'Setelah cek fisik dilegalisir, lakukan pendaftaran loket 5 tahunan untuk pencetakan TNKB (plat nomor putih) baru'
      ],
      bodyParagraphs: [
        'Mengetahui alur perpanjangan STNK sejak awal menghemat waktu Anda dari antrian panjang dan calo ilegal di area Samsat.'
      ],
      mechanicNote: 'Sebelum ke Samsat, pastikan lampu utama, lampu rem, klakson, dan spion terpasang lengkap untuk kelulusan cek fisik kelayakan jalan.'
    }
  }
];

const TRENDING_TOPICS = [
  { rank: 1, title: 'Jadwal Ganti Oli Mobil yang Jarang Dipakai: Patokan Bulan vs KM', views: '28.4k pembaca' },
  { rank: 2, title: 'Lokasi & Tarif Resmi Bengkel Uji Emisi DKI Jakarta', views: '22.1k pembaca' },
  { rank: 3, title: 'Ciri Kampas Rem Mulai Tipis Sebelum Bunyi Gesekan Besi', views: '19.7k pembaca' },
  { rank: 4, title: 'Arti Kode Sekring & Cara Ganti Sekring Putus Sendiri', views: '15.3k pembaca' },
  { rank: 5, title: 'Klaim Garansi Servis ServiceGo: Syarat & Alur Pengerjaan Ulang', views: '12.8k pembaca' }
];

const VIDEO_GUIDES: VideoGuide[] = [
  {
    id: 'vid-1',
    title: 'Cara Cepat Cek Kondisi Minyak Rem & Air Radiator di Rumah',
    duration: '03:15',
    views: '12.5k views',
    category: 'Tips Mandiri',
    thumbnail: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    instructor: 'Om Bambang · Teknisi ServiceGo',
    description: 'Panduan 3 menit memeriksa reservoir coolant dan batas min/max minyak rem sebelum berangkat perjalanan jauh.'
  },
  {
    id: 'vid-2',
    title: 'Trik Mengatasi Bau Apek AC & Pembersihan Blower Mandiri',
    duration: '04:40',
    views: '18.9k views',
    category: 'AC Mobil',
    thumbnail: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    instructor: 'Dicky · AC Specialist',
    description: 'Langkah membongkar laci dasbor, mencabut filter kabin, dan menyemprotkan cairan desinfektan anti-bakteri.'
  },
  {
    id: 'vid-3',
    title: 'Mengenal Bunyi Bunyi Aneh di Kaki-Kaki Depan Saat Belok',
    duration: '05:10',
    views: '24.2k views',
    category: 'Kaki-kaki',
    thumbnail: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80',
    instructor: 'Hadi · Suspension Tech',
    description: 'Bedakan bunyi link stabilizer, tie rod end, dan rack steer yang mulai oblak.'
  },
  {
    id: 'vid-4',
    title: 'Langkah Tepat Ketika Indikator Temperatur Mesin Naik (Overheat)',
    duration: '06:20',
    views: '31.0k views',
    category: 'Darurat',
    thumbnail: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=600&q=80',
    instructor: 'Maman · Emergency Response',
    description: 'Jangan langsung matikan mesin! Simak langkah aman menepikan mobil saat jarum temperatur mendekati garis merah.'
  }
];

const CATEGORIES = [
  'Semua',
  'Mesin',
  'Rem & Kaki-kaki',
  'Oli & Pelumas',
  'Kelistrikan & AC',
  'Regulasi',
  'Tersimpan'
] as const;

export default function NewsAndNotificationPage() {
  const router = useRouter();

  // State
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('Semua');
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoGuide | null>(null);
  const [emailBriefing, setEmailBriefing] = useState('');
  const [visibleCount, setVisibleCount] = useState(9);
  const [searchQuery, setSearchQuery] = useState('');

  // Hero carousel navigation
  function handlePrevHero() {
    setActiveHeroIdx((prev) => (prev === 0 ? FEATURED_HERO_STORIES.length - 1 : prev - 1));
  }

  function handleNextHero() {
    setActiveHeroIdx((prev) => (prev === FEATURED_HERO_STORIES.length - 1 ? 0 : prev + 1));
  }

  // Toggle bookmark
  function toggleBookmark(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        toast.info('Artikel dihapus dari daftar simpanan');
        return prev.filter((item) => item !== id);
      } else {
        toast.success('Artikel disimpan ke daftar bacaan Anda');
        return [...prev, id];
      }
    });
  }

  // Handle briefing subscribe
  function handleSubscribeBriefing(e: React.FormEvent) {
    e.preventDefault();
    if (!emailBriefing.trim() || !emailBriefing.includes('@')) {
      toast.error('Masukkan alamat email yang valid');
      return;
    }
    toast.success('Terima kasih! Anda akan menerima ringkasan tips servis mingguan.');
    setEmailBriefing('');
  }

  // Copy promo code
  function handleClaimPromo() {
    navigator.clipboard.writeText('SERVISHEMAT20');
    toast.success('Kode voucher "SERVISHEMAT20" berhasil disalin! Mengarahkan ke booking...');
    setTimeout(() => {
      router.push('/booking/new');
    }, 800);
  }

  // Share article
  function handleShare(article: Article) {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan artikel berhasil disalin ke papan klip');
    }
  }

  // Filtered stories
  const currentHero = FEATURED_HERO_STORIES[activeHeroIdx] ?? FEATURED_HERO_STORIES[0]!;

  const filteredArticles = MAIN_ARTICLE_LIST.filter((art) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Category filter
    if (activeCategory === 'Tersimpan') {
      return bookmarkedIds.includes(art.id);
    }
    if (activeCategory === 'Semua') {
      return true;
    }
    return art.category === activeCategory;
  });

  return (
    <div className="w-full space-y-10 pb-20 select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO FEATURED GRID (60% Left Hero / 40% Right 2 Stacked)
          ───────────────────────────────────────────────────────────── */}
      <section aria-label="Berita Utama" className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Hero (Col 7 / ~60%) */}
        <div
          onClick={() => setSelectedArticle(currentHero)}
          className="lg:col-span-7 rounded-3xl overflow-hidden relative group cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-md min-h-[420px] sm:min-h-[480px] flex flex-col justify-end p-6 sm:p-9 text-white transition transform duration-300"
        >
          {/* Background image with smooth transition */}
          <img
            src={currentHero.image}
            alt={currentHero.title}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80';
            }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="eager"
          />

          {/* Deep dark gradient overlay for crystal readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />

          {/* Top badges */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm tracking-wide uppercase flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 fill-current" />
                <span>{currentHero.category}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                Paling Dicari
              </span>
            </div>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={(e) => toggleBookmark(e, currentHero.id)}
              aria-label="Simpan artikel"
              className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-95"
            >
              {bookmarkedIds.includes(currentHero.id) ? (
                <BookmarkCheck className="h-4.5 w-4.5 text-primary-400 fill-primary-400" />
              ) : (
                <Bookmark className="h-4.5 w-4.5" />
              )}
            </button>
          </div>

          {/* Bottom Content Area */}
          <div className="relative z-10 space-y-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-white group-hover:text-primary-300 transition-colors">
              {currentHero.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed max-w-xl">
              {currentHero.excerpt}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentHero.author.name[0]}
                </div>
                <div>
                  <span className="font-semibold text-white">{currentHero.author.name}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-slate-400">{currentHero.timeAgo}</span>
                </div>
              </div>

              {/* Carousel controls */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={handlePrevHero}
                  aria-label="Artikel sebelumnya"
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition active:scale-90"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 px-1">
                  {FEATURED_HERO_STORIES.map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setActiveHeroIdx(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === activeHeroIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleNextHero}
                  aria-label="Artikel berikutnya"
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition active:scale-90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Stacked Stories (Col 5 / ~40%) */}
        <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6 justify-between">
          {SIDE_FEATURED_STORIES.map((sideArt) => (
            <div
              key={sideArt.id}
              onClick={() => setSelectedArticle(sideArt)}
              className="flex-1 rounded-3xl overflow-hidden relative group cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-md min-h-[200px] sm:min-h-[225px] flex flex-col justify-end p-5 sm:p-6 text-white"
            >
              <img
                src={sideArt.image}
                alt={sideArt.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80';
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />

              <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-600 text-white uppercase tracking-wider">
                  {sideArt.category}
                </span>
                <span className="text-[11px] font-medium text-slate-300 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  {sideArt.readTime}
                </span>
              </div>

              <div className="relative z-10 space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold leading-snug text-white group-hover:text-primary-300 transition-colors line-clamp-2">
                  {sideArt.title}
                </h2>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>{sideArt.timeAgo}</span>
                  <span className="flex items-center gap-1 text-primary-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Baca</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP STORIES & TIPS (Filter Tabs + 2-Column Grid + Sidebar)
          ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="top-stories-heading" className="space-y-6">
        {/* Section Header with Category Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h2 id="top-stories-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kabar & Panduan Servis
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kurasi edukasi harian oleh tim mekanik profesional ServiceGo · Diperbarui berkala
            </p>
          </div>

          {/* Category Filter Pills & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel tips..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 w-36 sm:w-44 transition"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat === 'Tersimpan' && <Bookmark className="h-3 w-3" />}
                  <span>{cat}</span>
                  {cat === 'Tersimpan' && bookmarkedIds.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-600 text-white">
                      {bookmarkedIds.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Layout: Articles (Col 8) + Sidebar (Col 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Articles Grid (~68% / col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {filteredArticles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-2 bg-white/50 dark:bg-slate-900/50">
                <SlidersHorizontal className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Tidak Ada Artikel yang Cocok
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activeCategory === 'Tersimpan'
                    ? 'Anda belum menyimpan artikel. Klik icon bookmark pada kartu artikel untuk menyimpannya di sini.'
                    : 'Coba ubah kata kunci pencarian atau pilih kategori lain.'}
                </p>
                {activeCategory === 'Tersimpan' ? (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('Semua')}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition"
                  >
                    Jelajahi Semua Artikel
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredArticles.slice(0, visibleCount).map((article) => {
                  const isSaved = bookmarkedIds.includes(article.id);

                  return (
                    <article
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition duration-200 flex flex-col justify-between cursor-pointer group"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={article.image}
                          alt={article.title}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                        {/* Top Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-sm text-white border border-white/10">
                            {article.category}
                          </span>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(e, article.id)}
                          aria-label="Simpan artikel"
                          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-90"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-primary-400 fill-primary-400" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Text Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-sm leading-snug text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {article.excerpt}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>{article.timeAgo}</span>
                          </div>
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {article.readTime}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Load More Button */}
            {filteredArticles.length > visibleCount && (
              <div className="flex justify-center pt-3 pb-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 3)}
                  className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 flex items-center gap-2"
                >
                  <span>Muat Lebih Banyak Artikel</span>
                  <span className="text-[11px] text-slate-400">({filteredArticles.length - visibleCount} tersisa)</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar (~32% / col-span-4) - Balanced & Sticky */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-5 sticky top-24 self-start">
            {/* Widget 1: Trending Now / Paling Banyak Dibaca */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Trending Saat Ini
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="space-y-3">
                {TRENDING_TOPICS.map((item) => (
                  <div
                    key={item.rank}
                    onClick={() => {
                      const match = MAIN_ARTICLE_LIST[item.rank - 1] ?? MAIN_ARTICLE_LIST[0]!;
                      setSelectedArticle(match);
                    }}
                    className="flex items-start gap-3 group cursor-pointer"
                  >
                    <span className="font-extrabold text-sm text-slate-400 group-hover:text-primary-600 transition-colors w-4 shrink-0">
                      {item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Eye className="h-2.5 w-2.5" />
                        <span>{item.views}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Daily Briefing Newsletter */}
            <div className="bg-slate-950 text-white rounded-3xl p-5 shadow-md space-y-3 relative overflow-hidden border border-slate-800">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white uppercase tracking-wider">
                  Newsletter Montir
                </span>
                <h3 className="font-bold text-sm sm:text-base leading-snug text-white">
                  Dapatkan Tips Perawatan & Pengingat Servis
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ringkasan mingguan seputar trik hemat bbm, perawatan mandiri, dan update harga sparepart.
                </p>
              </div>

              <form onSubmit={handleSubscribeBriefing} className="space-y-2 pt-0.5">
                <div className="relative">
                  <input
                    type="email"
                    value={emailBriefing}
                    onChange={(e) => setEmailBriefing(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition"
                  />
                  <button
                    type="submit"
                    aria-label="Kirim"
                    className="absolute right-1 top-1 h-7 w-7 rounded-lg bg-primary-600 hover:bg-primary-500 flex items-center justify-center text-white transition active:scale-95"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  Bebas spam. Anda dapat berhenti berlangganan kapan saja.
                </p>
              </form>
            </div>

            {/* Widget 3: Sponsored Promo Banner */}
            <div className="rounded-3xl border-2 border-dashed border-primary-200 dark:border-primary-900/60 bg-gradient-to-br from-primary-50/50 to-blue-50/30 dark:from-primary-950/20 dark:to-slate-900 p-5 text-center space-y-2.5 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                <Tag className="h-3 w-3" />
                <span>VOUCHER SERVIS</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Diskon 20% Booking Pertama
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan kode voucher saat checkout booking di bengkel rekanan.
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs sm:text-sm tracking-wider text-primary-600 dark:text-primary-400 select-all">
                SERVISHEMAT20
              </div>
              <button
                type="button"
                onClick={handleClaimPromo}
                className="w-full py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
              >
                Klaim & Booking Sekarang
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. VIDEO PANDUAN & TIPS MONTIR (Match Highlights equivalent)
          ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="video-section-heading" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="video-section-heading" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Video Tutorial & Tips Montir
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simak video singkat panduan perawatan mandiri langsung dari teknisi bengkel rekanan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VIDEO_GUIDES.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVideo(v)}
              className="rounded-2xl overflow-hidden bg-slate-950 text-white relative group cursor-pointer border border-slate-800 shadow-md flex flex-col justify-end p-4 min-h-[170px]"
            >
              <img
                src={v.thumbnail}
                alt={v.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80';
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-11 w-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Duration Tag */}
              <div className="absolute top-3 right-3 z-10">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur-md text-white font-mono">
                  {v.duration}
                </span>
              </div>

              {/* Title & Instructor */}
              <div className="relative z-10 space-y-1">
                <h4 className="font-bold text-xs leading-snug line-clamp-2 text-white group-hover:text-primary-300 transition-colors">
                  {v.title}
                </h4>
                <p className="text-[10px] text-slate-300">
                  {v.instructor} · {v.views}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM PRO BANNER ("SportNow Pro" equivalent)
          ───────────────────────────────────────────────────────────── */}
      <section aria-label="ServiceGo Care" className="rounded-3xl bg-slate-950 text-white p-7 sm:p-10 relative overflow-hidden border border-slate-800 shadow-xl">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-600/20 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              ServiceGo Care
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Bebas Cemas di Jalan. Servis Rutin Terjadwal & Bergaransi.
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Daftarkan kendaraan Anda, pilih layanan servis sesuai keluhan, dan nikmati transparansi pengerjaan bengkel dengan garansi suku cadang hingga 1.000 KM.
            </p>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                href="/booking/new"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition shadow-sm active:scale-95"
              >
                Booking Servis Sekarang
              </Link>
              <Link
                href="/services/1"
                className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs sm:text-sm transition"
              >
                Lihat Paket Layanan
              </Link>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">99.2%</p>
              <p className="text-xs text-slate-400">Tingkat Kepuasan Pelanggan</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">10.000+</p>
              <p className="text-xs text-slate-400">Kendaraan Terservis</p>
            </div>
            <div className="col-span-2 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Didukung 150+ bengkel rekanan bergaransi di seluruh Indonesia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ARTICLE READER DIALOG (Deep UX Value!)
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(selectedArticle)} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 rounded-2xl">
          {selectedArticle && (
            <div>
              {/* Header Hero Image */}
              <div className="relative h-60 w-full bg-slate-950">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-white">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-600">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-slate-300">{selectedArticle.readTime}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-7 space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                    {selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Author & Meta */}
                <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      {selectedArticle.author.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedArticle.author.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{selectedArticle.author.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShare(selectedArticle)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Bagikan Tautan"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(e, selectedArticle.id)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Simpan"
                    >
                      {bookmarkedIds.includes(selectedArticle.id) ? (
                        <BookmarkCheck className="h-4 w-4 text-primary-600 fill-primary-600" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Summary & Key Points */}
                <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedArticle.content.summary}
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Poin Penting untuk Pemilik Kendaraan:</span>
                    </h4>
                    <ul className="space-y-2 pl-2">
                      {selectedArticle.content.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mt-2 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedArticle.content.bodyParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}

                  {/* Mechanic Pro Tip */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
                    <Wrench className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">Catatan Mekanik:</strong>
                      <span>{selectedArticle.content.mechanicNote}</span>
                    </div>
                  </div>
                </div>

                {/* Related Service Action CTA */}
                {selectedArticle.relatedService && (
                  <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                        Rekomendasi Servis Terkait
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedArticle.relatedService.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedArticle.relatedService.description}
                      </p>
                    </div>
                    <Link
                      href="/booking/new"
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs transition shadow-sm text-center shrink-0"
                    >
                      Booking Servis Ini
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: VIDEO TUTORIAL VIEWER
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(selectedVideo)} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl">
          {selectedVideo && (
            <div>
              {/* Video Simulated Player */}
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center">
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <div className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl">
                    <Play className="h-6 w-6 fill-current ml-1" />
                  </div>
                  <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1 rounded-full">
                    Video Durasi {selectedVideo.duration}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
                    {selectedVideo.category}
                  </span>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedVideo.title}
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedVideo.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Instruktur: <strong className="text-slate-800 dark:text-slate-200">{selectedVideo.instructor}</strong></span>
                  <Link
                    href="/booking/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs transition"
                  >
                    <span>Jadwalkan di Bengkel</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
