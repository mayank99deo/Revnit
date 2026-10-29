"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { pluralize } from "@/lib/format";
import type { CategoryWithCount } from "@/lib/types";

/*
 * A building's electrical system as a single-line diagram. Each part is a
 * catalog category; hovering or focusing one traces its supply from the grid.
 */

const EDGES: Record<string, string> = {
  grid: "M24 180 H120",
  "tx-lv": "M180 180 H300",
  "gen-lv": "M172 330 H250 V230 H300",
  earth: "M150 198 V246",
  bus: "M340 180 H520",
  "db-lighting": "M580 180 H640 V70 H744",
  "db-sockets": "M580 180 H640 V145 H744",
  "db-ev": "M580 180 H640 V220 H744",
  "db-fire": "M580 180 H640 V295 H744",
  "db-data": "M580 180 H640 V370 H744",
  containment: "M320 250 V414 H880",
};

const FEED = ["grid", "tx-lv", "bus"];

type Part = {
  slug: string;
  label: string;
  labelAt: [number, number];
  anchor?: "start" | "middle" | "end";
  path: string[];
  /** Invisible hit area so the label and symbol select together. */
  hit: [number, number, number, number];
  symbol: ReactNode;
};

const PARTS: Part[] = [
  {
    slug: "transformers",
    label: "Transformers",
    labelAt: [150, 142],
    anchor: "middle",
    path: ["grid"],
    hit: [100, 120, 100, 80],
    symbol: (
      <>
        <circle cx={138} cy={180} r={18} />
        <circle cx={162} cy={180} r={18} />
      </>
    ),
  },
  {
    slug: "earthing",
    label: "Earthing",
    labelAt: [168, 262],
    path: ["earth"],
    hit: [130, 236, 110, 36],
    symbol: <path d="M136 246 H164 M141 253 H159 M146 260 H154" />,
  },
  {
    slug: "generators-ups",
    label: "Generators & UPS",
    labelAt: [150, 378],
    anchor: "middle",
    path: ["gen-lv"],
    hit: [70, 300, 160, 90],
    symbol: (
      <>
        <circle cx={150} cy={330} r={22} />
        <text x={150} y={336} textAnchor="middle" fontSize={17} fontWeight={700} fill="currentColor" stroke="none">
          G
        </text>
      </>
    ),
  },
  {
    slug: "switchgear",
    label: "LV switchboards",
    labelAt: [320, 96],
    anchor: "middle",
    path: ["grid", "tx-lv", "gen-lv"],
    hit: [256, 78, 128, 180],
    symbol: (
      <>
        <rect x={300} y={110} width={40} height={140} />
        {[140, 180, 220].map((y) => (
          <path key={y} d={`M312 ${y - 8} h16 v16 h-16 Z M312 ${y - 8} l16 16 M328 ${y - 8} l-16 16`} strokeWidth={1.25} />
        ))}
      </>
    ),
  },
  {
    slug: "busbar-trunking",
    label: "Busbar trunking",
    labelAt: [430, 160],
    anchor: "middle",
    path: FEED,
    hit: [350, 140, 160, 56],
    // Three conductors in the R-Y-B phase colours.
    symbol: (
      <>
        <path d="M340 174 H520" className="stroke-red" strokeWidth={2.25} />
        <path d="M340 180 H520" className="stroke-yellow" strokeWidth={2.25} />
        <path d="M340 186 H520" className="stroke-blue" strokeWidth={2.25} />
      </>
    ),
  },
  {
    slug: "distribution-boards",
    label: "Distribution boards",
    labelAt: [550, 228],
    anchor: "middle",
    path: FEED,
    hit: [470, 150, 160, 92],
    symbol: (
      <>
        <rect x={520} y={162} width={60} height={36} />
        <path d="M520 198 L580 162 V198 Z" fill="currentColor" />
      </>
    ),
  },
  {
    slug: "lighting",
    label: "Lighting",
    labelAt: [784, 76],
    path: [...FEED, "db-lighting"],
    hit: [740, 50, 220, 40],
    symbol: <path d="M760 70 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M750 60 l20 20 M770 60 l-20 20" />,
  },
  {
    slug: "wiring-devices",
    label: "Switches & sockets",
    labelAt: [784, 151],
    path: [...FEED, "db-sockets"],
    hit: [740, 125, 220, 40],
    symbol: <path d="M746 138 A14 14 0 0 0 774 138 Z M760 152 V160" />,
  },
  {
    slug: "ev-charging",
    label: "EV charging",
    labelAt: [784, 226],
    path: [...FEED, "db-ev"],
    hit: [740, 200, 220, 40],
    symbol: (
      <>
        <rect x={746} y={206} width={28} height={28} />
        <path d="M762 210 L754 222 H764 L757 232" />
      </>
    ),
  },
  {
    slug: "fire-alarm",
    label: "Fire alarm",
    labelAt: [784, 301],
    path: [...FEED, "db-fire"],
    hit: [740, 275, 220, 40],
    symbol: (
      <>
        <rect x={746} y={281} width={28} height={28} />
        <circle cx={760} cy={295} r={6} fill="currentColor" />
      </>
    ),
  },
  {
    slug: "elv-systems",
    label: "Data & security",
    labelAt: [784, 376],
    path: [...FEED, "db-data"],
    hit: [740, 350, 220, 40],
    symbol: <path d="M760 356 L776 382 H744 Z" />,
  },
  {
    slug: "cable-management",
    label: "Cable tray & conduit",
    labelAt: [480, 404],
    anchor: "middle",
    path: ["containment"],
    hit: [330, 384, 300, 44],
    symbol: <path d="M560 406 V418 H584 V406" strokeWidth={1.5} />,
  },
  {
    slug: "annotation",
    label: "Tags & symbols",
    labelAt: [912, 30],
    anchor: "middle",
    path: [],
    hit: [846, 6, 132, 62],
    symbol: (
      <>
        <rect x={858} y={40} width={34} height={18} rx={9} />
        <path d="M898 49 H912" strokeWidth={1} />
        <rect x={918} y={40} width={46} height={18} />
      </>
    ),
  },
];

export function SystemDiagram({ categories }: { categories: CategoryWithCount[] }) {
  const [active, setActive] = useState<string | null>(null);
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const activePart = PARTS.find((p) => p.slug === active);
  const lit = new Set(activePart?.path ?? []);
  const current = active ? bySlug.get(active) : undefined;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-edge bg-paper shadow-[0_24px_60px_-40px_rgb(34_64_111/0.45)] lg:grid-cols-[1fr_320px]">
      <div className="blueprint-grid relative hidden border-edge md:block lg:border-r">
        <svg
          viewBox="0 0 1000 440"
          className="h-auto w-full"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          role="group"
          aria-label="Single-line diagram of a building's electrical system. Each part links to its families."
          onMouseLeave={() => setActive(null)}
        >
          <text x={24} y={170} fontSize={13} fill="currentColor" stroke="none" className="text-graphite">
            11 kV supply
          </text>

          {Object.entries(EDGES).map(([id, d], i) => {
            const isLit = lit.has(id);
            const dashed = id === "containment";
            // The busbar's own phase lines stand in for this edge until it's traced.
            if (id === "bus" && !isLit) return null;
            return (
              <path
                key={id}
                d={d}
                pathLength={dashed ? undefined : 1}
                strokeDasharray={dashed ? "8 6" : 1}
                strokeWidth={isLit ? 3.5 : 1.5}
                className={`transition-[stroke-width,color] duration-200 ${
                  isLit ? "text-blue" : active ? "text-trace" : "text-line"
                } ${dashed ? "" : "animate-draw"}`}
                style={dashed ? undefined : ({ "--length": 1, animationDelay: `${i * 90}ms` } as React.CSSProperties)}
              />
            );
          })}

          {PARTS.map((part) => {
            const isActive = part.slug === active;
            const [lx, ly] = part.labelAt;
            const category = bySlug.get(part.slug);
            return (
              <Link
                key={part.slug}
                href={`/categories/${part.slug}`}
                aria-label={`${part.label}${category ? `, ${pluralize(category.family_count, "family", "families")}` : ""}`}
                onMouseEnter={() => setActive(part.slug)}
                onFocus={() => setActive(part.slug)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={part.hit[0]} y={part.hit[1]} width={part.hit[2]} height={part.hit[3]} fill="transparent" stroke="none" />
                <g
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={`transition-colors duration-200 ${isActive ? "fill-blue-soft text-blue" : active ? "text-trace" : "text-line"}`}
                >
                  {part.symbol}
                </g>
                <text
                  x={lx}
                  y={ly}
                  textAnchor={part.anchor ?? "start"}
                  fontSize={15}
                  fontWeight={isActive ? 700 : 500}
                  fill="currentColor"
                  stroke="none"
                  className={isActive ? "text-blue" : active ? "text-graphite" : "text-ink"}
                >
                  {part.label}
                </text>
              </Link>
            );
          })}
        </svg>
      </div>

      <aside className="hidden flex-col justify-between gap-6 border-edge p-8 max-lg:border-t md:flex" aria-live="polite">
        {current ? (
          <div key={current.slug} className="animate-rise">
            <h2 className="wide text-2xl leading-tight font-bold tracking-[-0.02em]">{current.name}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-graphite">{current.description}</p>
            <p className="tag mt-5 bg-blue-soft text-blue-deep">
              {current.family_count ? pluralize(current.family_count, "family", "families") : "First families coming soon"}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="wide text-2xl leading-tight font-bold tracking-[-0.02em]">Browse by system</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-graphite">
              Point at any part of the diagram to trace its supply from the grid. Select it to see every family in that
              category.
            </p>
          </div>
        )}
        <Link href={current ? `/categories/${current.slug}` : "/families"} className="btn btn-primary w-full">
          {current ? `Browse ${current.name.toLowerCase()}` : "Browse all families"}
        </Link>
      </aside>

      <ol className="md:hidden">
        {categories.map((category) => (
          <li key={category.slug} className="border-b border-rule last:border-b-0">
            <Link href={`/categories/${category.slug}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-wash">
              <span className="font-medium">{category.name}</span>
              <span className="text-[13px] text-graphite">
                {category.family_count ? pluralize(category.family_count, "family", "families") : "None yet"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
