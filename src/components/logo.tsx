import Link from "next/link";

/** The distribution board symbol from electrical plans: a box, half filled on the diagonal. */
export function LogoMark({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
      <rect x="1" y="1" width="26" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M2 18 L26 2 V18 Z" className="fill-blue" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Revnit home">
      <LogoMark />
      <span className="wide text-[21px] leading-none font-extrabold tracking-[-0.03em]">Revnit</span>
    </Link>
  );
}
