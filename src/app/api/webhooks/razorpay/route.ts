import { NextResponse, type NextRequest } from "next/server";
import { deliverPendingEmails } from "@/lib/email";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay → Settings → Webhooks, event payment.captured, pointing here.
 * Records the payment even if the buyer closed the tab before the browser
 * reported success. fulfil_order() is idempotent.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } } };
  };
  const payment = event.payload?.payment?.entity;

  if (event.event === "payment.captured" && payment?.order_id) {
    const { error } = await createAdminClient().rpc("fulfil_order", {
      p_razorpay_order_id: payment.order_id,
      p_payment_id: payment.id,
    });
    if (error) return NextResponse.json({ error: "Not recorded" }, { status: 500 });
    await deliverPendingEmails();
  }

  return NextResponse.json({ ok: true });
}
