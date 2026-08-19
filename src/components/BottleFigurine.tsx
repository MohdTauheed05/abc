import type { Product } from '../types/product';

interface Props {
  product: Product;
}

/**
 * Procedurally-drawn "toon figurine holding a bottle" used as the default
 * artwork for a grade until an admin uploads real character art. Colors are
 * derived entirely from the product's palette so every grade gets a
 * distinct figurine without needing external image assets.
 */
export default function BottleFigurine({ product }: Props) {
  const { panel, accent, bg, category, code } = product;
  const skin = accent;
  const suit = panel;
  const suitShade = shade(panel, -18);
  const bottleBody = shade(bg, 22);
  const bottleCap = shade(bg, -30);

  const isTub = category === 'heavy-grease';
  const isJerry = category === 'coolant';
  const isSmall = category === 'brake-fluid';

  return (
    <svg viewBox="0 0 300 500" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id={`suit-${product.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={suit} />
          <stop offset="100%" stopColor={suitShade} />
        </linearGradient>
        <linearGradient id={`bottle-${product.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bottleBody} />
          <stop offset="100%" stopColor={bg} />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="150" cy="472" rx="78" ry="16" fill="#000000" opacity="0.18" />

      {/* legs */}
      <rect x="108" y="360" width="34" height="100" rx="16" fill={suitShade} />
      <rect x="158" y="360" width="34" height="100" rx="16" fill={suitShade} />
      <rect x="100" y="440" width="52" height="26" rx="12" fill="#211A14" />
      <rect x="150" y="440" width="52" height="26" rx="12" fill="#211A14" />

      {/* body */}
      <rect x="90" y="220" width="120" height="150" rx="46" fill={`url(#suit-${product.id})`} />
      <rect x="118" y="248" width="64" height="86" rx="18" fill={skin} opacity="0.9" />

      {/* left arm (down, on hip) */}
      <rect x="66" y="240" width="34" height="96" rx="17" fill={suit} />
      <circle cx="83" cy="336" r="19" fill={skin} />

      {/* right arm (raised, holding bottle) */}
      <rect
        x="188"
        y="150"
        width="34"
        height="110"
        rx="17"
        fill={suit}
        transform="rotate(-18 205 205)"
      />
      <circle cx="214" cy="158" r="19" fill={skin} />

      {/* head */}
      <circle cx="150" cy="150" r="62" fill={skin} />
      <circle cx="150" cy="128" r="58" fill={suit} opacity="0.14" />
      {/* eyes */}
      <circle cx="128" cy="152" r="7" fill="#211A14" />
      <circle cx="172" cy="152" r="7" fill="#211A14" />
      {/* smile */}
      <path d="M128 174 Q150 190 172 174" stroke="#211A14" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="116" cy="166" r="8" fill={bg} opacity="0.5" />
      <circle cx="184" cy="166" r="8" fill={bg} opacity="0.5" />

      {/* bottle held aloft */}
      <g transform="translate(196,60) rotate(8)">
        {isSmall && (
          <>
            <rect x="10" y="34" width="42" height="70" rx="8" fill={`url(#bottle-${product.id})`} stroke={bottleCap} strokeWidth="3" />
            <rect x="20" y="14" width="22" height="24" rx="5" fill={bottleCap} />
          </>
        )}
        {isTub && (
          <>
            <path d="M4 44 h58 v56 a10 10 0 0 1 -10 10 h-38 a10 10 0 0 1 -10 -10 Z" fill={`url(#bottle-${product.id})`} stroke={bottleCap} strokeWidth="3" />
            <ellipse cx="33" cy="44" rx="29" ry="9" fill={bottleCap} />
          </>
        )}
        {isJerry && (
          <>
            <rect x="0" y="30" width="64" height="76" rx="10" fill={`url(#bottle-${product.id})`} stroke={bottleCap} strokeWidth="3" />
            <rect x="18" y="10" width="28" height="22" rx="6" fill={bottleCap} />
            <circle cx="49" cy="56" r="10" fill={bottleCap} opacity="0.6" />
          </>
        )}
        {!isSmall && !isTub && !isJerry && (
          <>
            <path
              d="M12 30 h32 v18 c14 8 18 20 18 34 v40 a10 10 0 0 1 -10 10 h-48 a10 10 0 0 1 -10 -10 v-40 c0 -14 4 -26 18 -34 Z"
              fill={`url(#bottle-${product.id})`}
              stroke={bottleCap}
              strokeWidth="3"
            />
            <rect x="14" y="6" width="28" height="24" rx="5" fill={bottleCap} />
          </>
        )}
        <rect x={isJerry ? 6 : isTub ? 8 : 8} y={isTub ? 62 : 66} width={isJerry ? 52 : isTub ? 50 : 44} height={isTub ? 26 : 26} rx="4" fill="#FCEBD9" opacity="0.95" />
        <text
          x={isJerry ? 32 : isTub ? 33 : isSmall ? 31 : 30}
          y={isTub ? 80 : 84}
          textAnchor="middle"
          fontFamily="Anton, sans-serif"
          fontSize={code.length > 6 ? 9 : 11}
          fill={bottleCap}
        >
          {code}
        </text>
      </g>
    </svg>
  );
}

function shade(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
