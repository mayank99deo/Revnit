"use client";

import { useState } from "react";
import type { Parameter, TypeCatalog } from "@/lib/types";

/**
 * Revit's Type Selector and Properties palette: choose a type and see the
 * parameter values it sets, alongside the full type catalog.
 */
export function TypeExplorer({ familyName, parameters, types }: { familyName: string; parameters: Parameter[]; types: TypeCatalog }) {
  const [typeIndex, setTypeIndex] = useState(0);
  const row = types.rows[typeIndex];

  const fromType = new Map<string, string>();
  if (row) {
    types.columns.forEach((col, i) => fromType.set(col.name.toLowerCase(), row.values[i] ?? ""));
  }

  const groups = new Map<string, Parameter[]>();
  for (const parameter of parameters) {
    const list = groups.get(parameter.group) ?? [];
    list.push(parameter);
    groups.set(parameter.group, list);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <div className="self-start overflow-hidden rounded-xl border border-edge">
        <div className="border-b border-edge bg-wash p-3">
          {types.rows.length > 0 ? (
            <>
              <label htmlFor="type-selector" className="mb-1 block text-[13px] text-graphite">
                {familyName}
              </label>
              <select
                id="type-selector"
                value={typeIndex}
                onChange={(event) => setTypeIndex(Number(event.target.value))}
                className="field h-10 cursor-pointer font-semibold"
              >
                {types.rows.map((r, i) => (
                  <option key={r.name} value={i}>
                    {r.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-[15px] font-semibold">{familyName}</p>
          )}
        </div>

        <table className="w-full text-[14px]">
          <caption className="sr-only">Parameters{row ? ` for type ${row.name}` : ""}</caption>
          {[...groups.entries()].map(([group, list]) => (
            <tbody key={group}>
              <tr>
                <th colSpan={2} scope="colgroup" className="border-b border-rule bg-wash px-3 py-1.5 text-left text-[13px] font-semibold">
                  {group}
                </th>
              </tr>
              {list.map((parameter) => {
                const typed = fromType.get(parameter.name.toLowerCase());
                const value = typed ?? parameter.value;
                return (
                  <tr key={parameter.name} className="border-b border-rule last:border-b-0">
                    <th scope="row" className="w-1/2 border-r border-rule px-3 py-1.5 text-left font-normal">
                      {parameter.name}
                      {parameter.kind === "instance" && <span className="ml-1.5 text-[12px] text-graphite">instance</span>}
                    </th>
                    <td className={`px-3 py-1.5 ${typed !== undefined ? "font-semibold" : ""}`}>
                      <span key={`${typeIndex}-${value}`} className={typed !== undefined ? "animate-rise inline-block" : ""}>
                        {value}
                        {parameter.unit && value !== "calculated" ? ` ${parameter.unit}` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {types.rows.length > 0 && (
        <div className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="font-semibold">Type catalog</h3>
            <p className="text-[13px] text-graphite">{types.rows.length} types. Select a row to inspect it.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-edge">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-edge">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Type
                  </th>
                  {types.columns.map((col) => (
                    <th key={col.name} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                      {col.name}
                      {col.unit && <span className="font-normal text-graphite"> ({col.unit})</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {types.rows.map((r, i) => (
                  <tr
                    key={r.name}
                    onClick={() => setTypeIndex(i)}
                    className={`cursor-pointer border-b border-rule last:border-b-0 ${i === typeIndex ? "bg-blue-soft text-blue-deep" : "hover:bg-wash"}`}
                  >
                    <th scope="row" className="px-3 py-2 font-semibold whitespace-nowrap">
                      <button type="button" onClick={() => setTypeIndex(i)} aria-pressed={i === typeIndex} className="text-left">
                        {r.name}
                      </button>
                    </th>
                    {r.values.map((v, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
