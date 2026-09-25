-- =============================================================================
-- UR3 — banners rotativos da home + contador de visitas do site
-- (rode no SQL Editor DEPOIS de 0001..0006). Idempotente.
-- =============================================================================

-- ============================================================= 1. BANNERS =====
create table if not exists public.banners (
  id         bigint generated always as identity primary key,
  image_url  text not null,
  link_url   text,
  title      text not null default '',
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists banners_sort_order_idx on public.banners (sort_order);

alter table public.banners enable row level security;

drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners for select using (true);

drop policy if exists banners_write on public.banners;
create policy banners_write on public.banners for all
  using (public.is_staff()) with check (public.is_staff());

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;

-- Bucket de imagens de banner — mesmo padrão do product-images (0004).
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "site media public read" on storage.objects;
create policy "site media public read" on storage.objects
  for select using (bucket_id = 'site-media');

drop policy if exists "site media staff insert" on storage.objects;
create policy "site media staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_staff());

drop policy if exists "site media staff update" on storage.objects;
create policy "site media staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.is_staff())
  with check (bucket_id = 'site-media' and public.is_staff());

drop policy if exists "site media staff delete" on storage.objects;
create policy "site media staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.is_staff());

-- ======================================================= 2. VISITAS DO SITE ===
create table if not exists public.site_visits_daily (
  day   date primary key,
  count bigint not null default 0
);

alter table public.site_visits_daily enable row level security;

drop policy if exists site_visits_staff_read on public.site_visits_daily;
create policy site_visits_staff_read on public.site_visits_daily for select
  using (public.is_staff());

-- Sem grant de select pra anon/authenticated em geral — só a função abaixo
-- (SECURITY DEFINER) escreve, e só staff lê a tabela direto.
grant select on public.site_visits_daily to authenticated;

create or replace function public.increment_site_visit()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_visits_daily (day, count)
  values (current_date, 1)
  on conflict (day) do update set count = public.site_visits_daily.count + 1;
end;
$$;

grant execute on function public.increment_site_visit() to anon, authenticated;

-- ============================================ 3. PAINEL: SOMA AS VISITAS ======
create or replace function public.admin_dashboard_summary()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  result json;
  dow_labels text[] := array['dom','seg','ter','qua','qui','sex','sáb'];
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select json_build_object(
    'revenue',       coalesce((select sum(total) from public.orders), 0),
    'revenueChange', 0,
    'orders',        (select count(*) from public.orders),
    'ordersChange',  0,
    'customers',     (select count(*) from public.profiles),
    'products',      (select count(*) from public.products),
    'inventoryUnits',coalesce((select sum(stock) from public.products), 0),
    'lowStock',      coalesce((select count(*) from public.products where stock <= 5), 0),
    'visits7Days', coalesce((
      select sum(count) from public.site_visits_daily
      where day >= current_date - interval '6 days'
    ), 0),
    'visitsTotal', coalesce((select sum(count) from public.site_visits_daily), 0),
    'salesByDay', (
      select coalesce(json_agg(json_build_object(
        'label', dow_labels[extract(dow from d)::int + 1],
        'value', coalesce((
          select round(sum(o.total)::numeric, 2)
          from public.orders o
          where o.created_at >= d and o.created_at < d + interval '1 day'
        ), 0)
      ) order by d), '[]'::json)
      from generate_series(
        (current_date - interval '6 days'), current_date, interval '1 day'
      ) as d
    ),
    'topProducts', (
      select coalesce(json_agg(t), '[]'::json) from (
        select product_name as name,
               sum(quantity)::int as sales,
               round(sum(total)::numeric, 2) as revenue
        from public.order_items
        group by product_name
        order by sum(total) desc
        limit 4
      ) t
    ),
    'mostViewed', (
      select coalesce(json_agg(v), '[]'::json) from (
        select id,
               name,
               view_count::int as views,
               image_url as "imageUrl"
        from public.products
        where view_count > 0
        order by view_count desc
        limit 5
      ) v
    ),
    'recentOrders', (
      select coalesce(json_agg(r), '[]'::json) from (
        select id, customer_name as "customerName", total, status,
               created_at as "createdAt"
        from public.orders
        order by created_at desc
        limit 5
      ) r
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_summary() to authenticated;
