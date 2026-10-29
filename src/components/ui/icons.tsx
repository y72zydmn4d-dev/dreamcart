import type { SVGProps } from "react";

/**
 * Minimal original stroke icon set (24px grid, 1.75 stroke, currentColor). Decorative by default:
 * pair every icon-only control with a visible or `aria-label` text label.
 */
type IconProps = SVGProps<SVGSVGElement> & { readonly size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
export const BagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 8.5h13l-1 11h-11z" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </Icon>
);
export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
  </Icon>
);
export const PackageIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8 12 4l8 4v8l-8 4-8-4z" />
    <path d="m4 8 8 4 8-4M12 12v8" />
  </Icon>
);
