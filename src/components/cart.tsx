"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price_paise: number;
  category_name?: string;
  drawing?: string | null;
};

type CartState = {
  items: CartItem[];
  ready: boolean;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "revnit:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // Private mode or corrupted value: start with an empty cart.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback(
    (item: CartItem) => setItems((current) => (current.some((i) => i.id === item.id) ? current : [...current, item])),
    [],
  );
  const remove = useCallback((id: string) => setItems((current) => current.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const value = useMemo(() => ({ items, ready, add, remove, clear, has }), [items, ready, add, remove, clear, has]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider");
  return cart;
}
