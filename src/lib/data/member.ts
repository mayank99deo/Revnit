import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { FamilyCard, Notification } from "@/lib/types";

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  jobTitle: string | null;
  notifyEmail: boolean;
  isAdmin: boolean;
  unread: number;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("full_name, company, job_title, notify_email, role").eq("id", user.id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? null,
    company: profile?.company ?? null,
    jobTitle: profile?.job_title ?? null,
    notifyEmail: profile?.notify_email ?? true,
    isAdmin: profile?.role === "admin",
    unread: count ?? 0,
  };
});

/** For pages that only make sense signed in. */
export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function getFamilyAccess(familyId: string): Promise<{ saved: boolean; owned: boolean; downloaded: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { saved: false, owned: false, downloaded: false };
  const supabase = await createClient();
  const [saved, owned, downloaded] = await Promise.all([
    supabase.from("saves").select("family_id", { count: "exact", head: true }).eq("family_id", familyId).eq("user_id", viewer.id),
    supabase.from("entitlements").select("family_id", { count: "exact", head: true }).eq("family_id", familyId).eq("user_id", viewer.id),
    supabase.from("downloads").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("user_id", viewer.id),
  ]);
  return { saved: (saved.count ?? 0) > 0, owned: (owned.count ?? 0) > 0, downloaded: (downloaded.count ?? 0) > 0 };
}

export async function getOwnedFamilyIds(): Promise<Set<string>> {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("entitlements").select("family_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((r) => r.family_id as string));
}

const CARD_JOIN =
  "family:families!inner(id, slug, name, summary, price_paise, lod, host, is_parametric, tags, cover_path, drawing, revit_min_version, revit_versions, downloads_count, published_at, version_updated_at, version_label, category:categories!inner(slug, name))";

type JoinedFamily = Omit<FamilyCard, "category_slug" | "category_name"> & {
  version_updated_at: string | null;
  version_label: string;
  category: { slug: string; name: string };
};

function flatten({ category, ...family }: JoinedFamily) {
  return { ...family, category_slug: category.slug, category_name: category.name };
}

export type LibraryItem = FamilyCard & {
  version_updated_at: string | null;
  version_label: string;
  owned: boolean;
  last_downloaded_at: string | null;
  /** A new version shipped after this member last downloaded it. */
  has_update: boolean;
};

export async function getLibrary(userId: string): Promise<LibraryItem[]> {
  const supabase = await createClient();
  const [downloads, entitlements] = await Promise.all([
    supabase.from("downloads").select(`created_at, ${CARD_JOIN}`).eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("entitlements").select(`created_at, ${CARD_JOIN}`).eq("user_id", userId),
  ]);

  const items = new Map<string, LibraryItem>();
  type Row = { created_at: string; family: JoinedFamily };

  for (const row of (entitlements.data ?? []) as unknown as Row[]) {
    items.set(row.family.id, { ...flatten(row.family), owned: true, last_downloaded_at: null, has_update: false });
  }
  for (const row of (downloads.data ?? []) as unknown as Row[]) {
    const existing = items.get(row.family.id);
    if (existing?.last_downloaded_at) continue; // rows are newest first
    items.set(row.family.id, {
      ...(existing ?? { ...flatten(row.family), owned: false, has_update: false }),
      last_downloaded_at: row.created_at,
      has_update: row.family.version_updated_at !== null && row.family.version_updated_at > row.created_at,
    });
  }

  return [...items.values()].sort((a, b) =>
    Number(b.has_update) - Number(a.has_update) ||
    (b.last_downloaded_at ?? "").localeCompare(a.last_downloaded_at ?? ""),
  );
}

export async function getSaved(userId: string): Promise<FamilyCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saves")
    .select(`created_at, ${CARD_JOIN}`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as { family: JoinedFamily }[]).map((r) => flatten(r.family));
}

export type OrderSummary = {
  id: string;
  status: string;
  amount_paise: number;
  created_at: string;
  paid_at: string | null;
  razorpay_payment_id: string | null;
  items: { price_paise: number; family: { slug: string; name: string } }[];
};

export async function getOrders(userId: string): Promise<OrderSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, status, amount_paise, created_at, paid_at, razorpay_payment_id, items:order_items(price_paise, family:families(slug, name))")
    .eq("user_id", userId)
    .neq("status", "created")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as OrderSummary[];
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as Notification[];
}

export async function getWatchedCategoryIds(): Promise<Set<number>> {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("category_watches").select("category_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((r) => r.category_id as number));
}

export async function getVotedRequestIds(): Promise<Set<string>> {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("request_votes").select("request_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((r) => r.request_id as string));
}
