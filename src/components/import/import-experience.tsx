"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { evaluateUserProduct } from "@/components/cart/resolve-line";
import { useLocalData } from "@/components/local-data/local-data";
import { OutboundLink } from "@/components/product/outbound-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateVi, formatMoney } from "@/lib/format";
import {
  MAX_USER_ATTRIBUTES,
  MAX_USER_PRODUCTS,
  userOfferId,
  type UserProductField,
  type UserProductIssue,
  type UserProductProblem,
} from "@/modules/catalog";
import { CURRENCY_EXPONENTS } from "@/modules/shared/domain/money";
import { parseSafeUrl, type SafeUrlFailure } from "@/modules/shared/domain/safe-url";
import { t, type DictionaryKey } from "@/platform/i18n";
import { saveReasonText } from "@/components/cart/messages";

const URL_FAILURE_ISSUE = {
  empty: "url_empty",
  too_long: "url_too_long",
  invalid: "url_invalid",
  unsupported_scheme: "url_unsupported_scheme",
  has_credentials: "url_has_credentials",
} as const satisfies Record<SafeUrlFailure, UserProductIssue>;

const issueText = (issue: UserProductIssue) => t(`importPage.issue.${issue}` as DictionaryKey);

const inputClass =
  "min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base aria-[invalid=true]:border-[var(--destructive,#b3261e)]";

interface AttributeRow {
  readonly id: number;
  name: string;
  value: string;
}

/**
 * Manual import (ADR-003). Nothing is fetched: the link is validated and cleaned in the browser, the rest is typed
 * by the user, and the result is stored on this device and labeled unverified everywhere it appears.
 */
export function ImportExperience() {
  const data = useLocalData();
  const uid = useId();
  const nextRowId = useRef(1);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [priceText, setPriceText] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [problems, setProblems] = useState<readonly UserProductProblem[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const preview = url.trim() === "" ? null : parseSafeUrl(url);
  const previewHasQuery = preview?.ok ? new URL(preview.url).search !== "" : false;
  const issuesFor = (field: UserProductField) => problems.filter((p) => p.field === field);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await data.importProduct({
      title,
      sourceUrl: url,
      priceText,
      currency,
      attributes: rows.map(({ name, value }) => ({ name, value })),
    });
    setSaving(false);
    if (result.ok) {
      setProblems([]);
      setMessage(t("importPage.saved", { title: result.product.title }));
      setUrl("");
      setTitle("");
      setPriceText("");
      setRows([]);
      return;
    }
    if (result.error === "invalid") {
      setProblems(result.issues);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } else if (result.error === "limit") {
      setProblems([]);
      setMessage(t("importPage.limit", { max: MAX_USER_PRODUCTS }));
    } else {
      setProblems([]);
      setMessage(t("cart.errors.storage", { reason: saveReasonText(result.kind) }));
    }
  };

  const field = (name: UserProductField) => ({
    "aria-invalid": issuesFor(name).length > 0,
    "aria-describedby":
      `${uid}-${name}-help ${issuesFor(name).length > 0 ? `${uid}-${name}-error` : ""}`.trim(),
  });
  const errors = (name: UserProductField) =>
    issuesFor(name).length > 0 ? (
      <p id={`${uid}-${name}-error`} className="text-sm text-destructive">
        {issuesFor(name)
          .map((p) => issueText(p.issue))
          .join(" ")}
      </p>
    ) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          {t("importPage.privacy")}
        </p>

        {problems.length > 0 ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-border-strong bg-warning p-4 text-warning-foreground outline-none"
          >
            <p className="font-medium">{t("importPage.errorSummary")}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {problems.map((p) => (
                <li key={`${p.field}-${p.issue}`}>{issueText(p.issue)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-url`} className="font-medium">
            {t("importPage.url")}
          </label>
          <input
            id={`${uid}-url`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
            {...field("sourceUrl")}
          />
          <p id={`${uid}-sourceUrl-help`} className="text-sm text-muted-foreground">
            {t("importPage.urlHint")}
          </p>
          {errors("sourceUrl")}
          {preview ? (
            <div className="rounded-lg bg-muted p-3 text-sm" aria-live="polite">
              {preview.ok ? (
                <>
                  <p className="font-medium">{t("importPage.urlPreview")}</p>
                  <p className="break-all" data-testid="url-preview">
                    {preview.url}
                  </p>
                  {preview.removedParams.length > 0 ? (
                    <p className="text-muted-foreground">
                      {t("importPage.urlCleaned", { params: preview.removedParams.join(", ") })}
                    </p>
                  ) : null}
                  {previewHasQuery ? (
                    <p className="text-muted-foreground">{t("importPage.urlQuery")}</p>
                  ) : null}
                </>
              ) : (
                <p>{issueText(URL_FAILURE_ISSUE[preview.reason])}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-title`} className="font-medium">
            {t("importPage.name")}
          </label>
          <input
            id={`${uid}-title`}
            type="text"
            value={title}
            maxLength={400}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            {...field("title")}
          />
          <p id={`${uid}-title-help`} className="sr-only">
            {t("importPage.name")}
          </p>
          {errors("title")}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-price`} className="font-medium">
              {t("importPage.price")}
            </label>
            <input
              id={`${uid}-price`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              className={inputClass}
              {...field("price")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-currency`} className="font-medium">
              {t("importPage.currency")}
            </label>
            <select
              id={`${uid}-currency`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
              {...field("currency")}
            >
              {Object.keys(CURRENCY_EXPONENTS).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <p id={`${uid}-price-help`} className="col-span-2 -mt-2 text-sm text-muted-foreground">
            {t("importPage.priceHint")}
          </p>
          <p id={`${uid}-currency-help`} className="sr-only">
            {t("importPage.currency")}
          </p>
          <div className="col-span-2 -mt-2">
            {errors("price")}
            {errors("currency")}
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-medium">{t("importPage.attributes")}</legend>
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <input
                aria-label={t("importPage.attributeName", { index: index + 1 })}
                value={row.name}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                  )
                }
                className={inputClass}
              />
              <input
                aria-label={t("importPage.attributeValue", { index: index + 1 })}
                value={row.value}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                  )
                }
                className={inputClass}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("importPage.removeAttribute", { index: index + 1 })}
                onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
              >
                ×
              </Button>
            </div>
          ))}
          <p id={`${uid}-attributes-help`} className="sr-only">
            {t("importPage.attributes")}
          </p>
          {errors("attributes")}
          {rows.length < MAX_USER_ATTRIBUTES ? (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows((rs) => [...rs, { id: nextRowId.current++, name: "", value: "" }]);
                }}
              >
                {t("importPage.addAttribute")}
              </Button>
            </div>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={saving || data.status !== "ready"}>
            {saving ? t("importPage.saving") : t("importPage.save")}
          </Button>
          <p role="status" className={message ? "text-sm" : "sr-only"} data-testid="import-status">
            {message}
          </p>
        </div>
      </form>

      <section aria-labelledby="imported-heading" className="flex flex-col gap-3">
        <h2 id="imported-heading" className="text-title font-semibold">
          {t("importPage.listTitle")}
        </h2>
        {data.userProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong bg-surface p-4 text-muted-foreground">
            {t("importPage.listEmpty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {[...data.userProducts]
              .sort((a, b) => b.createdAtMs - a.createdAtMs)
              .map((product) => {
                const evaluation = evaluateUserProduct(product);
                return (
                  <li
                    key={product.id}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">{product.title}</h3>
                        {Object.keys(product.attributes).length > 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {Object.entries(product.attributes)
                              .map(([name, value]) => `${name}: ${value}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {t("importPage.entered", {
                            date: formatDateVi(new Date(product.createdAtMs).toISOString()),
                          })}
                        </p>
                      </div>
                      <Badge tone="warning">{t("cart.line.unverified")}</Badge>
                    </div>
                    <p className="font-semibold">
                      {product.price
                        ? formatMoney(product.price.amountMinor, product.price.currency)
                        : t("importPage.noPrice")}
                    </p>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col items-start gap-1">
                        <OutboundLink url={product.sourceUrl} label={t("importPage.open")} />
                        {confirmDelete === product.id ? (
                          <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground">
                              {t("importPage.deleteNote")}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await data.deleteUserProduct(product.id);
                                setConfirmDelete(null);
                                setMessage(t("importPage.deleted", { title: product.title }));
                              }}
                            >
                              {t("importPage.deleteConfirm", { title: product.title })}
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(product.id)}
                            className="min-h-11 cursor-pointer text-sm underline underline-offset-2"
                          >
                            {t("importPage.delete", { title: product.title })}
                          </button>
                        )}
                      </div>
                      {evaluation.addable && product.price ? (
                        <AddToCartButton
                          variantId={product.id}
                          offerId={userOfferId(product.id)}
                          unitPrice={{
                            amountMinor: product.price.amountMinor,
                            currency: product.price.currency,
                          }}
                          evaluation={evaluation}
                          title={product.title}
                          merchant={t("cart.line.userMerchant")}
                        />
                      ) : (
                        <Badge tone="warning">
                          {t(`price.cartBlock.${evaluation.reason ?? "no_price"}` as DictionaryKey)}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          <Link href="/cart" className="underline underline-offset-2">
            {t("cart.viewCart")}
          </Link>
        </p>
      </section>
    </div>
  );
}
