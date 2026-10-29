import Link from "next/link";
import { site } from "@/lib/site";
import { CATEGORIES } from "@/lib/taxonomy";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="phase-stripe h-1" aria-hidden="true" />
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="wide text-[21px] font-extrabold tracking-[-0.03em]">Revnit</span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-trace">{site.tagline}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-trace">
            Can’t find a family? <Link href="/requests" className="text-paper underline underline-offset-[3px] hover:text-yellow">Request it</Link> and you’ll be
            told when it’s published.
          </p>
        </div>
        <FooterColumn
          title="Catalog"
          links={CATEGORIES.slice(4, 11).map((c) => ({ href: `/categories/${c.slug}`, label: c.name }))}
        />
        <FooterColumn
          title="Revnit"
          links={[
            { href: "/families", label: "All families" },
            { href: "/requests", label: "Requests" },
            { href: "/license", label: "License" },
            { href: `mailto:${site.contactEmail}`, label: "Contact" },
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            { href: "/account", label: "Library" },
            { href: "/account/saved", label: "Saved" },
            { href: "/account/orders", label: "Orders" },
            { href: "/account/settings", label: "Settings" },
          ]}
        />
      </div>
      <div className="border-t border-paper/15">
        <div className="shell flex flex-col justify-between gap-2 py-6 text-[13px] text-trace sm:flex-row">
          <p>
            © {new Date().getFullYear()} Revnit. Families modelled by {site.creator.name}.
          </p>
          <p>Prices in Indian rupees.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[15px] text-trace hover:text-paper hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
