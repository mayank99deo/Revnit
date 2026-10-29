"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart";
import { FamilyDrawing } from "./drawings/family-drawing";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: () => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export function CartView({ signedIn, paymentsReady }: { signedIn: boolean; paymentsReady: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "starting" | "paying" | "verifying">("idle");
  const [error, setError] = useState("");
  const total = cart.items.reduce((sum, item) => sum + item.price_paise, 0);

  async function pay() {
    setError("");
    setState("starting");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyIds: cart.items.map((i) => i.id) }),
    });
    const order = await response.json();

    if (!response.ok) {
      for (const id of order.owned ?? []) cart.remove(id);
      setError(order.error ?? "Checkout couldn't start. Try again.");
      setState("idle");
      return;
    }
    for (const id of order.skipped ?? []) cart.remove(id);

    if (!window.Razorpay) {
      setError("The payment window didn't load. Check your connection and try again.");
      setState("idle");
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: "INR",
      name: "Revnit",
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#000000" },
      modal: { ondismiss: () => setState("idle") },
      handler: async (result: RazorpayResponse) => {
        setState("verifying");
        const verify = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        if (verify.ok) {
          cart.clear();
          router.push("/account?purchased=1");
          router.refresh();
        } else {
          setError("Payment went through but we couldn't confirm it yet. It will appear in your library within a few minutes.");
          setState("idle");
        }
      },
    });
    checkout.on("payment.failed", () => setError("The payment failed. No money was taken. Try another method."));
    setState("paying");
    checkout.open();
  }

  if (!cart.ready) return <div className="h-40" />;

  if (cart.items.length === 0) {
    return (
      <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
        <h2 className="wide text-2xl font-bold tracking-[-0.02em]">Your cart is empty</h2>
        <p className="mt-2 text-graphite">Exclusive families you add will wait here. Free families download straight from their page.</p>
        <Link href="/families?price=paid" className="btn btn-primary mt-6">
          Browse exclusive families
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      {paymentsReady && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      <ul className="space-y-3">
        {cart.items.map((item) => (
          <li key={item.id} className="panel flex items-center gap-4 p-3 pr-4">
            <div className="blueprint-grid relative hidden aspect-[16/11] w-28 shrink-0 overflow-hidden rounded-lg sm:block">
              <div className="hatch absolute inset-x-0 top-0 h-1" aria-hidden="true" />
              <FamilyDrawing kind={item.drawing ?? null} className="h-full w-full p-2 text-line" />
            </div>
            <div className="min-w-0 flex-1">
              {item.category_name && <p className="text-[13px] text-graphite">{item.category_name}</p>}
              <Link href={`/families/${item.slug}`} className="semiwide text-lg font-semibold hover:text-blue">
                {item.name}
              </Link>
            </div>
            <span className="text-lg font-semibold">{formatPrice(item.price_paise)}</span>
            <button
              type="button"
              onClick={() => cart.remove(item.id)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-graphite hover:bg-red-soft hover:text-red"
              aria-label={`Remove ${item.name}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <div className="self-start rounded-xl border border-edge p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-graphite">Total</span>
          <span className="wide text-3xl font-extrabold">{formatPrice(total)}</span>
        </div>
        <p className="mt-1 text-right text-[13px] text-graphite">Charged in Indian rupees</p>

        {signedIn ? (
          <button
            type="button"
            onClick={pay}
            disabled={!paymentsReady || state !== "idle"}
            className="btn btn-primary mt-6 w-full"
          >
            {state === "starting"
              ? "Preparing payment"
              : state === "paying"
                ? "Complete payment in the window"
                : state === "verifying"
                  ? "Confirming payment"
                  : `Pay ${formatPrice(total)}`}
          </button>
        ) : (
          <Link href="/sign-in?next=/cart" className="btn btn-primary mt-6 w-full">
            Sign in to pay
          </Link>
        )}
        {!paymentsReady && (
          <p className="mt-3 text-[13px] text-graphite">Payments aren’t switched on yet. Add the Razorpay keys to enable checkout.</p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[14px] font-medium">
            {error}
          </p>
        )}
        <ul className="mt-6 space-y-2 border-t border-rule pt-4 text-[13px] text-graphite">
          <li>Files unlock in your library the moment payment is confirmed.</li>
          <li>Includes every Revit version listed and future updates.</li>
          <li>UPI, cards, netbanking and wallets via Razorpay.</li>
        </ul>
      </div>
    </div>
  );
}
