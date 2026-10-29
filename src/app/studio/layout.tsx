import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/data/studio";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

const LINKS = [
  { href: "/studio", label: "Overview" },
  { href: "/studio/families", label: "Families" },
  { href: "/studio/requests", label: "Requests" },
  { href: "/studio/searches", label: "Search demand" },
  { href: "/studio/orders", label: "Orders" },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="shell pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-edge">
        <nav aria-label="Studio" className="flex gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} exact={link.href === "/studio"} className="shrink-0 px-3 pt-1 pb-3 text-[15px] font-medium">
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
