import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-accent-soft text-accent-soft-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        simulation: "bg-simulation text-simulation-foreground",
        /** Marks synthetic prototype data so it can never pass as a real catalog entry. */
        fixture: "border border-dashed border-border-strong bg-surface text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
