-- Helpers, triggers and RPCs.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Whether the current member has downloaded or bought a family. Archived
-- families stay visible to them so their library keeps working.
create function public.has_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.entitlements where user_id = auth.uid() and family_id = p_family_id)
      or exists (select 1 from public.downloads where user_id = auth.uid() and family_id = p_family_id);
$$;

-- New auth user -> profile row.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Search ----------------------------------------------------------------

-- "cable tr" -> 'cable':* & 'tr':*  so results appear while the user is still typing.
create function public.prefix_tsquery(p_query text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select to_tsquery('simple', string_agg(token || ':*', ' & '))
  from unnest(regexp_split_to_array(lower(coalesce(p_query, '')), '[^a-z0-9]+')) as token
  where token <> '';
$$;

create function public.families_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
begin
  -- Download and save counters change constantly; they are not edits.
  if tg_op = 'UPDATE' and (
    to_jsonb(new) - '{downloads_count,saves_count,updated_at,search}'::text[]
  ) = (
    to_jsonb(old) - '{downloads_count,saves_count,updated_at,search}'::text[]
  ) then
    return new;
  end if;

  select name into v_category from public.categories where id = new.category_id;

  new.search :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(new.tags, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(v_category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');

  new.updated_at := now();

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

create trigger families_before_write
  before insert or update on public.families
  for each row execute function public.families_before_write();

create function public.search_families(
  p_query text default null,
  p_category text default null,
  p_revit int default null,
  p_price text default null,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  summary text,
  category_slug text,
  category_name text,
  price_paise int,
  lod text,
  host text,
  is_parametric boolean,
  tags text[],
  cover_path text,
  drawing text,
  revit_min_version smallint,
  revit_versions smallint[],
  downloads_count int,
  published_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select nullif(trim(p_query), '') as raw, public.prefix_tsquery(p_query) as tsq
  ),
  matched as (
    select
      f.*,
      c.slug as c_slug,
      c.name as c_name,
      case
        when q.raw is null then 0
        else ts_rank(f.search, coalesce(q.tsq, ''::tsquery)) + extensions.word_similarity(q.raw, f.name)
      end as rank
    from public.families f
    join public.categories c on c.id = f.category_id
    cross join q
    where f.status = 'published'
      and (p_category is null or c.slug = p_category)
      and (p_revit is null or f.revit_min_version <= p_revit)
      and (
        p_price is null
        or (p_price = 'free' and f.price_paise = 0)
        or (p_price = 'paid' and f.price_paise > 0)
      )
      and (
        q.raw is null
        or f.search @@ q.tsq
        or extensions.word_similarity(q.raw, f.name) > 0.45
      )
  )
  select
    m.id, m.slug, m.name, m.summary, m.c_slug, m.c_name, m.price_paise, m.lod, m.host,
    m.is_parametric, m.tags, m.cover_path, m.drawing, m.revit_min_version, m.revit_versions,
    m.downloads_count, m.published_at,
    count(*) over () as total_count
  from matched m
  order by
    case when p_sort = 'price_asc' then m.price_paise end asc,
    case when p_sort = 'price_desc' then m.price_paise end desc,
    case when p_sort = 'new' then m.published_at end desc,
    case when p_sort = 'popular' then m.downloads_count end desc,
    case when p_sort = 'relevance' then m.rank end desc,
    m.downloads_count desc,
    m.published_at desc
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

create function public.suggest(p_query text, p_limit int default 6)
returns table (kind text, label text, slug text, detail text)
language sql
stable
set search_path = ''
as $$
  (
    select 'category', c.name, c.slug, null::text
    from public.categories c
    where c.name ilike '%' || trim(p_query) || '%'
    order by c.sort_order
    limit 2
  )
  union all
  (
    select 'family', f.name, f.slug, c.name
    from public.families f
    join public.categories c on c.id = f.category_id
    where f.status = 'published'
      and (f.search @@ public.prefix_tsquery(p_query) or extensions.word_similarity(p_query, f.name) > 0.45)
    order by extensions.word_similarity(p_query, f.name) desc, f.downloads_count desc
    limit least(greatest(p_limit, 1), 10)
  );
$$;

-- Every submitted search is kept so the studio can see what people look for.
create function public.log_search(p_query text, p_results int, p_filters jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized text := lower(regexp_replace(trim(coalesce(p_query, '')), '\s+', ' ', 'g'));
begin
  if char_length(v_normalized) < 2 or char_length(v_normalized) > 120 then
    return;
  end if;

  -- Paging or re-sorting the same results shouldn't count as a new search.
  if auth.uid() is not null and exists (
    select 1 from public.searches
    where user_id = auth.uid() and normalized = v_normalized and created_at > now() - interval '10 minutes'
  ) then
    return;
  end if;

  insert into public.searches (query, normalized, results_count, filters, user_id)
  values (trim(p_query), v_normalized, greatest(p_results, 0), coalesce(p_filters, '{}'), auth.uid());
end;
$$;

-- Counters --------------------------------------------------------------

create function public.bump_download_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.families set downloads_count = downloads_count + 1 where id = new.family_id;
  return null;
end;
$$;

create trigger downloads_count after insert on public.downloads
  for each row execute function public.bump_download_count();

create function public.sync_save_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.families
  set saves_count = (select count(*) from public.saves where family_id = coalesce(new.family_id, old.family_id))
  where id = coalesce(new.family_id, old.family_id);
  return null;
end;
$$;

create trigger saves_count after insert or delete on public.saves
  for each row execute function public.sync_save_count();

create function public.sync_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.requests
  set votes_count = (select count(*) from public.request_votes where request_id = coalesce(new.request_id, old.request_id))
  where id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$;

create trigger votes_count after insert or delete on public.request_votes
  for each row execute function public.sync_vote_count();

-- Whoever asks for a family is its first vote.
create function public.vote_own_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    insert into public.request_votes (request_id, user_id) values (new.id, new.user_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger requests_self_vote after insert on public.requests
  for each row execute function public.vote_own_request();

create function public.sync_family_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := coalesce(new.family_id, old.family_id);
begin
  update public.families f
  set revit_versions = coalesce(v.versions, '{}'),
      revit_min_version = v.versions[1]
  from (
    select array_agg(distinct revit_version order by revit_version) as versions
    from public.family_files
    where family_id = v_family and kind in ('rfa', 'rvt') and revit_version is not null
  ) v
  where f.id = v_family;
  return null;
end;
$$;

create trigger family_files_versions after insert or update or delete on public.family_files
  for each row execute function public.sync_family_versions();

-- Notifications ---------------------------------------------------------

-- Requesters and voters hear about every status change on what they asked for.
create function public.notify_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_title text;
  v_body text;
  v_href text := '/requests';
begin
  if new.status = old.status then
    return null;
  end if;

  select slug into v_slug from public.families where id = new.family_id;

  case new.status
    when 'planned' then
      v_title := format('"%s" is planned', new.title);
      v_body := 'It is on the build list. You will hear again when it is ready.';
    when 'in_progress' then
      v_title := format('"%s" is being modelled', new.title);
      v_body := 'Modelling has started on the family you asked for.';
    when 'shipped' then
      v_title := format('"%s" is ready to download', new.title);
      v_body := 'The family you asked for is now in the catalog.';
      if v_slug is not null then v_href := '/families/' || v_slug; end if;
    when 'declined' then
      v_title := format('"%s" was declined', new.title);
      v_body := coalesce(nullif(new.status_note, ''), 'It is out of scope for the catalog right now.');
    else
      return null;
  end case;

  insert into public.notifications (user_id, kind, title, body, href)
  select v.user_id, 'request', v_title, v_body, v_href
  from public.request_votes v
  where v.request_id = new.id;

  return null;
end;
$$;

create trigger requests_notify after update of status on public.requests
  for each row execute function public.notify_request_status();

create function public.touch_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch before update on public.requests
  for each row execute function public.touch_request();

-- People following a category hear about each new family in it.
create function public.notify_new_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    return null;
  end if;

  select name into v_category from public.categories where id = new.category_id;

  insert into public.notifications (user_id, kind, title, body, href)
  select w.user_id, 'new_family', format('New in %s: %s', v_category, new.name), new.summary, '/families/' || new.slug
  from public.category_watches w
  where w.category_id = new.category_id;

  return null;
end;
$$;

create trigger families_notify_new after insert or update of status on public.families
  for each row execute function public.notify_new_family();

-- Everyone who downloaded or bought a family hears when it gets a new version.
create function public.notify_family_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family public.families;
begin
  update public.families
  set version_label = new.version_label, version_updated_at = new.created_at
  where id = new.family_id
  returning * into v_family;

  if v_family.status <> 'published' then
    return null;
  end if;

  insert into public.notifications (user_id, kind, title, body, href)
  select u.user_id, 'update', format('%s updated to v%s', v_family.name, new.version_label), new.notes,
         '/families/' || v_family.slug
  from (
    select user_id from public.downloads where family_id = new.family_id
    union
    select user_id from public.entitlements where family_id = new.family_id
  ) u;

  return null;
end;
$$;

create trigger family_changelog_notify after insert on public.family_changelog
  for each row execute function public.notify_family_update();

-- Downloads -------------------------------------------------------------

-- Checks access, records the download and returns the storage path to sign.
create function public.authorize_download(p_file_id uuid)
returns table (storage_path text, file_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_file public.family_files;
  v_family public.families;
  v_admin boolean := public.is_admin();
begin
  if v_user is null then
    raise exception 'sign_in_required';
  end if;

  select * into v_file from public.family_files where id = p_file_id;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_family from public.families where id = v_file.family_id;
  if not v_admin and (
    v_family.status = 'draft'
    or (v_family.status = 'archived' and not public.has_family(v_family.id))
  ) then
    raise exception 'not_found';
  end if;

  if v_family.price_paise > 0 and not v_admin and not exists (
    select 1 from public.entitlements e where e.user_id = v_user and e.family_id = v_family.id
  ) then
    raise exception 'purchase_required';
  end if;

  insert into public.downloads (user_id, family_id, file_id) values (v_user, v_family.id, v_file.id);

  return query select v_file.storage_path, v_file.file_name;
end;
$$;

-- Payments --------------------------------------------------------------

-- Called by the server (service role) after a verified Razorpay payment. Safe to repeat.
create function public.fulfil_order(p_razorpay_order_id text, p_payment_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  update public.orders
  set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
  where razorpay_order_id = p_razorpay_order_id and status <> 'paid'
  returning * into v_order;

  if not found then
    select * into v_order from public.orders where razorpay_order_id = p_razorpay_order_id;
    return v_order.id;
  end if;

  insert into public.entitlements (user_id, family_id, order_id)
  select v_order.user_id, i.family_id, v_order.id
  from public.order_items i
  where i.order_id = v_order.id
  on conflict (user_id, family_id) do nothing;

  insert into public.notifications (user_id, kind, title, body, href)
  values (
    v_order.user_id,
    'order',
    'Payment received',
    format('%s %s added to your library.',
      (select count(*) from public.order_items where order_id = v_order.id),
      case when (select count(*) from public.order_items where order_id = v_order.id) = 1 then 'family' else 'families' end),
    '/account'
  );

  return v_order.id;
end;
$$;

revoke execute on function public.fulfil_order(text, text) from public, anon, authenticated;

-- Studio ----------------------------------------------------------------

create function public.studio_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => p_days);
  v_prev timestamptz := now() - make_interval(days => p_days * 2);
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'downloads', (select count(*) from public.downloads where created_at >= v_since),
    'downloads_prev', (select count(*) from public.downloads where created_at >= v_prev and created_at < v_since),
    'revenue_paise', (select coalesce(sum(amount_paise), 0) from public.orders where status = 'paid' and paid_at >= v_since),
    'revenue_prev_paise', (select coalesce(sum(amount_paise), 0) from public.orders where status = 'paid' and paid_at >= v_prev and paid_at < v_since),
    'orders', (select count(*) from public.orders where status = 'paid' and paid_at >= v_since),
    'members', (select count(*) from public.profiles),
    'members_new', (select count(*) from public.profiles where created_at >= v_since),
    'searches', (select count(*) from public.searches where created_at >= v_since),
    'searches_unmatched', (select count(*) from public.searches where created_at >= v_since and results_count = 0),
    'requests_open', (select count(*) from public.requests where status in ('open', 'planned', 'in_progress')),
    'published', (select count(*) from public.families where status = 'published'),
    'drafts', (select count(*) from public.families where status = 'draft')
  );
end;
$$;

create function public.studio_daily_activity(p_days int default 30)
returns table (day date, downloads bigint, signups bigint, revenue_paise bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    d::date,
    (select count(*) from public.downloads x where x.created_at::date = d::date),
    (select count(*) from public.profiles p where p.created_at::date = d::date),
    (select coalesce(sum(o.amount_paise), 0)::bigint from public.orders o where o.status = 'paid' and o.paid_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  order by 1;
end;
$$;

create function public.studio_top_families(p_days int default 30, p_limit int default 8)
returns table (id uuid, slug text, name text, price_paise int, downloads bigint, buyers bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select f.id, f.slug, f.name, f.price_paise,
    (select count(*) from public.downloads d where d.family_id = f.id and d.created_at >= now() - make_interval(days => p_days)),
    (select count(*) from public.entitlements e where e.family_id = f.id and e.created_at >= now() - make_interval(days => p_days))
  from public.families f
  where f.status = 'published'
  order by 5 desc, 6 desc
  limit p_limit;
end;
$$;

create function public.studio_search_demand(p_days int default 30, p_unmatched_only boolean default false)
returns table (query text, searches bigint, unmatched bigint, members bigint, last_searched timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select s.normalized,
    count(*),
    count(*) filter (where s.results_count = 0),
    count(distinct s.user_id),
    max(s.created_at)
  from public.searches s
  where s.created_at >= now() - make_interval(days => p_days)
  group by s.normalized
  having not p_unmatched_only or count(*) filter (where s.results_count = 0) > 0
  order by 3 desc, 2 desc
  limit 200;
end;
$$;
