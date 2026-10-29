"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { SearchBox } from "./search-box";

/** Header search that shows the active query while browsing results. */
export function HeaderSearch() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === "/families" ? (params.get("q") ?? "") : "";
  return <SearchBox defaultValue={q} />;
}
