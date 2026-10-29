"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data/studio";
import { deliverPendingEmails } from "@/lib/email";
import { FILES_BUCKET, MEDIA_BUCKET } from "@/lib/env";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { HOST_OPTIONS, LOD_OPTIONS } from "@/lib/taxonomy";
import type { FamilyStatus, Parameter, RequestStatus, TypeCatalog } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

async function adminClient() {
  await requireAdmin();
  return createClient();
}

function refresh(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/families/${slug}`);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const supabase = await createClient();
  const root = slugify(base) || "family";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let query = supabase.from("families").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function createFamily(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("category_id"));
  if (name.length < 3 || !categoryId) redirect("/studio/families/new?error=missing");

  const { data, error } = await supabase
    .from("families")
    .insert({ name, slug: await uniqueSlug(name), category_id: categoryId, status: "draft" })
    .select("id")
    .single();
  if (error || !data) redirect("/studio/families/new?error=save");
  redirect(`/studio/families/${data.id}`);
}

export type FamilyDraft = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  category_id: number;
  price_rupees: number;
  lod: string | null;
  host: string | null;
  is_parametric: boolean;
  tags: string[];
  drawing: string | null;
  parameters: Parameter[];
  types: TypeCatalog;
};

export async function saveFamily(id: string, draft: FamilyDraft): Promise<ActionResult> {
  const supabase = await adminClient();

  const name = draft.name.trim();
  if (name.length < 3) return { ok: false, message: "Give the family a name of at least 3 characters." };
  if (!Number.isFinite(draft.price_rupees) || draft.price_rupees < 0) return { ok: false, message: "Price must be 0 or more." };

  const slug = await uniqueSlug(draft.slug || name, id);
  const { error } = await supabase
    .from("families")
    .update({
      name,
      slug,
      summary: draft.summary.trim().slice(0, 240),
      description: draft.description.trim(),
      category_id: draft.category_id,
      price_paise: Math.round(draft.price_rupees * 100),
      lod: LOD_OPTIONS.includes(draft.lod as (typeof LOD_OPTIONS)[number]) ? draft.lod : null,
      host: HOST_OPTIONS.includes(draft.host as (typeof HOST_OPTIONS)[number]) ? draft.host : null,
      is_parametric: draft.is_parametric,
      tags: [...new Set(draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20),
      drawing: draft.drawing || null,
      parameters: draft.parameters.filter((p) => p.name.trim()),
      types: draft.types,
    })
    .eq("id", id);
  if (error) return { ok: false, message: `Not saved: ${error.message}` };

  refresh(slug);
  return { ok: true, message: slug === draft.slug ? "Saved." : `Saved. The page address is now /families/${slug}.` };
}

export async function setFamilyStatus(id: string, status: FamilyStatus): Promise<ActionResult> {
  const supabase = await adminClient();
  if (status === "published") {
    const { count } = await supabase
      .from("family_files")
      .select("id", { count: "exact", head: true })
      .eq("family_id", id)
      .in("kind", ["rfa", "rvt"]);
    if (!count) return { ok: false, message: "Upload at least one .rfa file before publishing." };
  }
  const { data, error } = await supabase.from("families").update({ status }).eq("id", id).select("slug").single();
  if (error) return { ok: false, message: error.message };
  refresh(data.slug);
  await deliverPendingEmails();
  return { ok: true, message: status === "published" ? "Published. Followers of this category have been notified." : "Moved to drafts." };
}

export async function deleteFamily(id: string): Promise<void> {
  const supabase = await adminClient();
  const { data: family } = await supabase.from("families").select("downloads_count, cover_path, gallery_paths, files:family_files(storage_path)").eq("id", id).single();
  if (!family) redirect("/studio/families");

  // Families people have downloaded or bought are archived, never deleted, so libraries stay intact.
  const { count: owners } = await supabase.from("entitlements").select("family_id", { count: "exact", head: true }).eq("family_id", id);
  if (family.downloads_count > 0 || (owners ?? 0) > 0) {
    await supabase.from("families").update({ status: "archived" }).eq("id", id);
  } else {
    const files = (family.files as { storage_path: string }[]).map((f) => f.storage_path);
    if (files.length) await supabase.storage.from(FILES_BUCKET).remove(files);
    const media = [family.cover_path, ...(family.gallery_paths ?? [])].filter(Boolean) as string[];
    if (media.length) await supabase.storage.from(MEDIA_BUCKET).remove(media);
    await supabase.from("families").delete().eq("id", id);
  }
  refresh();
  redirect("/studio/families");
}

export async function recordFile(
  familyId: string,
  file: { storage_path: string; file_name: string; size_bytes: number; kind: string; revit_version: number | null },
): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!file.storage_path.startsWith(`${familyId}/`)) return { ok: false, message: "Unexpected file location." };
  const { error } = await supabase.from("family_files").insert({ family_id: familyId, ...file });
  if (error) {
    await supabase.storage.from(FILES_BUCKET).remove([file.storage_path]);
    return { ok: false, message: error.message };
  }
  refresh();
  return { ok: true };
}

export async function deleteFile(fileId: string): Promise<ActionResult> {
  const supabase = await adminClient();
  const { data: file } = await supabase.from("family_files").select("storage_path").eq("id", fileId).single();
  if (!file) return { ok: false, message: "File not found." };
  const { error } = await supabase.from("family_files").delete().eq("id", fileId);
  if (error) return { ok: false, message: error.message };
  await supabase.storage.from(FILES_BUCKET).remove([file.storage_path]);
  refresh();
  return { ok: true };
}

export async function setMedia(familyId: string, cover: string | null, gallery: string[]): Promise<ActionResult> {
  const supabase = await adminClient();
  const { data: before } = await supabase.from("families").select("cover_path, gallery_paths").eq("id", familyId).single();
  const { error } = await supabase.from("families").update({ cover_path: cover, gallery_paths: gallery }).eq("id", familyId);
  if (error) return { ok: false, message: error.message };

  const kept = new Set([cover, ...gallery]);
  const removed = [before?.cover_path, ...(before?.gallery_paths ?? [])].filter((p): p is string => Boolean(p) && !kept.has(p));
  if (removed.length) await supabase.storage.from(MEDIA_BUCKET).remove(removed);
  refresh();
  return { ok: true };
}

export async function shipUpdate(familyId: string, version: string, notes: string): Promise<ActionResult> {
  const supabase = await adminClient();
  const label = version.trim().replace(/^v/i, "");
  if (!label || notes.trim().length < 5) return { ok: false, message: "Add a version number and a short note on what changed." };
  const { error } = await supabase.from("family_changelog").insert({ family_id: familyId, version_label: label, notes: notes.trim() });
  if (error) return { ok: false, message: error.message };
  refresh();
  await deliverPendingEmails();
  return { ok: true, message: `Version ${label} shipped. Everyone who downloaded or bought it has been notified.` };
}

export async function updateRequest(
  requestId: string,
  change: { status: RequestStatus; family_id: string | null; status_note: string | null },
): Promise<ActionResult> {
  const supabase = await adminClient();
  if (change.status === "shipped" && !change.family_id) {
    return { ok: false, message: "Link the published family before marking a request as published." };
  }
  const { error } = await supabase
    .from("requests")
    .update({ status: change.status, family_id: change.family_id, status_note: change.status_note?.trim() || null })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/requests");
  revalidatePath("/studio/requests");
  await deliverPendingEmails();
  return { ok: true };
}

export async function deleteRequest(requestId: string): Promise<ActionResult> {
  const supabase = await adminClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/requests");
  revalidatePath("/studio/requests");
  return { ok: true };
}
