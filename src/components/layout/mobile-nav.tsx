"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CartCount } from "@/components/cart/cart-count";
import { MenuIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/config/site";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";

/** Phone navigation: a menu button that opens the primary links in a side sheet. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("nav.openMenu")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-muted md:hidden"
      >
        <MenuIcon />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("nav.menuTitle")}
        closeLabel={t("nav.closeMenu")}
        side="right"
      >
        <nav aria-label={t("a11y.mainNavigation")}>
          <ul className="flex flex-col gap-1">
            {[{ href: "/" as const, labelKey: "nav.home" as const }, ...NAV_ITEMS].map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center rounded-lg px-3 text-base",
                      active
                        ? "bg-accent-soft font-medium text-accent-soft-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {t(item.labelKey)}
                    {item.href === "/cart" ? <CartCount /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
