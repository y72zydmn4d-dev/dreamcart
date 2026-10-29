"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";
import { useCatalog } from "@/components/catalog/catalog-context";
import { suggest, type Suggestion } from "@/modules/discovery";

interface SearchBoxProps {
  readonly defaultValue?: string;
  readonly size?: "hero" | "compact";
  readonly className?: string;
}

function suggestionHref(s: Suggestion): Route {
  return (
    s.kind === "category" ? `/search?category=${s.category}` : `/product/${s.productId}`
  ) as Route;
}

/**
 * Search field with autocomplete (WAI-ARIA combobox pattern). Suggestions come only from the
 * catalog that exists; Enter without a highlighted suggestion runs a full search.
 */
export function SearchBox({ defaultValue = "", size = "compact", className }: SearchBoxProps) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { view, vocabulary } = useCatalog();
  const items = useMemo(() => suggest(view, value, vocabulary), [view, vocabulary, value]);
  const listId = `${id}-list`;
  const expanded = open && items.length > 0;

  const go = (href: Route) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const chosen = active >= 0 ? items[active] : undefined;
    if (chosen) return go(suggestionHref(chosen));
    const q = value.trim();
    go((q ? `/search?q=${encodeURIComponent(q)}` : "/search") as Route);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const hero = size === "hero";

  return (
    <form role="search" onSubmit={submit} className={cn("relative w-full", className)}>
      <label htmlFor={`${id}-input`} className="sr-only">
        {t("search.label")}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border-strong bg-surface pr-1.5 pl-4 shadow-card transition-shadow focus-within:shadow-float",
          hero ? "min-h-16" : "min-h-13",
        )}
      >
        <SearchIcon className="shrink-0 text-muted-foreground" size={hero ? 22 : 20} />
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={t("search.placeholder")}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-h-11 min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
            hero ? "text-lg" : "text-base",
          )}
        />
        {value ? (
          <button
            type="button"
            aria-label={t("search.clear")}
            onClick={() => {
              setValue("");
              setActive(-1);
            }}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <CloseIcon size={18} />
          </button>
        ) : null}
        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent px-5 font-medium text-accent-foreground hover:opacity-90",
            hero ? "min-h-12 text-base" : "min-h-11 text-sm",
          )}
        >
          {t("search.submit")}
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t("search.suggestions")}
        hidden={!expanded}
        className="animate-fade-up absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-float"
      >
        {items.map((item, index) => (
          <li
            key={item.kind === "category" ? `c-${item.category}` : `p-${item.productId}`}
            id={`${id}-opt-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(suggestionHref(item))}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left",
              index === active ? "bg-accent-soft text-accent-soft-foreground" : "hover:bg-muted",
            )}
          >
            {item.kind === "category" ? (
              <span>
                {t("search.suggestCategory", { name: t(`categories.${item.category}.name`) })}
              </span>
            ) : (
              <>
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t("search.suggestProductHint")}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </form>
  );
}
