"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A select that updates one URL parameter as soon as it changes. */
export function ParamSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-[15px]">
      <span className="shrink-0 text-graphite">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          if (event.target.value) next.set(name, event.target.value);
          else next.delete(name);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="h-10 cursor-pointer rounded-lg border border-edge bg-paper pr-8 pl-3 font-medium hover:border-trace focus:border-blue focus:ring-4 focus:ring-blue-soft focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A select whose options are destinations; used for category on small screens. */
export function NavigateSelect({ label, value, options }: { label: string; value: string; options: { href: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-[15px]">
      <span className="shrink-0 text-graphite">{label}</span>
      <select
        value={value}
        onChange={(event) => router.push(event.target.value)}
        className="h-10 max-w-[60vw] cursor-pointer rounded-lg border border-edge bg-paper pr-8 pl-3 font-medium hover:border-trace focus:border-blue focus:ring-4 focus:ring-blue-soft focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.href} value={o.href}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
