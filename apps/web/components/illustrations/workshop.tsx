import { clsx } from 'clsx';

/*
 * Ilustrasi bengkel ServiceGo, digambar langsung sebagai SVG (bukan foto).
 * Warna mengikuti DESIGN.md: biru primer, tinta slate, sedikit oranye aksen, putih.
 * Setiap bagian memakai kelas Tailwind `fill-*` dengan pasangan `dark:` supaya ikut tema gelap.
 */

interface IllustrationProps {
  className?: string;
  /** Teks alternatif. Diabaikan bila `decorative`. */
  label?: string;
  /** true: disembunyikan dari pembaca layar (gambar hanya hiasan). */
  decorative?: boolean;
  /** true: mengisi wadah (seperti object-cover), untuk wadah dengan tinggi tetap. */
  cover?: boolean;
}

// Palet bersama (terang / gelap)
const F = {
  wall: 'fill-slate-100 dark:fill-slate-800',
  floor: 'fill-slate-200 dark:fill-slate-900',
  panel: 'fill-white dark:fill-slate-700',
  line: 'fill-slate-300 dark:fill-slate-600',
  metal: 'fill-slate-400 dark:fill-slate-500',
  ink: 'fill-slate-700 dark:fill-slate-600',
  tire: 'fill-slate-800 dark:fill-slate-950',
  rim: 'fill-slate-300 dark:fill-slate-400',
  body: 'fill-primary-600 dark:fill-primary-500',
  deep: 'fill-primary-700',
  glass: 'fill-primary-100 dark:fill-primary-900',
  sky: 'fill-primary-50 dark:fill-slate-800',
  accent: 'fill-accent-500',
  white: 'fill-white',
  skin: 'fill-[#E2B48C]'
};
const S = {
  line: 'stroke-slate-300 dark:stroke-slate-600',
  tool: 'stroke-slate-500 dark:stroke-slate-400',
  deep: 'stroke-primary-700',
  body: 'stroke-primary-700 dark:stroke-primary-900'
};

function a11y({ label, decorative }: IllustrationProps, fallback: string) {
  return decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': label ?? fallback };
}

function svgClass({ className, cover }: IllustrationProps) {
  return clsx('block', cover ? 'h-full w-full' : 'h-auto w-full', className);
}

/** Mobil MPV tampak samping, menghadap kiri. Titik (0,0) = ujung depan bawah bodi. */
function CarSide({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className={F.body}
        d="M0-5V-32Q2-45 18-48L55-54 90-82Q96-88 106-88H200Q212-88 218-78L238-45Q245-40 245-28V-5Q245 0 240 0H5Q0 0 0-5Z"
      />
      <path className={F.glass} d="M62-52 94-78Q98-82 104-82H140V-52Z" />
      <path className={F.glass} d="M146-82H196Q204-82 208-75L224-52H146Z" />
      <path className={S.body} strokeWidth="2" d="M143-50V-6M60-50H232" fill="none" />
      <rect className={F.deep} x="122" y="-44" width="12" height="3" rx="1.5" />
      <rect className={F.deep} x="182" y="-44" width="12" height="3" rx="1.5" />
      <rect className={F.white} x="3" y="-36" width="12" height="7" rx="3" />
      <rect className={F.accent} x="238" y="-38" width="6" height="12" rx="2" />
      <rect className={F.deep} x="0" y="-12" width="245" height="5" />
      <circle className={F.tire} cx="48" cy="0" r="22" />
      <circle className={F.rim} cx="48" cy="0" r="10" />
      <circle className={F.tire} cx="198" cy="0" r="22" />
      <circle className={F.rim} cx="198" cy="0" r="10" />
    </g>
  );
}

/** Tumpukan ban. (x,y) = sudut kiri bawah. */
function TireStack({ x, y, count = 3 }: { x: number; y: number; count?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(0 ${-(i + 1) * 22})`}>
          <rect className={F.tire} width="66" height="20" rx="10" />
          <rect className={F.ink} x="14" y="8" width="38" height="4" rx="2" />
        </g>
      ))}
    </g>
  );
}

/** Adegan bengkel: mobil di atas lift, mekanik, dinding perkakas, tumpukan ban. */
export function WorkshopHero(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 560 440"
      preserveAspectRatio={props.cover ? 'xMidYMid slice' : undefined}
      className={svgClass(props)}
      {...a11y(props, 'Ilustrasi bengkel: mobil di atas lift sedang diperiksa mekanik')}
    >
      <rect className={F.wall} width="560" height="440" />
      {/* lampu langit-langit */}
      <rect className={F.ink} x="190" y="0" width="4" height="22" />
      <rect className={F.ink} x="366" y="0" width="4" height="22" />
      <rect className={F.panel} x="170" y="22" width="220" height="10" rx="5" />
      {/* pintu garasi terbuka di kanan atas */}
      <rect className={F.line} x="384" y="40" width="156" height="124" rx="6" />
      <rect className={F.sky} x="392" y="48" width="140" height="116" />
      <rect className={F.panel} x="392" y="48" width="140" height="44" />
      <path className={S.line} strokeWidth="2" d="M392 63H532M392 78H532" />
      <rect className={F.metal} x="392" y="90" width="140" height="4" />
      <rect className={F.line} x="402" y="132" width="120" height="32" rx="4" opacity=".6" />
      {/* dinding perkakas */}
      <rect className={F.panel} x="22" y="66" width="96" height="124" rx="8" />
      <g className={S.tool} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M40 86V128" />
        <path d="M58 86V118" />
        <path d="M76 86V134" />
      </g>
      <circle className={F.metal} cx="40" cy="86" r="7" />
      <circle className={F.metal} cx="58" cy="86" r="6" />
      <circle className={F.metal} cx="76" cy="86" r="8" />
      <rect className={F.accent} x="92" y="84" width="14" height="10" rx="2" />
      <rect className={F.ink} x="97" y="94" width="4" height="40" rx="2" />
      <g className={S.tool} strokeWidth="4" strokeLinecap="round">
        <path d="M36 152H62M36 168H54" />
      </g>
      <rect className={F.accent} x="70" y="146" width="10" height="12" rx="2" />
      <rect className={F.ink} x="80" y="150" width="26" height="4" rx="2" />
      <rect className={F.accent} x="70" y="162" width="10" height="12" rx="2" />
      <rect className={F.ink} x="80" y="166" width="20" height="4" rx="2" />
      {/* lantai */}
      <rect className={F.floor} y="360" width="560" height="80" />
      <rect className={F.line} y="360" width="560" height="4" />
      <path className={S.line} strokeWidth="3" strokeDasharray="24 16" d="M0 410H560" />
      {/* lemari perkakas beroda */}
      <rect className={F.ink} x="22" y="276" width="86" height="76" rx="6" />
      <g className={S.line} strokeWidth="2">
        <path d="M22 300H108M22 326H108" />
      </g>
      <rect className={F.accent} x="56" y="285" width="18" height="4" rx="2" />
      <rect className={F.accent} x="56" y="311" width="18" height="4" rx="2" />
      <rect className={F.accent} x="56" y="337" width="18" height="4" rx="2" />
      <circle className={F.tire} cx="34" cy="356" r="5" />
      <circle className={F.tire} cx="96" cy="356" r="5" />
      {/* bayangan & tiang lift */}
      <ellipse className={F.line} cx="282" cy="366" rx="150" ry="6" opacity=".7" />
      <rect className={F.metal} x="134" y="132" width="16" height="230" rx="3" />
      <rect className={F.metal} x="414" y="132" width="16" height="230" rx="3" />
      <rect className={F.ink} x="128" y="352" width="28" height="10" rx="2" />
      <rect className={F.ink} x="408" y="352" width="28" height="10" rx="2" />
      <rect className={F.accent} x="134" y="138" width="16" height="6" />
      <rect className={F.accent} x="414" y="138" width="16" height="6" />
      {/* lengan lift */}
      <rect className={F.ink} x="142" y="232" width="84" height="8" rx="2" />
      <rect className={F.ink} x="338" y="232" width="84" height="8" rx="2" />
      <CarSide x={160} y={230} />
      {/* mekanik (dicerminkan, berdiri di kanan lift supaya tidak tertutup kartu di hero) */}
      <g transform="translate(755 0) scale(-1 1)">
        <rect className={F.ink} x="281" y="326" width="10" height="34" rx="3" />
        <rect className={F.ink} x="295" y="326" width="10" height="34" rx="3" />
        <rect className={F.tire} x="277" y="355" width="16" height="7" rx="3" />
        <rect className={F.tire} x="295" y="355" width="16" height="7" rx="3" />
        <path className={S.deep} strokeWidth="9" strokeLinecap="round" d="M284 292 274 322" fill="none" />
        <rect className={F.deep} x="276" y="282" width="34" height="50" rx="9" />
        <rect className={F.accent} x="278" y="304" width="30" height="4" />
        <path className={S.deep} strokeWidth="9" strokeLinecap="round" d="M304 292 318 270" fill="none" />
        <path className={S.tool} strokeWidth="4" strokeLinecap="round" d="M318 268 326 256" />
        <circle className={F.skin} cx="293" cy="268" r="11" />
        <path className={F.accent} d="M282 266A11 11 0 0 1 304 266Z" />
        <rect className={F.accent} x="280" y="264" width="16" height="4" rx="2" />
      </g>
      <TireStack x={490} y={360} count={3} />
      <TireStack x={496} y={294} count={1} />
    </svg>
  );
}

/** Tampak depan bengkel ServiceGo: dua pintu garasi, kantor, papan nama bergambar kunci pas. */
export function WorkshopFront(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 300"
      preserveAspectRatio={props.cover ? 'xMidYMid slice' : undefined}
      className={svgClass(props)}
      {...a11y(props, 'Ilustrasi tampak depan bengkel ServiceGo')}
    >
      <rect className={F.sky} width="480" height="300" />
      <circle className={F.panel} cx="78" cy="40" r="16" opacity=".8" />
      <circle className={F.panel} cx="98" cy="36" r="20" opacity=".8" />
      <circle className={F.panel} cx="408" cy="30" r="14" opacity=".8" />
      {/* jalan & trotoar */}
      <rect className={F.floor} y="250" width="480" height="50" />
      <rect className={F.line} y="250" width="480" height="6" />
      <path className={S.line} strokeWidth="3" strokeDasharray="28 18" d="M0 284H480" />
      {/* bangunan */}
      <rect className={F.panel} x="40" y="78" width="400" height="172" />
      <rect className={F.tire} x="30" y="64" width="420" height="20" rx="4" />
      <rect className={F.body} x="40" y="84" width="400" height="10" />
      {/* papan nama */}
      <rect className={F.ink} x="216" y="46" width="6" height="18" />
      <rect className={F.ink} x="258" y="46" width="6" height="18" />
      <rect className={F.body} x="196" y="14" width="88" height="40" rx="10" />
      <g transform="translate(240 34) rotate(-45)">
        <rect className={F.white} x="-16" y="-3.5" width="26" height="7" rx="3.5" />
        <circle className={F.white} cx="12" cy="0" r="9" />
        <rect className={F.body} x="10" y="-3" width="12" height="6" />
      </g>
      {/* pintu garasi 1 (terbuka) */}
      <rect className={F.line} x="56" y="110" width="150" height="140" rx="4" />
      <rect className={F.tire} x="62" y="116" width="138" height="134" />
      <rect className={F.metal} x="62" y="116" width="138" height="24" />
      <path className={S.line} strokeWidth="2" d="M62 124H200M62 132H200" />
      <rect className={F.ink} x="62" y="236" width="138" height="14" />
      {/* mobil tampak depan di dalam */}
      <path className={F.glass} d="M98 178 106 158Q108 154 113 154H149Q154 154 156 158L164 178Z" />
      <rect className={F.body} x="88" y="176" width="86" height="42" rx="10" />
      <rect className={F.deep} x="104" y="198" width="54" height="8" rx="3" />
      <circle className={F.white} cx="100" cy="190" r="6" />
      <circle className={F.white} cx="162" cy="190" r="6" />
      <rect className={F.tire} x="92" y="216" width="16" height="16" rx="3" />
      <rect className={F.tire} x="154" y="216" width="16" height="16" rx="3" />
      {/* pintu garasi 2 (tertutup) */}
      <rect className={F.line} x="218" y="110" width="150" height="140" rx="4" />
      <rect className={F.wall} x="224" y="116" width="138" height="134" />
      <g className={S.line} strokeWidth="2">
        <path d="M224 132H362M224 148H362M224 164H362M224 180H362M224 196H362M224 212H362M224 228H362" />
      </g>
      <rect className={F.metal} x="280" y="238" width="26" height="5" rx="2.5" />
      {/* kantor */}
      <rect className={F.line} x="380" y="122" width="48" height="128" rx="3" />
      <rect className={F.glass} x="385" y="127" width="38" height="123" />
      <rect className={F.ink} x="413" y="180" width="4" height="22" rx="2" />
      {/* lampu dinding */}
      <rect className={F.ink} x="126" y="98" width="10" height="6" rx="2" />
      <rect className={F.ink} x="288" y="98" width="10" height="6" rx="2" />
      {/* bollard pengaman */}
      <rect className={F.accent} x="207" y="222" width="10" height="28" rx="3" />
      <rect className={F.tire} x="207" y="232" width="10" height="5" />
      <rect className={F.accent} x="369" y="222" width="10" height="28" rx="3" />
      <rect className={F.tire} x="369" y="232" width="10" height="5" />
    </svg>
  );
}

/** Versi ringkas (ikon besar) untuk kartu kecil, thumbnail, atau halaman masuk. */
export function WorkshopSmall(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      preserveAspectRatio={props.cover ? 'xMidYMid slice' : undefined}
      className={svgClass(props)}
      {...a11y(props, 'Ilustrasi bengkel ServiceGo')}
    >
      <rect className={F.sky} width="120" height="80" />
      <rect className={F.floor} y="66" width="120" height="14" />
      <rect className={F.panel} x="16" y="26" width="88" height="40" />
      <rect className={F.tire} x="12" y="20" width="96" height="8" rx="2" />
      <rect className={F.body} x="16" y="28" width="88" height="3" />
      <rect className={F.body} x="46" y="6" width="28" height="12" rx="4" />
      <g transform="translate(60 12) rotate(-45)">
        <rect className={F.white} x="-6" y="-1.3" width="10" height="2.6" rx="1.3" />
        <circle className={F.white} cx="4.5" cy="0" r="3.4" />
        <rect className={F.body} x="4" y="-1.1" width="4.5" height="2.2" />
      </g>
      <rect className={F.tire} x="24" y="36" width="40" height="30" />
      <rect className={F.metal} x="24" y="36" width="40" height="6" />
      <rect className={F.body} x="31" y="52" width="26" height="12" rx="3" />
      <rect className={F.glass} x="35" y="46" width="18" height="7" rx="2" />
      <circle className={F.white} cx="35" cy="57" r="1.8" />
      <circle className={F.white} cx="53" cy="57" r="1.8" />
      <rect className={F.wall} x="70" y="36" width="26" height="30" />
      <path className={S.line} strokeWidth="1.2" d="M70 42H96M70 48H96M70 54H96M70 60H96" />
      <rect className={F.accent} x="65" y="58" width="3" height="8" rx="1" />
    </svg>
  );
}
