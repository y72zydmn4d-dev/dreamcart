import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LocalDataProvider } from "@/components/local-data/local-data";
import { StorageNotice } from "@/components/local-data/storage-notice";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { t } from "@/platform/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: t("meta.title"), template: `%s · ${t("brand.name")}` },
  description: t("meta.description"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
        >
          {t("a11y.skipToContent")}
        </a>
        <LocalDataProvider>
          <SiteHeader />
          <StorageNotice />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter />
        </LocalDataProvider>
      </body>
    </html>
  );
}
