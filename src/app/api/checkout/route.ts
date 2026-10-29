import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/data/member";
import { paymentsConfigured, razorpayKeyId } from "@/lib/env";
import { createRazorpayOrder } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/** Prices come from the database, never from the cart in the browser. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (!paymentsConfigured) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { familyIds?: unknown } | null;
  const ids = Array.isArray(body?.familyIds) ? body.familyIds.filter((id): id is string => typeof id === "string").slice(0, 50) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: families }, { data: owned }] = await Promise.all([
    admin.from("families").select("id, name, price_paise").in("id", ids).eq("status", "published").gt("price_paise", 0),
    admin.from("entitlements").select("family_id").eq("user_id", viewer.id).in("family_id", ids),
  ]);

  const ownedIds = new Set((owned ?? []).map((o) => o.family_id));
  const items = (families ?? []).filter((f) => !ownedIds.has(f.id));
  if (items.length === 0) {
    return NextResponse.json({ error: "You already own everything in your cart.", owned: [...ownedIds] }, { status: 409 });
  }

  const amount = items.reduce((sum, f) => sum + f.price_paise, 0);
  const { data: order, error } = await admin
    .from("orders")
    .insert({ user_id: viewer.id, amount_paise: amount })
    .select("id")
    .single();
  if (error || !order) return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });

  await admin.from("order_items").insert(items.map((f) => ({ order_id: order.id, family_id: f.id, price_paise: f.price_paise })));

  try {
    const razorpay = await createRazorpayOrder({
      amountPaise: amount,
      receipt: order.id,
      notes: { order_id: order.id, user_id: viewer.id },
    });
    await admin.from("orders").update({ razorpay_order_id: razorpay.id }).eq("id", order.id);

    return NextResponse.json({
      keyId: razorpayKeyId,
      razorpayOrderId: razorpay.id,
      amount,
      description: items.length === 1 ? items[0].name : `${items.length} Revit families`,
      prefill: { email: viewer.email, name: viewer.name ?? "" },
      skipped: [...ownedIds],
    });
  } catch {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ error: "The payment provider didn't respond. Try again." }, { status: 502 });
  }
}
