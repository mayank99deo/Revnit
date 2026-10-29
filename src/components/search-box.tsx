"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Suggestion } from "@/lib/types";

type Variant = "header" | "hero";

export function SearchBox({ variant = "header", defaultValue = "" }: { variant?: Variant; defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  // The last row always runs a full search for what was typed.
  const rowCount = query.length >= 2 ? suggestions.length + 1 : 0;

  useEffect(() => setValue(defaultValue), [defaultValue]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (response.ok) {
          setSuggestions(await response.json());
          setActive(-1);
        }
      } catch {
        // Aborted or offline: keep the previous list.
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (variant !== "header") return;
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  function go(index: number) {
    setOpen(false);
    inputRef.current?.blur();
    const suggestion = suggestions[index];
    if (suggestion) {
      router.push(suggestion.kind === "category" ? `/categories/${suggestion.slug}` : `/families/${suggestion.slug}`);
    } else {
      router.push(query ? `/families?q=${encodeURIComponent(query)}` : "/families");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && rowCount) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % rowCount);
    } else if (event.key === "ArrowUp" && rowCount) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? rowCount - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const hero = variant === "hero";
  const showList = open && rowCount > 0;

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        go(active);
      }}
    >
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search families
      </label>
      <div
        className={`flex items-center rounded-xl border transition-[border-color,box-shadow] focus-within:border-blue focus-within:ring-4 focus-within:ring-blue-soft ${
          hero ? "h-16 border-edge bg-paper shadow-[0_10px_30px_-18px_rgb(14_17_22/0.35)]" : "h-10 rounded-lg border-transparent bg-wash focus-within:bg-paper"
        }`}
      >
        <Search className={`shrink-0 text-graphite ${hero ? "ml-5 h-5 w-5" : "ml-3 h-4 w-4"}`} aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={hero ? "e.g. TPN distribution board" : "Search families"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-trace [&::-webkit-search-cancel-button]:hidden ${
            hero ? "px-3 text-base sm:px-4 sm:text-lg" : "px-2.5 text-[15px]"
          }`}
        />
        {hero ? (
          <button type="submit" className="btn btn-primary mr-2 h-12 rounded-lg">
            Search
          </button>
        ) : (
          <kbd className="mr-2 hidden h-6 min-w-6 items-center justify-center rounded border border-edge bg-paper px-1.5 text-xs text-graphite lg:inline-flex">
            /
          </kbd>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="animate-rise absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-edge bg-paper py-1 shadow-[0_18px_40px_-20px_rgb(14_17_22/0.4)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}-${s.slug}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 ${
                active === i ? "bg-blue-soft text-blue-deep" : ""
              }`}
            >
              <span className="truncate">{s.label}</span>
              <span className={`shrink-0 text-[13px] ${active === i ? "text-blue-deep" : "text-graphite"}`}>
                {s.kind === "category" ? "Category" : s.detail}
              </span>
            </li>
          ))}
          <li
            id={`${listId}-${suggestions.length}`}
            role="option"
            aria-selected={active === suggestions.length}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(suggestions.length)}
            onClick={() => go(suggestions.length)}
            className={`flex cursor-pointer items-center gap-2 border-t border-rule px-4 py-2.5 text-[15px] ${
              active === suggestions.length ? "bg-blue-soft text-blue-deep" : ""
            }`}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {suggestions.length ? "See all results for" : "No direct matches. Search all families for"} “{query}”
            </span>
          </li>
        </ul>
      )}
    </form>
  );
}
