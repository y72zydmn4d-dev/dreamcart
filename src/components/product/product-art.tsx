import { useId, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import type { ArtKind } from "@/prototype/catalog";

export type ArtView = "front" | "side" | "detail";

interface ProductArtProps {
  readonly kind: ArtKind;
  readonly view?: ArtView;
  /** Body color (hex) from the selected variant's swatch; a neutral metal when absent. */
  readonly color?: string;
  /** Accessible name. Omit only when the art is decorative inside an already-labeled control. */
  readonly label?: string;
  readonly className?: string;
}

const NEUTRAL = "#c9cbd1";
const SCREEN = "#17171d";

/**
 * Original placeholder illustration (Phase 2). Simple geometric silhouettes on a soft brand stage,
 * deliberately not photorealistic, so it can never be mistaken for real product photography.
 */
export function ProductArt({
  kind,
  view = "front",
  color = NEUTRAL,
  label,
  className,
}: ProductArtProps) {
  const id = useId().replace(/:/g, "");
  const outline = "rgb(20 20 30 / 0.14)";
  const shapes: Record<ArtKind, Record<ArtView, ReactElement>> = {
    laptop: {
      front: (
        <g>
          <rect x="88" y="52" width="224" height="146" rx="12" fill={color} stroke={outline} />
          <rect x="98" y="62" width="204" height="126" rx="6" fill={SCREEN} />
          <rect
            x="98"
            y="62"
            width="204"
            height="126"
            rx="6"
            fill={`url(#${id}-screen)`}
            opacity="0.9"
          />
          <path
            d="M60 206h280l-14 16a8 8 0 0 1-6 3H80a8 8 0 0 1-6-3z"
            fill={color}
            stroke={outline}
          />
          <rect x="176" y="206" width="48" height="5" rx="2.5" fill="rgb(0 0 0 / 0.12)" />
        </g>
      ),
      side: (
        <g>
          <path d="M52 196 340 168l6 10-290 30z" fill={color} stroke={outline} />
          <path d="M56 206 346 178l2 6-290 30z" fill="rgb(0 0 0 / 0.12)" />
          <circle cx="300" cy="179" r="2.5" fill="rgb(0 0 0 / 0.25)" />
        </g>
      ),
      detail: (
        <g>
          <rect x="60" y="70" width="280" height="160" rx="14" fill={color} stroke={outline} />
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 10 }, (_, col) => (
              <rect
                key={`${row}-${col}`}
                x={78 + col * 25}
                y={88 + row * 24}
                width="20"
                height="18"
                rx="4"
                fill="rgb(20 20 30 / 0.78)"
              />
            )),
          )}
          <rect x="150" y="192" width="100" height="26" rx="6" fill="rgb(0 0 0 / 0.1)" />
        </g>
      ),
    },
    phone: {
      front: (
        <g>
          <rect x="142" y="34" width="116" height="232" rx="26" fill={color} stroke={outline} />
          <rect x="150" y="42" width="100" height="216" rx="20" fill={SCREEN} />
          <rect
            x="150"
            y="42"
            width="100"
            height="216"
            rx="20"
            fill={`url(#${id}-screen)`}
            opacity="0.9"
          />
          <rect x="183" y="50" width="34" height="9" rx="4.5" fill="#050507" />
        </g>
      ),
      side: (
        <g>
          <rect x="186" y="34" width="28" height="232" rx="12" fill={color} stroke={outline} />
          <rect x="212" y="92" width="4" height="34" rx="2" fill="rgb(0 0 0 / 0.2)" />
          <rect x="184" y="84" width="4" height="22" rx="2" fill="rgb(0 0 0 / 0.2)" />
          <rect x="184" y="112" width="4" height="22" rx="2" fill="rgb(0 0 0 / 0.2)" />
        </g>
      ),
      detail: (
        <g>
          <rect x="120" y="40" width="160" height="220" rx="30" fill={color} stroke={outline} />
          <rect x="138" y="58" width="76" height="76" rx="20" fill="rgb(0 0 0 / 0.12)" />
          <circle cx="160" cy="80" r="15" fill={SCREEN} />
          <circle cx="192" cy="112" r="15" fill={SCREEN} />
          <circle cx="160" cy="80" r="6" fill={`url(#${id}-lens)`} />
          <circle cx="192" cy="112" r="6" fill={`url(#${id}-lens)`} />
          <circle cx="196" cy="74" r="4" fill="rgb(255 255 255 / 0.7)" />
        </g>
      ),
    },
    earbuds: {
      front: (
        <g>
          <rect x="118" y="146" width="164" height="104" rx="40" fill={color} stroke={outline} />
          <path d="M118 182h164" stroke="rgb(0 0 0 / 0.12)" strokeWidth="2" />
          <circle cx="200" cy="214" r="4" fill="rgb(0 0 0 / 0.2)" />
          <g transform="translate(150 70)">
            <ellipse cx="0" cy="0" rx="22" ry="20" fill={color} stroke={outline} />
            <rect x="-7" y="10" width="14" height="44" rx="7" fill={color} stroke={outline} />
          </g>
          <g transform="translate(250 70)">
            <ellipse cx="0" cy="0" rx="22" ry="20" fill={color} stroke={outline} />
            <rect x="-7" y="10" width="14" height="44" rx="7" fill={color} stroke={outline} />
          </g>
        </g>
      ),
      side: (
        <g>
          <ellipse cx="200" cy="120" rx="44" ry="40" fill={color} stroke={outline} />
          <rect x="186" y="140" width="28" height="96" rx="14" fill={color} stroke={outline} />
          <ellipse cx="186" cy="114" rx="16" ry="14" fill="rgb(0 0 0 / 0.14)" />
        </g>
      ),
      detail: (
        <g>
          <rect x="90" y="96" width="220" height="140" rx="56" fill={color} stroke={outline} />
          <path d="M90 146h220" stroke="rgb(0 0 0 / 0.12)" strokeWidth="3" />
          <ellipse cx="160" cy="190" rx="26" ry="18" fill="rgb(0 0 0 / 0.1)" />
          <ellipse cx="240" cy="190" rx="26" ry="18" fill="rgb(0 0 0 / 0.1)" />
        </g>
      ),
    },
    headphones: {
      front: (
        <g>
          <path
            d="M110 170c0-70 40-114 90-114s90 44 90 114"
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M110 170c0-70 40-114 90-114s90 44 90 114"
            fill="none"
            stroke={outline}
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.4"
          />
          <rect x="84" y="150" width="56" height="94" rx="26" fill={color} stroke={outline} />
          <rect x="260" y="150" width="56" height="94" rx="26" fill={color} stroke={outline} />
          <rect x="128" y="162" width="14" height="70" rx="7" fill="rgb(0 0 0 / 0.16)" />
          <rect x="258" y="162" width="14" height="70" rx="7" fill="rgb(0 0 0 / 0.16)" />
        </g>
      ),
      side: (
        <g>
          <path
            d="M150 96c20-34 80-34 100 0"
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <ellipse cx="200" cy="176" rx="70" ry="80" fill={color} stroke={outline} />
          <ellipse cx="200" cy="176" rx="44" ry="52" fill="rgb(0 0 0 / 0.1)" />
        </g>
      ),
      detail: (
        <g>
          <ellipse cx="200" cy="150" rx="110" ry="110" fill={color} stroke={outline} />
          <ellipse cx="200" cy="150" rx="80" ry="80" fill="rgb(20 20 30 / 0.75)" />
          {Array.from({ length: 6 }, (_, i) => (
            <circle
              key={i}
              cx="200"
              cy="150"
              r={12 + i * 11}
              fill="none"
              stroke="rgb(255 255 255 / 0.08)"
            />
          ))}
        </g>
      ),
    },
  };

  return (
    <svg
      viewBox="0 0 400 300"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn("block h-auto w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="30%" cy="20%" r="90%">
          <stop offset="0" style={{ stopColor: "var(--glow-1)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--glow-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-stage)" }} />
        </radialGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b5bd6" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#c77dff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#17171d" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-lens`}>
          <stop offset="0" stopColor="#8b8bf0" />
          <stop offset="1" stopColor="#17171d" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-glow)`} />
      <ellipse cx="200" cy="268" rx="150" ry="10" fill="rgb(16 16 32 / 0.08)" />
      {shapes[kind][view]}
    </svg>
  );
}
