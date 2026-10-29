#!/usr/bin/env node
// Production smoke check: starts `next start` on the built app and verifies every route skeleton.
// Zero dependencies. Run after `npm run build`:  npm run smoke
//
// Against a DEPLOYMENT instead of a local build (preview checks, Phase 12):
//   SMOKE_BASE_URL=https://<preview-host> npm run smoke
//   SMOKE_BASE_URL=https://<host> SMOKE_MODE=release npm run smoke   # a release build: no fixtures may appear
//
// Checks per route: HTTP status, Vietnamese document language, the always-visible simulation
// notice, primary navigation, a heading, no third-party script, and the baseline security headers.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.SMOKE_PORT ?? "3187";
const REMOTE = process.env.SMOKE_BASE_URL?.replace(/\/+$/, "") ?? null;
const RELEASE = process.env.SMOKE_MODE === "release";
const BASE = REMOTE ?? `http://127.0.0.1:${PORT}`;
const NOTICE = "Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.";
const NAV_LABEL = 'aria-label="Điều hướng chính"';

const ALL_OK_ROUTES = ["/", "/search", "/product/fx-aero", "/product/fx-nova", "/cart", "/import", "/checkout", "/orders", "/settings", "/privacy", "/collection", "/about", "/credits", "/design"];
// A release build has no synthetic fixtures (so no fixture product pages) and does not publish the /design gallery.
const OK_ROUTES = RELEASE ? ALL_OK_ROUTES.filter((r) => !r.startsWith("/product/fx-") && r !== "/design") : ALL_OK_ROUTES;
// Prototype routes that show synthetic data must say so.
const FIXTURE_ROUTES = ["/", "/product/fx-aero", "/product/fx-nova", "/design"];
const FIXTURE_LABEL = "Dữ liệu mẫu";
const ALL_NOT_FOUND_ROUTES = ["/does-not-exist", "/product/placeholder", "/product/fx-unknown", "/product/Not%20A%20Valid%20Id", "/product/..%2Fsecret"];
const NOT_FOUND_ROUTES = RELEASE ? [...ALL_NOT_FOUND_ROUTES, "/product/fx-aero", "/design"] : ALL_NOT_FOUND_ROUTES;

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error("server did not start within 30 s (did you run `npm run build`?)");
}

function checkShell(route, res, html) {
  check(html.includes('<html lang="vi"'), `${route}: missing lang="vi"`);
  check(html.includes(NOTICE), `${route}: simulation notice missing`);
  check(html.includes(NAV_LABEL), `${route}: primary navigation missing`);
  check(!/<script[^>]+src="https?:\/\//i.test(html), `${route}: third-party script tag found`);
  const csp = res.headers.get("content-security-policy") ?? "";
  check(csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"), `${route}: CSP missing or weak`);
  check(res.headers.get("x-content-type-options") === "nosniff", `${route}: missing nosniff`);
  check(res.headers.get("x-powered-by") === null, `${route}: x-powered-by exposed`);
}

const server = REMOTE
  ? null
  : spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", PORT, "-H", "127.0.0.1"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
let serverLog = "";
server?.stdout.on("data", (d) => (serverLog += d));
server?.stderr.on("data", (d) => (serverLog += d));

try {
  await waitForServer();

  for (const route of OK_ROUTES) {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    check(res.status === 200, `${route}: expected 200, got ${res.status}`);
    check(/<h1[\s>]/.test(html), `${route}: no <h1>`);
    // the visible badge element, not any mention of the words (they also sit in serialized dictionary strings)
    if (RELEASE) check(!new RegExp(`>${FIXTURE_LABEL}<`).test(html), `${route}: synthetic data present in a release build`);
    else if (FIXTURE_ROUTES.includes(route)) check(html.includes(FIXTURE_LABEL), `${route}: synthetic data not labeled`);
    if (REMOTE) check(res.url.startsWith("https://") || BASE.startsWith("http://127."), `${route}: not served over https`);
    checkShell(route, res, html);
  }
  for (const route of NOT_FOUND_ROUTES) {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    check(res.status === 404, `${route}: expected 404, got ${res.status}`);
    checkShell(route, res, html);
  }
} catch (error) {
  failures.push(String(error));
} finally {
  server?.kill("SIGTERM");
}

if (failures.length > 0) {
  console.log(failures.map((f) => `FAIL ${f}`).join("\n"));
  console.log("--- server log ---\n" + serverLog.slice(-1500));
  process.exit(1);
}
console.log(`smoke OK${REMOTE ? ` (${BASE}${RELEASE ? ", release mode" : ""})` : ""}: ${OK_ROUTES.length} routes 200, ${NOT_FOUND_ROUTES.length} routes 404, shell + headers verified`);
