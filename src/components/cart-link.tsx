"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "./cart";

export function CartLink() {
  const { items } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-wash" aria-label={`Cart, ${items.length} items`}>
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {items.length > 0 && (
        <span className="absolute top-0.5 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue px-1 text-[11px] font-bold text-paper">
          {items.length}
        </span>
      )}
    </Link>
  );
}
