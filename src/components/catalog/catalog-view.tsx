import { X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavigateSelect, ParamSelect } from "@/components/auto-submit-select";
import { FamilyGrid } from "@/components/family-card";
import { WatchButton } from "@/components/toggles";
import { getCategories, logSearch, PAGE_SIZE, searchFamilies } from "@/lib/data/catalog";
import { getOwnedFamilyIds, getWatchedCategoryIds } from "@/lib/data/member";
import { pluralize } from "@/lib/format";
import { REVIT_VERSIONS } from "@/lib/taxonomy";
import type { CatalogQuery, SortOption } from "@/lib/types";

type RawParams = Record<string, string | string[] | undefined>;

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "popular", label: "Most downloaded" },
  { value: "new", label: "Newest" },
];

export function parseCatalogQuery(params: RawParams, category?: string): CatalogQuery {
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const revit = Number(one("revit"));
  const price = one("price");
  const sort = one("sort") as SortOption | undefined;
  return {
    q: one("q")?.slice(0, 120),
    category: category ?? one("category"),
    revit: REVIT_VERSIONS.includes(revit) ? revit : undefined,
    price: price === "free" || price === "paid" ? price : undefined,
    sort: SORTS.some((s) => s.value === sort) ? sort : undefined,
    page: Math.max(1, Number(one("page")) || 1),
  };
}

export async function CatalogView({ query }: { query: CatalogQuery }) {
  const [{ items, total }, categories, owned, watched] = await Promise.all([
    searchFamilies(query),
    getCategories(),
    getOwnedFamilyIds(),
    getWatchedCategoryIds(),
  ]);
  if ((query.page ?? 1) === 1) await logSearch(query, total);

  const category = categories.find((c) => c.slug === query.category);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page ?? 1, pages);

  const href = (changes: Partial<CatalogQuery>) => catalogHref({ ...query, page: undefined, ...changes });
  // Category totals describe the whole catalog, so they'd mislead once results are narrowed.
  const narrowed = Boolean(query.q || query.price || query.revit);

  const title = query.q ? `Results for “${query.q}”` : (category?.name ?? "All families");
  const chips = [
    query.q && { label: `“${query.q}”`, remove: href({ q: undefined }) },
    category && query.q && { label: category.name, remove: href({ category: undefined }) },
    query.price && { label: query.price === "free" ? "Free" : "Exclusive", remove: href({ price: undefined }) },
    query.revit && { label: `Opens in Revit ${query.revit}`, remove: href({ revit: undefined }) },
  ].filter(Boolean) as { label: string; remove: string }[];

  return (
    <div className="shell pt-10">
      <nav aria-label="Breadcrumb" className="text-[13px] text-graphite">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/families" className="hover:text-ink hover:underline">
              Families
            </Link>
          </li>
          {category && (
            <>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">
                {category.name}
              </li>
            </>
          )}
        </ol>
      </nav>

      <header className="mt-4 flex flex-col justify-between gap-5 border-b border-edge pb-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h1 className="wide text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] break-words sm:text-5xl">{title}</h1>
          {category && !query.q && <p className="mt-3 text-lg text-graphite">{category.description}</p>}
        </div>
        {category && (
          <WatchButton categoryId={category.id} initial={watched.has(category.id)} label={category.name} />
        )}
      </header>

      <div className="grid gap-10 pt-8 lg:grid-cols-[220px_1fr]">
        <aside aria-label="Filters" className="space-y-8 max-lg:hidden">
          <FilterGroup title="Category">
            <FilterLink href={href({ category: undefined })} active={!query.category}>
              All categories
            </FilterLink>
            {categories.map((c) => (
              <FilterLink key={c.slug} href={href({ category: c.slug })} active={c.slug === query.category} count={narrowed ? undefined : c.family_count}>
                {c.name}
              </FilterLink>
            ))}
          </FilterGroup>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="mr-auto font-semibold" aria-live="polite">
              {pluralize(total, "family", "families")}
            </p>
            <Suspense>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="lg:hidden">
                  <NavigateSelect
                    label="Category"
                    value={href({ category: query.category })}
                    options={[
                      { href: href({ category: undefined }), label: "All categories" },
                      ...categories.map((c) => ({ href: href({ category: c.slug }), label: c.name })),
                    ]}
                  />
                </div>
                <ParamSelect
                  name="price"
                  label="Access"
                  value={query.price ?? ""}
                  options={[
                    { value: "", label: "Any" },
                    { value: "free", label: "Free" },
                    { value: "paid", label: "Exclusive" },
                  ]}
                />
                <ParamSelect
                  name="revit"
                  label="Opens in"
                  value={query.revit ? String(query.revit) : ""}
                  options={[{ value: "", label: "Any Revit" }, ...REVIT_VERSIONS.map((v) => ({ value: String(v), label: `Revit ${v}` }))]}
                />
                <ParamSelect
                  name="sort"
                  label="Sort"
                  value={query.sort ?? (query.q ? "relevance" : "popular")}
                  options={query.q ? SORTS : SORTS.filter((s) => s.value !== "relevance")}
                />
              </div>
            </Suspense>
          </div>

          {chips.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link href={chip.remove} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-soft pr-2.5 pl-3.5 text-[14px] font-medium text-blue-deep hover:bg-blue hover:text-paper">
                    {chip.label}
                    <X className="h-3.5 w-3.5" aria-label="Remove filter" />
                  </Link>
                </li>
              ))}
              {chips.length > 1 && (
                <li>
                  <Link href="/families" className="inline-flex h-8 items-center px-2 text-[14px] text-graphite underline">
                    Clear all
                  </Link>
                </li>
              )}
            </ul>
          )}

          {items.length > 0 ? (
            <FamilyGrid families={items} owned={owned} columns="sm:grid-cols-2 xl:grid-cols-3" />
          ) : (
            <NoResults query={query} categoryName={category?.name} />
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4">
              {page > 1 ? (
                <Link href={href({ page: page - 1 })} className="btn btn-secondary btn-sm">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-[15px] text-graphite">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={href({ page: page + 1 })} className="btn btn-secondary btn-sm">
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/** Categories live at /categories/<slug>; everything else is a query parameter. */
export function catalogHref(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.price) params.set("price", query.price);
  if (query.revit) params.set("revit", String(query.revit));
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const path = query.category ? `/categories/${query.category}` : "/families";
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-2 text-[13px] font-semibold text-graphite">{title}</h2>
      <ul>{children}</ul>
    </div>
  );
}

function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[15px] hover:bg-wash ${active ? "bg-blue-soft font-semibold text-blue-deep" : "text-graphite hover:text-ink"}`}
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-blue" : "border border-trace"}`} aria-hidden="true" />
          {children}
        </span>
        {count !== undefined && <span className="text-[13px] text-graphite">{count}</span>}
      </Link>
    </li>
  );
}

function NoResults({ query, categoryName }: { query: CatalogQuery; categoryName?: string }) {
  const wanted = query.q ?? (categoryName ? `${categoryName} family` : "");
  return (
    <div className="blueprint-grid rounded-2xl border border-edge p-8 md:p-12">
      <h2 className="wide text-2xl font-bold tracking-[-0.02em]">
        {query.q ? `Nothing matches “${query.q}” yet` : "No families match these filters"}
      </h2>
      <p className="mt-3 max-w-xl leading-relaxed text-graphite">
        {query.q
          ? "This search has been noted. Request the family and you’ll be notified when it’s published. The more people ask, the sooner it gets modelled."
          : "Remove a filter to see more, or request the family you were looking for."}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={`/requests?title=${encodeURIComponent(wanted)}#new`} className="btn btn-primary">
          Request this family
        </Link>
        <Link href="/families" className="btn btn-secondary">
          Browse all families
        </Link>
      </div>
    </div>
  );
}
