"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { parseSafeUrl } from "@/modules/shared/domain/safe-url";
import { t } from "@/platform/i18n";

/**
 * A link to a source page outside DreamCart. The address is re-validated as a SafeUrl at render time (http or https
 * only), and following it first shows the "leaving DreamCart" notice, so nobody mistakes a merchant page for a purchase.
 */
export function OutboundLink({
  url,
  label,
  synthetic = false,
}: {
  readonly url: string;
  readonly label: string;
  /** A fictional fixture address: the notice says plainly that it is a sample, not a verified merchant. */
  readonly synthetic?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const safe = parseSafeUrl(url);
  if (!safe.ok) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-accent underline underline-offset-2"
      >
        {label}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("product.leaveTitle")}
        closeLabel={t("product.leaveClose")}
        side="bottom"
        footer={
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              {t("product.leaveCancel")}
            </Button>
            <a
              href={safe.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {t("product.leaveContinue")}
            </a>
          </div>
        }
      >
        <p>{t(synthetic ? "fixture.leaveBody" : "product.leaveBody")}</p>
        <p className="mt-3 text-sm break-all text-muted-foreground">{safe.url}</p>
      </Sheet>
    </>
  );
}
