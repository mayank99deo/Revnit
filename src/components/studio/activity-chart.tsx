"use client";

import { useState } from "react";
import type { DailyActivity } from "@/lib/data/studio";
import { formatCount } from "@/lib/format";

const W = 720;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= value) ?? 10;
  return step * magnitude * 4;
}

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Downloads per day. One series, so the heading names it and there is no legend. */
export function ActivityChart({ days }: { days: DailyActivity[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((d) => d.downloads), 0));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / days.length;
  const barW = Math.min(24, band - 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const active = hover !== null ? days[hover] : null;

  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Downloads per day over the last ${days.length} days`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-rule" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-graphite">
                {formatCount(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const h = Math.max(0, y(0) - y(d.downloads));
            const r = Math.min(4, h, barW / 2);
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x} ${y(0)} V${y(0) - h + r} q0 -${r} ${r} -${r} H${x + barW - r} q${r} 0 ${r} ${r} V${y(0)} Z`}
                    className={hover === null || hover === i ? "fill-blue" : "fill-blue-soft"}
                  />
                )}
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-trace" strokeWidth={1} />
          {[0, Math.floor(days.length / 2), days.length - 1].map((i) =>
            days[i] ? (
              <text key={i} x={PAD.left + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize={11} className="fill-graphite">
                {dayLabel(days[i].day)}
              </text>
            ) : null,
          )}
        </svg>
        {active && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-edge bg-paper px-2.5 py-1.5 text-[13px] whitespace-nowrap shadow-[0_10px_24px_-14px_rgb(14_17_22/0.4)]"
            style={{ left: `${((PAD.left + hover * band + band / 2) / W) * 100}%` }}
          >
            <span className="font-semibold">{formatCount(active.downloads)} downloads</span>
            <span className="ml-2 text-graphite">{dayLabel(active.day)}</span>
            {active.signups > 0 && <span className="block text-graphite">{active.signups} new members</span>}
          </div>
        )}
      </div>
      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer text-graphite hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full max-w-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <th className="py-1 font-semibold">Day</th>
              <th className="py-1 text-right font-semibold">Downloads</th>
              <th className="py-1 text-right font-semibold">New members</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-b border-rule">
                <td className="py-1">{dayLabel(d.day)}</td>
                <td className="py-1 text-right">{d.downloads}</td>
                <td className="py-1 text-right">{d.signups}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
