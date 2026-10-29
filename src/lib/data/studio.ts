import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Family, FamilyRequest } from "@/lib/types";
import { getViewer, type Viewer } from "./member";

/** Studio pages 404 for everyone but the admin, so the area isn't advertised. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

export type Overview = {
  downloads: number;
  downloads_prev: number;
  revenue_paise: number;
  revenue_prev_paise: number;
  orders: number;
  members: number;
  members_new: number;
  searches: number;
  searches_unmatched: number;
  requests_open: number;
  published: number;
  drafts: number;
};

export type DailyActivity = { day: string; downloads: number; signups: number; revenue_paise: number };
export type TopFamily = { id: string; slug: string; name: string; price_paise: number; downloads: number; buyers: number };
export type SearchDemand = { query: string; searches: number; unmatched: number; members: number; last_searched: string };

export async function getOverview(days = 30) {
  const supabase = await createClient();
  const [overview, daily, top, demand] = await Promise.all([
    supabase.rpc("studio_overview", { p_days: days }),
    supabase.rpc("studio_daily_activity", { p_days: days }),
    supabase.rpc("studio_top_families", { p_days: days, p_limit: 6 }),
    supabase.rpc("studio_search_demand", { p_days: days, p_unmatched_only: true }),
  ]);
  if (overview.error) throw overview.error;
  return {
    overview: overview.data as Overview,
    daily: ((daily.data ?? []) as DailyActivity[]).map((d) => ({ ...d, downloads: Number(d.downloads), signups: Number(d.signups) })),
    top: ((top.data ?? []) as TopFamily[]).map((t) => ({ ...t, downloads: Number(t.downloads), buyers: Number(t.buyers) })),
    demand: ((demand.data ?? []) as SearchDemand[]).slice(0, 8),
  };
}

export async function getSearchDemand(days: number, unmatchedOnly: boolean): Promise<SearchDemand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("studio_search_demand", { p_days: days, p_unmatched_only: unmatchedOnly });
  if (error) throw error;
  return (data ?? []).map((d: SearchDemand) => ({ ...d, searches: Number(d.searches), unmatched: Number(d.unmatched), members: Number(d.members) }));
}

export type StudioFamilyRow = {
  id: string;
  slug: string;
  name: string;
  status: Family["status"];
  price_paise: number;
  downloads_count: number;
  revit_versions: number[];
  updated_at: string;
  category: { name: string };
};

export async function getStudioFamilies(): Promise<StudioFamilyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .select("id, slug, name, status, price_paise, downloads_count, revit_versions, updated_at, category:categories(name)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as unknown as StudioFamilyRow[];
}

export type EditableFamily = Omit<Family, "category_slug" | "category_name" | "files"> & {
  files: (Family["files"][number] & { storage_path: string; created_at: string })[];
};

export async function getEditableFamily(id: string): Promise<EditableFamily | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .select(
      `*, files:family_files(id, kind, revit_version, file_name, size_bytes, storage_path, created_at),
       changelog:family_changelog(id, version_label, notes, created_at)`,
    )
    .eq("id", id)
    .order("revit_version", { referencedTable: "family_files", ascending: false })
    .order("created_at", { referencedTable: "family_changelog", ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data as EditableFamily | null;
}

export type StudioRequest = FamilyRequest & { family_id: string | null; requester: { email: string } | null };

export async function getStudioRequests(): Promise<StudioRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, title, details, status, status_note, votes_count, created_at, family_id, category:categories(slug, name), family:families(slug), requester:profiles(email)",
    )
    .order("status")
    .order("votes_count", { ascending: false });
  if (error) throw error;
  type Row = Omit<StudioRequest, "category_slug" | "category_name" | "family_slug"> & {
    category: { slug: string; name: string } | null;
    family: { slug: string } | null;
  };
  return (data as unknown as Row[]).map(({ category, family, ...r }) => ({
    ...r,
    category_slug: category?.slug ?? null,
    category_name: category?.name ?? null,
    family_slug: family?.slug ?? null,
  }));
}

export type StudioOrder = {
  id: string;
  status: string;
  amount_paise: number;
  created_at: string;
  paid_at: string | null;
  razorpay_payment_id: string | null;
  buyer: { email: string; full_name: string | null } | null;
  items: { price_paise: number; family: { name: string; slug: string } }[];
};

export async function getStudioOrders(): Promise<StudioOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, amount_paise, created_at, paid_at, razorpay_payment_id, buyer:profiles(email, full_name), items:order_items(price_paise, family:families(name, slug))")
    .neq("status", "created")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as StudioOrder[];
}

export async function getFamilyOptions(): Promise<{ id: string; name: string; status: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("families").select("id, name, status").order("name");
  return data ?? [];
}
