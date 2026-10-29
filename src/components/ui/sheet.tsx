"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "./icons";

interface SheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly closeLabel: string;
  /** "bottom" on phones (filters), "right" for side panels (menu). */
  readonly side?: "bottom" | "right";
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Modal sheet built on the native <dialog>: focus is trapped and restored, Escape closes,
 * and the page behind is inert, with no extra dependency. Clicking the backdrop also closes.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  side = "bottom",
  children,
  footer,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-surface p-0 text-foreground shadow-sheet",
        side === "bottom"
          ? "animate-sheet-bottom top-auto bottom-0 max-h-[85dvh] w-full rounded-t-2xl"
          : "animate-sheet-right top-0 right-0 left-auto h-dvh w-[min(22rem,90vw)]",
      )}
    >
      <div className={cn("flex flex-col", side === "bottom" ? "max-h-[85dvh]" : "h-full")}>
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
