import Link from "next/link";
import { SearchBox } from "@/components/search-box";

export default function NotFound() {
  return (
    <div className="shell max-w-2xl pt-20">
      <h1 className="wide text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">This page isn’t here</h1>
      <p className="mt-4 text-lg text-graphite">The family may have been renamed or removed. Search for it instead.</p>
      <div className="mt-8">
        <SearchBox variant="hero" />
      </div>
      <Link href="/families" className="link mt-6 inline-block">
        Browse all families
      </Link>
    </div>
  );
}
