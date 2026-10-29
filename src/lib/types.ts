export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

export type CategoryWithCount = Category & { family_count: number };

export type Parameter = {
  group: string;
  name: string;
  value: string;
  unit?: string;
  kind: "type" | "instance";
};

/** Mirrors a Revit type catalog (.txt): one column per parameter, one row per type. */
export type TypeCatalog = {
  columns: { name: string; unit?: string }[];
  rows: { name: string; values: string[] }[];
};

export type FamilyStatus = "draft" | "published" | "archived";

export type FamilyCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category_slug: string;
  category_name: string;
  price_paise: number;
  lod: string | null;
  host: string | null;
  is_parametric: boolean;
  tags: string[];
  cover_path: string | null;
  drawing: string | null;
  revit_min_version: number | null;
  revit_versions: number[];
  downloads_count: number;
  published_at: string | null;
};

export type FamilyFile = {
  id: string;
  kind: "rfa" | "txt" | "rvt" | "zip" | "pdf";
  revit_version: number | null;
  file_name: string;
  size_bytes: number;
};

export type ChangelogEntry = {
  id: string;
  version_label: string;
  notes: string;
  created_at: string;
};

export type Family = FamilyCard & {
  category_id: number;
  status: FamilyStatus;
  description: string;
  parameters: Parameter[];
  types: TypeCatalog;
  gallery_paths: string[];
  version_label: string;
  saves_count: number;
  updated_at: string;
  files: FamilyFile[];
  changelog: ChangelogEntry[];
};

export type RequestStatus = "open" | "planned" | "in_progress" | "shipped" | "declined";

export type FamilyRequest = {
  id: string;
  title: string;
  details: string;
  status: RequestStatus;
  status_note: string | null;
  votes_count: number;
  created_at: string;
  category_slug: string | null;
  category_name: string | null;
  family_slug: string | null;
};

export type SortOption = "relevance" | "popular" | "new" | "price_asc" | "price_desc";

export type CatalogQuery = {
  q?: string;
  category?: string;
  revit?: number;
  price?: "free" | "paid";
  sort?: SortOption;
  page?: number;
};

export type Suggestion = {
  kind: "category" | "family";
  label: string;
  slug: string;
  detail: string | null;
};

export type Notification = {
  id: number;
  kind: "request" | "update" | "new_family" | "order";
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
