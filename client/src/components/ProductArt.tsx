import type { ProductType, Slot } from "@shelfsense/shared";

// Little bottle drawings, one per product type, tinted by when you use it.
// Hand-drawn SVG so they stay crisp at any size and match the colour tokens.

const SLOT_COLOR: Record<Slot, string> = {
  AM: "var(--butter)",
  PM: "var(--periwinkle)",
  BOTH: "var(--sage)",
};

interface ArtProps {
  color: string;
}

// a couple of faint "text lines" on each label
function LabelLines({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g fill="var(--ink)" opacity="0.55">
      <rect x={x} y={y} width={width} height="3" rx="1.5" />
      <rect x={x} y={y + 6} width={width * 0.7} height="3" rx="1.5" />
    </g>
  );
}

function Pump({ color }: ArtProps) {
  return (
    <g>
      <path d="M30 14h12v4H30z" fill={color} opacity="0.9" />
      <path d="M33 18h6v8h-6z" fill={color} opacity="0.7" />
      <path d="M42 14h8v3h-8z" fill={color} opacity="0.9" />
      <rect x="22" y="26" width="28" height="44" rx="9" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="27" y="40" width="18" height="16" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={30} y={44} width={12} />
    </g>
  );
}

function Toner({ color }: ArtProps) {
  return (
    <g>
      <rect x="29" y="8" width="14" height="10" rx="3" fill={color} opacity="0.9" />
      <rect x="24" y="18" width="24" height="52" rx="7" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="28" y="36" width="16" height="20" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={31} y={41} width={10} />
    </g>
  );
}

function Dropper({ color }: ArtProps) {
  return (
    <g>
      <ellipse cx="36" cy="14" rx="6" ry="7" fill={color} opacity="0.9" />
      <rect x="30" y="20" width="12" height="9" rx="2" fill={color} opacity="0.7" />
      <path d="M26 36a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="29.5" y="44" width="13" height="15" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={32} y={48} width={8} />
    </g>
  );
}

function Jar({ color }: ArtProps) {
  return (
    <g>
      <rect x="14" y="34" width="44" height="12" rx="4" fill={color} opacity="0.9" />
      <rect x="12" y="46" width="48" height="24" rx="8" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="24" y="51" width="24" height="12" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={28} y={54} width={16} />
    </g>
  );
}

function Tube({ color }: ArtProps) {
  return (
    <g>
      <path d="M22 10h28l-3 6H25Z" fill={color} opacity="0.9" />
      <path d="M25 16h22l-4 42H29Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="29" y="58" width="14" height="12" rx="3" fill={color} opacity="0.9" />
      <rect x="29.5" y="26" width="13" height="16" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={32} y={30} width={8} />
    </g>
  );
}

function Treatment({ color }: ArtProps) {
  return (
    <g>
      <rect x="32" y="12" width="8" height="16" rx="4" fill={color} opacity="0.9" />
      <rect x="27" y="28" width="18" height="42" rx="6" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="30.5" y="40" width="11" height="16" rx="3" fill={color} opacity="0.85" />
      <LabelLines x={33} y={44} width={6} />
    </g>
  );
}

const ART: Record<ProductType, (props: ArtProps) => React.JSX.Element> = {
  CLEANSER: Pump,
  TONER: Toner,
  SERUM: Dropper,
  MOISTURIZER: Jar,
  SUNSCREEN: Tube,
  TREATMENT: Treatment,
  OTHER: Toner,
};

export function ProductArt({ type, slot, size = 56 }: { type: ProductType; slot: Slot; size?: number }) {
  const Drawing = ART[type];
  const color = SLOT_COLOR[slot];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl border border-line bg-surface-2"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 78" width={size * 0.78} height={size * 0.84}>
        <Drawing color={color} />
      </svg>
    </div>
  );
}
