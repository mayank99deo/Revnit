-- Revnit core schema: catalog, members, commerce, demand.

create extension if not exists pg_trgm with schema extensions;

-- Members ---------------------------------------------------------------
-- Member-owned tables reference profiles rather than auth.users so the API
-- can join them; deleting the auth user still cascades through profiles.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  job_title text,
  role text not null default 'member' check (role in ('member', 'admin')),
  notify_email boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catalog ---------------------------------------------------------------

create table public.categories (
  id int generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 3 and 120),
  summary text not null default '',
  description text not null default '',
  category_id int not null references public.categories (id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- 0 means free. Stored in paise so arithmetic stays exact.
  price_paise int not null default 0 check (price_paise >= 0),
  lod text check (lod in ('200', '300', '350', '400')),
  host text check (host in ('Non-hosted', 'Face-based', 'Wall-hosted', 'Ceiling-hosted', 'Floor-hosted', 'Line-based')),
  is_parametric boolean not null default true,
  tags text[] not null default '{}',
  -- [{ "group": "Dimensions", "name": "Width", "value": "600", "unit": "mm", "kind": "type" }]
  parameters jsonb not null default '[]' check (jsonb_typeof(parameters) = 'array'),
  -- Parsed from a Revit type catalog: { "columns": [{ "name", "unit" }], "rows": [{ "name", "values": [] }] }
  types jsonb not null default '{"columns": [], "rows": []}' check (jsonb_typeof(types) = 'object'),
  cover_path text,
  gallery_paths text[] not null default '{}',
  -- Line drawing shown when no render has been uploaded yet.
  drawing text,
  version_label text not null default '1.0',
  -- Set when a changelog entry ships a new version; drives "update available" in libraries.
  version_updated_at timestamptz,
  -- Maintained from family_files. A family saved in 2021 opens in every later release.
  revit_versions smallint[] not null default '{}',
  revit_min_version smallint,
  downloads_count int not null default 0,
  saves_count int not null default 0,
  search tsvector,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index families_search_idx on public.families using gin (search);
create index families_name_trgm_idx on public.families using gin (name extensions.gin_trgm_ops);
create index families_listing_idx on public.families (status, category_id, published_at desc);

create table public.family_files (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null default 'rfa' check (kind in ('rfa', 'txt', 'rvt', 'zip', 'pdf')),
  revit_version smallint check (revit_version between 2010 and 2100),
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index family_files_family_idx on public.family_files (family_id);

create table public.family_changelog (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  version_label text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create index family_changelog_family_idx on public.family_changelog (family_id, created_at desc);

-- Member activity -------------------------------------------------------

create table public.downloads (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  file_id uuid references public.family_files (id) on delete set null,
  created_at timestamptz not null default now()
);

create index downloads_user_idx on public.downloads (user_id, created_at desc);
create index downloads_family_idx on public.downloads (family_id, created_at desc);
create index downloads_created_idx on public.downloads (created_at);

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, family_id)
);

create table public.category_watches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id int not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- Commerce --------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  amount_paise int not null check (amount_paise > 0),
  currency text not null default 'INR',
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  family_id uuid not null references public.families (id),
  price_paise int not null check (price_paise > 0),
  primary key (order_id, family_id)
);

create table public.entitlements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, family_id)
);

-- Demand ----------------------------------------------------------------

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 4 and 140),
  details text not null default '' check (char_length(details) <= 2000),
  category_id int references public.categories (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'planned', 'in_progress', 'shipped', 'declined')),
  status_note text,
  family_id uuid references public.families (id) on delete set null,
  votes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_board_idx on public.requests (status, votes_count desc);

create table public.request_votes (
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table public.searches (
  id bigint generated always as identity primary key,
  query text not null,
  normalized text not null,
  results_count int not null,
  filters jsonb not null default '{}',
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index searches_created_idx on public.searches (created_at desc);
create index searches_normalized_idx on public.searches (normalized);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('request', 'update', 'new_family', 'order')),
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
