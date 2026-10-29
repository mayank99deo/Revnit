import type { Category } from "./types";

/**
 * Electrical BIM categories, ordered the way power flows through a building.
 * The home page diagram and supabase/seed.sql are both built from this list.
 */
export const CATEGORIES: Category[] = [
  {
    id: 1,
    slug: "transformers",
    name: "Transformers",
    description: "Oil-filled and dry-type distribution transformers sized by kVA.",
  },
  {
    id: 2,
    slug: "switchgear",
    name: "LV switchboards",
    description: "Main LV panels, PCC, MCC and APFC panels with configurable sections.",
  },
  {
    id: 3,
    slug: "generators-ups",
    name: "Generators & UPS",
    description: "DG sets, UPS cabinets, battery banks and changeover panels.",
  },
  {
    id: 4,
    slug: "busbar-trunking",
    name: "Busbar trunking",
    description: "Busduct runs, rising mains, tap-off boxes and fittings.",
  },
  {
    id: 5,
    slug: "distribution-boards",
    name: "Distribution boards",
    description: "SPN and TPN boards, MCB DBs and feeder pillars.",
  },
  {
    id: 6,
    slug: "lighting",
    name: "Lighting",
    description: "Downlights, linear fixtures, panels, high bays, emergency and exit signs.",
  },
  {
    id: 7,
    slug: "wiring-devices",
    name: "Switches & sockets",
    description: "Modular plates, socket outlets, isolators and floor boxes.",
  },
  {
    id: 8,
    slug: "ev-charging",
    name: "EV charging",
    description: "Wall boxes and pedestal chargers with clearance zones.",
  },
  {
    id: 9,
    slug: "fire-alarm",
    name: "Fire alarm",
    description: "Detectors, manual call points, sounders and panels.",
  },
  {
    id: 10,
    slug: "elv-systems",
    name: "Data & security",
    description: "Data outlets, CCTV, access control and network racks.",
  },
  {
    id: 11,
    slug: "cable-management",
    name: "Cable tray & conduit",
    description: "Tray, ladder, trunking and conduit fittings that route in Revit.",
  },
  {
    id: 12,
    slug: "earthing",
    name: "Earthing & lightning",
    description: "Earth pits, strips, air terminals and test links.",
  },
  {
    id: 13,
    slug: "annotation",
    name: "Tags & symbols",
    description: "Fixture tags, circuit tags and schedule-ready annotation.",
  },
].map((c, i) => ({ ...c, sort_order: i + 1 }));

export const REVIT_VERSIONS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

export const LOD_OPTIONS = ["200", "300", "350", "400"] as const;

export const HOST_OPTIONS = [
  "Non-hosted",
  "Face-based",
  "Wall-hosted",
  "Ceiling-hosted",
  "Floor-hosted",
  "Line-based",
] as const;

