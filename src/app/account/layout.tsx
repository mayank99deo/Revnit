import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const LINKS = [
  { href: "/account", label: "Library" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/settings", label: "Settings" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell pt-10">
      <nav aria-label="Account" className="mb-8 flex gap-1 overflow-x-auto border-b border-edge">
        {LINKS.map((link) => (
          <NavLink key={link.href} href={link.href} exact className="shrink-0 px-3 pt-1 pb-3 text-[15px] font-medium">
            {link.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
