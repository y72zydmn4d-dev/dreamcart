"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { saveReasonText } from "@/components/cart/messages";
import { useLocalData } from "@/components/local-data/local-data";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateVi } from "@/lib/format";
import type { BackupBundle } from "@/modules/data-portability";
import { SCENARIO_KEYS, type ScenarioKey } from "@/modules/orders";
import { t, type DictionaryKey } from "@/platform/i18n";

const radioClass =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 has-checked:border-accent has-checked:bg-accent-soft";

type Persisted = "yes" | "no" | "unknown";

/** Every data-control action is explicit and says what it will do to this device. Nothing leaves the browser. */
export function SettingsExperience() {
  const data = useLocalData();
  const [persisted, setPersisted] = useState<Persisted>("unknown");
  const [persistMessage, setPersistMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [parsed, setParsed] = useState<
    { bundle: BackupBundle } | { error: string; issues: string[] } | null
  >(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [replaceOk, setReplaceOk] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [resetOk, setResetOk] = useState(false);
  const [fileName, setFileName] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const storage = typeof navigator === "undefined" ? undefined : navigator.storage;
    if (storage?.persisted) {
      storage
        .persisted()
        .then((p) => !cancelled && setPersisted(p ? "yes" : "no"))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (data.status === "loading") {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {t("settings.loading")}
      </p>
    );
  }

  const requestPersist = async () => {
    try {
      const granted = await navigator.storage.persist();
      setPersisted(granted ? "yes" : "no");
      setPersistMessage(granted ? t("settings.persistGranted") : t("settings.persistDenied"));
    } catch {
      setPersistMessage(t("settings.persistDenied"));
    }
  };

  const download = async () => {
    const result = await data.exportBackup();
    if (!result.ok) {
      setExportMessage(t("cart.errors.storage", { reason: saveReasonText(result.kind) }));
      return;
    }
    const url = URL.createObjectURL(new Blob([result.text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(t("settings.exported", { count: result.orders }));
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? "");
    setRestoreMessage("");
    setReplaceOk(false);
    if (!file) {
      setParsed(null);
      return;
    }
    const text = await file.text();
    const result = data.parseBackupText(text);
    if (result.ok) setParsed({ bundle: result.bundle });
    else
      setParsed({
        error: t(`settings.restoreErrors.${result.error}` as DictionaryKey),
        issues: result.issues.slice(0, 5).map((i) => `${i.path || "$"}: ${i.message}`),
      });
  };

  const restore = async () => {
    if (!parsed || !("bundle" in parsed)) return;
    if (mode === "replace" && !replaceOk) return;
    const result = await data.restoreBackup(
      parsed.bundle,
      mode === "replace" ? { mode: "replace", confirmed: true } : { mode: "merge" },
    );
    if (result.ok) {
      const r = result.report;
      setRestoreMessage(
        t("settings.restored", {
          added: r.addedOrders,
          skipped: r.skippedExisting,
          conflicts: r.conflicts.length,
          removed: r.removedOrders,
        }),
      );
      setParsed(null);
      setReplaceOk(false);
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
    } else {
      setRestoreMessage(t("settings.restoreFailed", { reason: saveReasonText(result.kind) }));
    }
  };

  const reset = async () => {
    if (!resetOk) return;
    const done = await data.resetAll();
    setResetMessage(done ? t("settings.resetDone") : t("settings.resetFailed"));
    setResetOk(false);
    setParsed(null);
  };

  const canPersist = typeof navigator !== "undefined" && Boolean(navigator.storage?.persist);

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-title font-semibold">{t("settings.scenarioHeading")}</legend>
        <p className="text-sm text-muted-foreground">{t("settings.scenarioBody")}</p>
        {SCENARIO_KEYS.map((key: ScenarioKey) => (
          <label key={key} className={radioClass}>
            <input
              type="radio"
              name="default-scenario"
              checked={data.settings.defaultScenario === key}
              onChange={() => void data.updateSettings({ defaultScenario: key })}
              className="mt-1 size-4 accent-(--accent)"
            />
            <span className="font-medium">
              {t(`checkout.scenario.${key}.name` as DictionaryKey)}
            </span>
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="storage-heading" className="flex flex-col gap-2">
        <h2 id="storage-heading" className="text-title font-semibold">
          {t("settings.storageHeading")}
        </h2>
        <p>
          {persisted === "yes"
            ? t("settings.persisted")
            : persisted === "no"
              ? t("settings.notPersisted")
              : t("settings.persistUnknown")}
        </p>
        {persisted !== "yes" && canPersist ? (
          <div>
            <Button variant="outline" onClick={requestPersist}>
              {t("settings.requestPersist")}
            </Button>
          </div>
        ) : null}
        <p role="status" className={persistMessage ? "text-sm" : "sr-only"}>
          {persistMessage}
        </p>
      </section>

      <section aria-labelledby="backup-heading" className="flex flex-col gap-3">
        <h2 id="backup-heading" className="text-title font-semibold">
          {t("settings.backupHeading")}
        </h2>
        <p className="text-muted-foreground">{t("settings.backupBody")}</p>
        <div>
          <Button onClick={download}>{t("settings.export")}</Button>
        </div>
        <p role="status" className={exportMessage ? "text-sm" : "sr-only"}>
          {exportMessage}
        </p>
      </section>

      <section aria-labelledby="restore-heading" className="flex flex-col gap-3">
        <h2 id="restore-heading" className="text-title font-semibold">
          {t("settings.restoreHeading")}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* The browser's own file control is in the browser's language; this one speaks Vietnamese. */}
          <label
            className={cn(
              buttonVariants({ variant: "outline" }),
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={chooseFile}
              className="sr-only"
            />
            {t("settings.restoreFile")}
          </label>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {fileName || t("settings.noFile")}
          </span>
        </div>
        {parsed && "error" in parsed ? (
          <div role="alert" className="rounded-xl bg-warning p-4 text-warning-foreground">
            <p className="font-medium">{t("settings.restoreInvalid")}</p>
            <p>{parsed.error}</p>
            {parsed.issues.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-sm">
                {parsed.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {parsed && "bundle" in parsed ? (
          <div className="flex flex-col gap-3">
            <p data-testid="restore-summary">
              {t("settings.restoreSummary", {
                orders: parsed.bundle.data.orders.length,
                items: parsed.bundle.data.userProducts.length,
                lines: parsed.bundle.data.cart.lines.length,
                date: formatDateVi(parsed.bundle.exportedAt),
              })}
            </p>
            <fieldset className="flex flex-col gap-2">
              <label className={radioClass}>
                <input
                  type="radio"
                  name="restore-mode"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                  className="mt-1 size-4 accent-(--accent)"
                />
                <span>{t("settings.modeMerge")}</span>
              </label>
              <label className={radioClass}>
                <input
                  type="radio"
                  name="restore-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="mt-1 size-4 accent-(--accent)"
                />
                <span>{t("settings.modeReplace")}</span>
              </label>
            </fieldset>
            {mode === "replace" ? (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={replaceOk}
                  onChange={(e) => setReplaceOk(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-(--accent)"
                />
                <span>{t("settings.replaceConfirm")}</span>
              </label>
            ) : null}
            <div>
              <Button onClick={restore} disabled={mode === "replace" && !replaceOk}>
                {t("settings.restore")}
              </Button>
            </div>
          </div>
        ) : null}
        <p
          role="status"
          className={restoreMessage ? "text-sm" : "sr-only"}
          data-testid="restore-status"
        >
          {restoreMessage}
        </p>
      </section>

      <section aria-labelledby="reset-heading" className="flex flex-col gap-3">
        <h2 id="reset-heading" className="text-title font-semibold">
          {t("settings.resetHeading")}
        </h2>
        <p className="text-muted-foreground">{t("settings.resetBody")}</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={resetOk}
            onChange={(e) => setResetOk(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-(--accent)"
          />
          <span>{t("settings.resetConfirm")}</span>
        </label>
        <div>
          <Button variant="outline" onClick={reset} disabled={!resetOk}>
            {t("settings.reset")}
          </Button>
        </div>
        <p
          role="status"
          className={resetMessage ? "text-sm" : "sr-only"}
          data-testid="reset-status"
        >
          {resetMessage}
        </p>
      </section>
    </div>
  );
}
