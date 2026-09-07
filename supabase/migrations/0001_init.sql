-- =============================================================================
-- UR3 — schema unificado no Supabase (Postgres + Auth + RLS)
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode uma vez.
-- Substitui todo o servidor Express: o front fala direto com o banco.
-- =============================================================================

-- ------------------------------------------------------------------ helpers ---
create or replace function public.slugify(value text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(value,
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------------ products ---
create table if not exists public.products (
  id               bigint generated always as identity primary key,
  name             text not null,
  slug             text not null unique,
  description      text not null,
  category         text not null,
  price            double precision not null check (price >= 0),
  compare_at_price double precision check (compare_at_price >= 0),
  stock            integer not null default 0 check (stock >= 0),
  image_url        text not null,
  featured         boolean not null default false,
  rating           double precision not null default 4.8,
  review_count     integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);

create or replace function public.products_fill_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name) || '-' || floor(random() * 100000)::text;
  end if;
  return new;
end;
$$;

drop trigger if exists products_fill_slug on public.products;
create trigger products_fill_slug before insert on public.products
  for each row execute function public.products_fill_slug();

-- ------------------------------------------------------------------ profiles ---
-- Uma linha por conta (espelha auth.users). id = auth.uid().
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text,
  phone       text,
  postal_code text,
  city        text,
  state       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente quando alguém se cadastra no Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- papéis -----
create table if not exists public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'operator')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- SECURITY DEFINER: consultam user_roles sem passar pela RLS (evita recursão).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------------ orders -----
create table if not exists public.orders (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users (id) on delete set null,
  profile_id      uuid references public.profiles (id) on delete set null,
  customer_name   text not null,
  customer_email  text not null,
  postal_code     text not null,
  status          text not null default 'Pedido confirmado',
  subtotal        double precision not null,
  shipping        double precision not null,
  total           double precision not null,
  shipping_option jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id) on delete cascade,
  product_id   bigint references public.products (id) on delete set null,
  product_name text not null,
  quantity     integer not null check (quantity > 0),
  unit_price   double precision not null,
  total        double precision not null
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- Baixa de estoque ao inserir item do pedido.
create or replace function public.decrement_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products
     set stock = greatest(stock - new.quantity, 0)
   where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists order_items_decrement_stock on public.order_items;
create trigger order_items_decrement_stock after insert on public.order_items
  for each row execute function public.decrement_stock();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_roles  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- products: catálogo público; escrita só para equipe
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (true);

drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_staff()) with check (public.is_staff());

-- profiles: cada um vê/edita o seu; equipe pode ler todos
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (auth.uid() = id or public.is_staff());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- user_roles: cada um vê os próprios papéis; só admin gerencia
drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

-- orders: cliente vê os seus; equipe vê todos; convidado (user_id null) insere
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select
  using (auth.uid() = user_id or public.is_staff());

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists orders_staff_write on public.orders;
create policy orders_staff_write on public.orders for update
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists orders_staff_delete on public.orders;
create policy orders_staff_delete on public.orders for delete
  using (public.is_staff());

-- order_items: acompanham o pedido pai
drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())
  )
);

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null)
  )
);

drop policy if exists order_items_staff_write on public.order_items;
create policy order_items_staff_write on public.order_items for all
  using (public.is_staff()) with check (public.is_staff());

-- =============================================================================
-- Grants (anon = visitante deslogado, authenticated = logado)
-- =============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.order_items to anon, authenticated;

-- =============================================================================
-- Métricas do painel (substitui GET /api/dashboard/summary)
-- Chamado do front com supabase.rpc('admin_dashboard_summary').
-- =============================================================================
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

-- =============================================================================
-- PRIMEIRO ADMIN
-- Depois de se cadastrar no site (ou em Authentication > Users), rode:
--
--   insert into public.user_roles (user_id, role)
--   values ('<UUID-do-usuario>', 'admin');
--
-- O UUID aparece em Authentication > Users no painel do Supabase.
-- =============================================================================
