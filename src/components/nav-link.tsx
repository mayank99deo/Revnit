"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  children,
  className = "",
  exact = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Match only this path, not its sub-pages. */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const current = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${className} underline-offset-[6px] decoration-blue hover:underline aria-[current=page]:underline aria-[current=page]:decoration-2`}
    >
      {children}
    </Link>
  );
}
