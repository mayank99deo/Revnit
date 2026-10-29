import "server-only";
import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/taxonomy";
import type {
  CatalogQuery,
  CategoryWithCount,
  Family,
  FamilyCard,
  FamilyRequest,
  RequestStatus,
  Suggestion,
} from "@/lib/types";
import { SAMPLE_FAMILIES, SAMPLE_REQUESTS } from "./sample-catalog";

export const PAGE_SIZE = 24;

type SearchResult = { items: FamilyCard[]; total: number };

interface CatalogSource {
  categories(): Promise<CategoryWithCount[]>;
  search(query: CatalogQuery): Promise<SearchResult>;
  family(slug: string): Promise<Family | null>;
  requests(status?: RequestStatus[]): Promise<FamilyRequest[]>;
  suggest(q: string): Promise<Suggestion[]>;
  logSearch(query: CatalogQuery, results: number): Promise<void>;
}

const CARD_COLUMNS =
  "id, slug, name, summary, price_paise, lod, host, is_parametric, tags, cover_path, drawing, revit_min_version, revit_versions, downloads_count, published_at, category:categories!inner(slug, name)";

type CardRow = Omit<FamilyCard, "category_slug" | "category_name"> & {
  category: { slug: string; name: string };
};

const supabaseSource: CatalogSource = {
  async categories() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, sort_order, families(count)")
      .eq("families.status", "published")
      .order("sort_order");
    if (error) throw error;
    return data.map(({ families, ...c }) => ({
      ...c,
      family_count: (families as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  },

  async search(query) {
    const supabase = await createClient();
    const page = Math.max(1, query.page ?? 1);
    const { data, error } = await supabase.rpc("search_families", {
      p_query: query.q ?? null,
      p_category: query.category ?? null,
      p_revit: query.revit ?? null,
      p_price: query.price ?? null,
      p_sort: query.sort ?? (query.q ? "relevance" : "popular"),
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });
    if (error) throw error;
    const rows = data as (FamilyCard & { total_count: number })[];
    return {
      items: rows.map(({ total_count: _, ...card }) => card),
      total: Number(rows[0]?.total_count ?? 0),
    };
  },

  async family(slug) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("families")
      .select(
        `${CARD_COLUMNS}, category_id, status, description, parameters, types, gallery_paths, version_label, saves_count, updated_at,
         files:family_files(id, kind, revit_version, file_name, size_bytes),
         changelog:family_changelog(id, version_label, notes, created_at)`,
      )
      .eq("slug", slug)
      .order("revit_version", { referencedTable: "family_files", ascending: false })
      .order("created_at", { referencedTable: "family_changelog", ascending: false })
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { category, ...rest } = data as unknown as CardRow & Omit<Family, keyof FamilyCard>;
    return { ...rest, category_slug: category.slug, category_name: category.name } as Family;
  },

  async requests(status) {
    const supabase = await createClient();
    let query = supabase
      .from("requests")
      .select(
        "id, title, details, status, status_note, votes_count, created_at, category:categories(slug, name), family:families(slug)",
      )
      .order("votes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (status?.length) query = query.in("status", status);
    const { data, error } = await query;
    if (error) throw error;
    type Row = Omit<FamilyRequest, "category_slug" | "category_name" | "family_slug"> & {
      category: { slug: string; name: string } | null;
      family: { slug: string } | null;
    };
    return (data as unknown as Row[]).map(({ category, family, ...r }) => ({
      ...r,
      category_slug: category?.slug ?? null,
      category_name: category?.name ?? null,
      family_slug: family?.slug ?? null,
    }));
  },

  async suggest(q) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("suggest", { p_query: q, p_limit: 6 });
    if (error) throw error;
    return data as Suggestion[];
  },

  async logSearch(query, results) {
    if (!query.q) return;
    const supabase = await createClient();
    await supabase.rpc("log_search", {
      p_query: query.q,
      p_results: results,
      p_filters: { category: query.category, revit: query.revit, price: query.price },
    });
  },
};

/* Sample source: same behaviour as the SQL functions, over the bundled catalog. */

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function sampleMatches(family: Family, q: string): number {
  const haystack = tokens([family.name, family.summary, family.category_name, ...family.tags].join(" "));
  const needles = tokens(q);
  if (needles.length === 0) return 1;
  const hits = needles.filter((n) => haystack.some((h) => h.startsWith(n)));
  if (hits.length < needles.length) return 0;
  return hits.length + (tokens(family.name).some((t) => t.startsWith(needles[0])) ? 2 : 0);
}

function sampleCard(f: Family): FamilyCard {
  const {
    id, slug, name, summary, category_slug, category_name, price_paise, lod, host, is_parametric,
    tags, cover_path, drawing, revit_min_version, revit_versions, downloads_count, published_at,
  } = f;
  return {
    id, slug, name, summary, category_slug, category_name, price_paise, lod, host, is_parametric,
    tags, cover_path, drawing, revit_min_version, revit_versions, downloads_count, published_at,
  };
}

const sampleSource: CatalogSource = {
  async categories() {
    return CATEGORIES.map((c) => ({
      ...c,
      family_count: SAMPLE_FAMILIES.filter((f) => f.category_slug === c.slug).length,
    }));
  },

  async search(query) {
    const sort = query.sort ?? (query.q ? "relevance" : "popular");
    const ranked = SAMPLE_FAMILIES.map((f) => ({ f, rank: query.q ? sampleMatches(f, query.q) : 1 }))
      .filter(({ f, rank }) => {
        if (rank === 0) return false;
        if (query.category && f.category_slug !== query.category) return false;
        if (query.revit && (f.revit_min_version ?? Infinity) > query.revit) return false;
        if (query.price === "free" && f.price_paise > 0) return false;
        if (query.price === "paid" && f.price_paise === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "price_asc") return a.f.price_paise - b.f.price_paise;
        if (sort === "price_desc") return b.f.price_paise - a.f.price_paise;
        if (sort === "new") return (b.f.published_at ?? "").localeCompare(a.f.published_at ?? "");
        if (sort === "relevance" && b.rank !== a.rank) return b.rank - a.rank;
        return b.f.downloads_count - a.f.downloads_count;
      });
    const page = Math.max(1, query.page ?? 1);
    return {
      items: ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ f }) => sampleCard(f)),
      total: ranked.length,
    };
  },

  async family(slug) {
    return SAMPLE_FAMILIES.find((f) => f.slug === slug) ?? null;
  },

  async requests(status) {
    return SAMPLE_REQUESTS.filter((r) => !status?.length || status.includes(r.status)).sort(
      (a, b) => b.votes_count - a.votes_count,
    );
  },

  async suggest(q) {
    const categories: Suggestion[] = CATEGORIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 2)
      .map((c) => ({ kind: "category", label: c.name, slug: c.slug, detail: null }));
    const families: Suggestion[] = SAMPLE_FAMILIES.map((f) => ({ f, rank: sampleMatches(f, q) }))
      .filter(({ rank }) => rank > 0)
      .sort((a, b) => b.rank - a.rank || b.f.downloads_count - a.f.downloads_count)
      .slice(0, 6)
      .map(({ f }) => ({ kind: "family", label: f.name, slug: f.slug, detail: f.category_name }));
    return [...categories, ...families];
  },

  async logSearch() {},
};

const source: CatalogSource = supabaseConfigured ? supabaseSource : sampleSource;

export const getCategories = cache(() => source.categories());
export const searchFamilies = (query: CatalogQuery) => source.search(query);
export const getFamily = cache((slug: string) => source.family(slug));
export const getRequests = (status?: RequestStatus[]) => source.requests(status);
export const suggest = (q: string) => source.suggest(q);
export const logSearch = (query: CatalogQuery, results: number) => source.logSearch(query, results);

export async function getRelated(family: Family, limit = 4): Promise<FamilyCard[]> {
  const { items } = await source.search({ category: family.category_slug, sort: "popular" });
  const sameCategory = items.filter((f) => f.id !== family.id);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const { items: popular } = await source.search({ sort: "popular" });
  const extra = popular.filter((f) => f.id !== family.id && !sameCategory.some((s) => s.id === f.id));
  return [...sameCategory, ...extra].slice(0, limit);
}
