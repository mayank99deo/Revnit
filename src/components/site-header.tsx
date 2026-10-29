import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/data/member";
import { AccountMenu } from "./account-menu";
import { CartLink } from "./cart-link";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { SearchBox } from "./search-box";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="phase-stripe h-[3px]" aria-hidden="true" />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-blue focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      {/* One search box: its own row on phones, inline from tablet up. */}
      <div className="shell flex flex-wrap items-center gap-x-6 gap-y-3 py-3 md:h-16 md:flex-nowrap md:py-0">
        <Logo />
        <div className="order-last w-full md:order-none md:w-auto md:max-w-xl md:flex-1">
          <Suspense fallback={<SearchBox />}>
            <HeaderSearch />
          </Suspense>
        </div>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
          <NavLink href="/families" className="px-2 py-2 font-medium">
            Families
          </NavLink>
          <NavLink href="/requests" className="hidden px-2 py-2 font-medium sm:block">
            Requests
          </NavLink>
          <CartLink />
          {viewer ? (
            <AccountMenu name={viewer.name} email={viewer.email} unread={viewer.unread} isAdmin={viewer.isAdmin} />
          ) : (
            <Link href="/sign-in" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
