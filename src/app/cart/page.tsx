import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { getViewer } from "@/lib/data/member";
import { paymentsConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const viewer = await getViewer();
  return (
    <div className="shell pt-10">
      <h1 className="wide mb-8 border-b border-edge pb-6 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Cart</h1>
      <CartView signedIn={Boolean(viewer)} paymentsReady={paymentsConfigured} />
    </div>
  );
}
