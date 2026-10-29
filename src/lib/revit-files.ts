import type { TypeCatalog } from "./types";

/**
 * Reads the Revit release a family was saved in. .rfa/.rvt files are OLE
 * containers whose BasicFileInfo stream holds UTF-16 text such as
 * "Format: 2024" (2019+) or "Autodesk Revit 2018 (Build: ...)".
 */
export async function detectRevitVersion(file: Blob): Promise<number | null> {
  const decoder = new TextDecoder("utf-16le");
  const chunkSize = 4 * 1024 * 1024;
  const overlap = 128; // even, so UTF-16 code units stay aligned across chunks
  const patterns = [/Format: (20\d{2})/, /Autodesk Revit (20\d{2})/, /Revit Build: .*?(20\d{2})/];

  for (let start = 0; start < file.size; start += chunkSize - overlap) {
    const text = decoder.decode(await file.slice(start, start + chunkSize).arrayBuffer());
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

const UNIT_SYMBOLS: Record<string, string> = {
  MILLIMETERS: "mm",
  CENTIMETERS: "cm",
  METERS: "m",
  INCHES: "in",
  FEET: "ft",
  WATTS: "W",
  KILOWATTS: "kW",
  VOLT_AMPERES: "VA",
  KILOVOLT_AMPERES: "kVA",
  VOLTS: "V",
  KILOVOLTS: "kV",
  AMPERES: "A",
  KILOAMPERES: "kA",
  LUMENS: "lm",
  KELVIN: "K",
  DEGREES: "°",
  KILOGRAMS: "kg",
  HERTZ: "Hz",
  CANDELAS: "cd",
  LUX: "lx",
};

/** Decodes a type catalog whether Revit saved it as UTF-16 (its default) or UTF-8. */
export async function readTypeCatalogFile(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes.length > 1 && bytes[1] === 0 && bytes[0] !== 0);
  return new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(bytes).replace(/^﻿/, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Parses a Revit type catalog: the header row is ",Name##SPEC##UNITS,...",
 * each following row is "Type name,value,value". Comma or semicolon separated.
 */
export function parseTypeCatalog(text: string): TypeCatalog {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("The type catalog needs a header row and at least one type.");

  const delimiter = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const header = splitCsvLine(lines[0], delimiter).slice(1);
  if (header.length === 0 || !header.some((h) => h.includes("##"))) {
    throw new Error("This doesn't look like a Revit type catalog. The first row should list parameters as Name##TYPE##UNITS.");
  }

  const columns = header.map((h) => {
    const [name, , units] = h.split("##");
    const unit = units ? (UNIT_SYMBOLS[units.toUpperCase()] ?? units.toLowerCase()) : undefined;
    return unit ? { name: name.trim(), unit } : { name: name.trim() };
  });

  const rows = lines.slice(1).map((line) => {
    const [name, ...values] = splitCsvLine(line, delimiter);
    return { name, values: columns.map((_, i) => values[i] ?? "") };
  });

  return { columns, rows: rows.filter((r) => r.name) };
}
