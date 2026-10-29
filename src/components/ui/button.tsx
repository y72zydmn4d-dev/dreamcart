import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Also used to style `<Link>` as a button, so links and buttons share one visual language. */
export const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow,opacity] duration-(--duration-fast) ease-standard disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 aria-disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:opacity-90 active:opacity-80",
        secondary: "bg-muted text-foreground hover:bg-border",
        outline: "border border-border-strong bg-surface text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        default: "",
        sm: "px-4 text-sm",
        lg: "min-h-12 px-7 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
