"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartCount } from "@/components/cart/cart-count";
import { NAV_ITEMS } from "@/config/site";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={t("a11y.mainNavigation")}>
      <ul className="flex flex-wrap items-center gap-x-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-3 text-sm transition-colors hover:bg-muted",
                  active
                    ? "bg-accent-soft font-medium text-accent-soft-foreground"
                    : "text-foreground",
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
  );
}
