import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { razorpayKeyId } from "@/lib/env";

function secret(name: "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const auth = Buffer.from(`${razorpayKeyId}:${secret("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!response.ok) {
    throw new Error(`Razorpay order failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

/** Checkout success handler: signature = HMAC(order_id|payment_id, key secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", secret("RAZORPAY_KEY_SECRET")).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", secret("RAZORPAY_WEBHOOK_SECRET")).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
