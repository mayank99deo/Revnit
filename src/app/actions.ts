"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/member";
import { createClient } from "@/lib/supabase/server";

export type ToggleResult = { ok: true } | { ok: false; reason: "sign_in" | "error" };

export type FormState = { status: "idle" | "success" | "error"; message?: string };

async function signedInClient() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return { viewer, supabase: await createClient() };
}

export async function setSaved(familyId: string, saved: boolean): Promise<ToggleResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, reason: "sign_in" };
  const { viewer, supabase } = session;
  const { error } = saved
    ? await supabase.from("saves").upsert({ user_id: viewer.id, family_id: familyId }, { ignoreDuplicates: true })
    : await supabase.from("saves").delete().eq("user_id", viewer.id).eq("family_id", familyId);
  if (error) return { ok: false, reason: "error" };
  revalidatePath("/account/saved");
  return { ok: true };
}

export async function setWatching(categoryId: number, watching: boolean): Promise<ToggleResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, reason: "sign_in" };
  const { viewer, supabase } = session;
  const { error } = watching
    ? await supabase.from("category_watches").upsert({ user_id: viewer.id, category_id: categoryId }, { ignoreDuplicates: true })
    : await supabase.from("category_watches").delete().eq("user_id", viewer.id).eq("category_id", categoryId);
  return error ? { ok: false, reason: "error" } : { ok: true };
}

export async function setVote(requestId: string, voted: boolean): Promise<ToggleResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, reason: "sign_in" };
  const { viewer, supabase } = session;
  const { error } = voted
    ? await supabase.from("request_votes").upsert({ user_id: viewer.id, request_id: requestId }, { ignoreDuplicates: true })
    : await supabase.from("request_votes").delete().eq("user_id", viewer.id).eq("request_id", requestId);
  if (error) return { ok: false, reason: "error" };
  revalidatePath("/requests");
  return { ok: true };
}

export async function createRequest(_: FormState, formData: FormData): Promise<FormState> {
  const session = await signedInClient();
  if (!session) return { status: "error", message: "Sign in to send a request." };

  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const categoryId = Number(formData.get("category_id")) || null;

  if (title.length < 4) return { status: "error", message: "Describe the family in at least 4 characters." };
  if (title.length > 140) return { status: "error", message: "Keep the name under 140 characters. Put the rest in details." };

  const { error } = await session.supabase
    .from("requests")
    .insert({ user_id: session.viewer.id, title, details: details.slice(0, 2000), category_id: categoryId });
  if (error) return { status: "error", message: "The request wasn't saved. Try again in a moment." };

  revalidatePath("/requests");
  return { status: "success", message: "Request sent. You’ll be notified as it moves to planned, modelling and published." };
}

export async function markAllRead(): Promise<void> {
  const session = await signedInClient();
  if (!session) return;
  await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.viewer.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}

export async function updateSettings(_: FormState, formData: FormData): Promise<FormState> {
  const session = await signedInClient();
  if (!session) return { status: "error", message: "Your session ended. Sign in again." };

  const clean = (key: string) => String(formData.get(key) ?? "").trim().slice(0, 120) || null;
  const { error } = await session.supabase
    .from("profiles")
    .update({
      full_name: clean("full_name"),
      company: clean("company"),
      job_title: clean("job_title"),
      notify_email: formData.get("notify_email") === "on",
    })
    .eq("id", session.viewer.id);
  if (error) return { status: "error", message: "Settings weren't saved. Try again." };

  revalidatePath("/", "layout");
  return { status: "success", message: "Settings saved." };
}
