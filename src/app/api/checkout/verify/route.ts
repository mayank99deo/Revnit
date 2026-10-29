import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/data/member";
import { deliverPendingEmails } from "@/lib/email";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/** Called by the browser after Razorpay Checkout succeeds. The webhook is the backup. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");

  if (!orderId || !paymentId || !verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("user_id").eq("razorpay_order_id", orderId).single();
  if (!order || order.user_id !== viewer.id) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const { error } = await admin.rpc("fulfil_order", { p_razorpay_order_id: orderId, p_payment_id: paymentId });
  if (error) return NextResponse.json({ error: "Payment received but not recorded. Contact support." }, { status: 500 });

  await deliverPendingEmails();
  return NextResponse.json({ ok: true });
}
