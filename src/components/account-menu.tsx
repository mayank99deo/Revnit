"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = { name: string | null; email: string; unread: number; isAdmin: boolean };

export function AccountMenu({ name, email, unread, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || email).trim().charAt(0).toUpperCase();
  const links = [
    { href: "/account", label: "Library" },
    { href: "/account/saved", label: "Saved" },
    { href: "/account/notifications", label: unread ? `Notifications (${unread})` : "Notifications" },
    { href: "/account/orders", label: "Orders" },
    { href: "/account/settings", label: "Settings" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread ? `Account, ${unread} unread notifications` : "Account"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-soft text-[15px] font-bold text-blue-deep hover:bg-blue hover:text-paper"
      >
        {initial}
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper bg-red" />}
      </button>
      {open && (
        <div role="menu" className="animate-rise absolute top-full right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-edge bg-paper shadow-[0_18px_40px_-20px_rgb(14_17_22/0.4)]">
          <div className="border-b border-rule px-4 py-3">
            <p className="truncate font-semibold">{name || "Your account"}</p>
            <p className="truncate text-[13px] text-graphite">{email}</p>
          </div>
          <ul className="py-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link role="menuitem" href={link.href} className="block px-4 py-2 hover:bg-wash">
                  {link.label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li className="border-t border-rule">
                <Link role="menuitem" href="/studio" className="block px-4 py-2 font-semibold text-blue hover:bg-wash">
                  Studio
                </Link>
              </li>
            )}
          </ul>
          <form action="/auth/sign-out" method="post" className="border-t border-rule">
            <button role="menuitem" type="submit" className="w-full px-4 py-2.5 text-left text-graphite hover:bg-wash hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
