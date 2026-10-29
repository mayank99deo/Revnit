import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails notifications created in the last day that have not been sent yet,
 * to members who left email updates on. Notifications are written by database
 * triggers; this runs after the studio or a payment creates new ones.
 * Without RESEND_API_KEY members still see them in their notifications page.
 */
export async function deliverPendingEmails(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, title, body, href, profile:profiles!inner(email, full_name, notify_email)")
    .is("emailed_at", null)
    .gte("created_at", since)
    .eq("profile.notify_email", true)
    .limit(200);
  if (error || !pending?.length) return;

  type Row = { id: number; title: string; body: string; href: string | null; profile: { email: string; full_name: string | null } };
  const from = process.env.EMAIL_FROM ?? "Revnit <hello@revnit.com>";
  const sent: number[] = [];

  for (const n of pending as unknown as Row[]) {
    const link = `${siteUrl}${n.href ?? "/account/notifications"}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: n.profile.email,
        subject: n.title,
        text: `${n.body}\n\nOpen in Revnit: ${link}\n\nTurn these emails off in your account settings: ${siteUrl}/account/settings`,
      }),
    });
    if (response.ok) sent.push(n.id);
  }

  if (sent.length) {
    await supabase.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", sent);
  }
}
