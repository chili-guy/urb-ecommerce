-- =============================================================================
-- UR3 — pacote de recursos (rode no SQL Editor DEPOIS de 0001..0003)
--
--   1. Upload de imagem de produto      -> bucket de Storage + políticas
--   2. Especificações técnicas          -> products.specs (jsonb)
--   3. Contador de acessos              -> products.view_count + RPC
--   4. Endereços salvos do cliente      -> tabela public.addresses
--   5. Status de pedido gerenciável     -> constraint + (RLS de staff já existe)
--   6. Métricas: "produtos mais acessados" no admin_dashboard_summary()
--
-- Tudo idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================

-- ============================================================ 1. STORAGE ======
-- Bucket público de imagens de produto. Leitura liberada; escrita só p/ equipe.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product images staff insert" on storage.objects;
create policy "product images staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "product images staff update" on storage.objects;
create policy "product images staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "product images staff delete" on storage.objects;
create policy "product images staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());

-- ================================================= 2. ESPECIFICAÇÕES TÉCNICAS ==
-- Lista ordenada de pares { "label": "...", "value": "..." }.
alter table public.products
  add column if not exists specs jsonb not null default '[]'::jsonb;

-- ==================================================== 3. CONTADOR DE ACESSOS ==
alter table public.products
  add column if not exists view_count bigint not null default 0;

create index if not exists products_view_count_idx
  on public.products (view_count desc);

-- Incremento atômico chamado da página do produto (visitante ou logado).
create or replace function public.increment_product_views(p_product_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.products
     set view_count = view_count + 1
   where id = p_product_id;
$$;

grant execute on function public.increment_product_views(bigint) to anon, authenticated;

-- ===================================================== 4. ENDEREÇOS SALVOS ====
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text not null default 'Endereço',
  recipient   text not null default '',
  postal_code text not null,
  street      text not null default '',
  number      text not null default '',
  complement  text,
  district    text not null default '',
  city        text not null default '',
  state       text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- O primeiro endereço do cliente já entra como padrão.
create or replace function public.addresses_first_is_default()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.addresses where user_id = new.user_id) then
    new.is_default := true;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_first_is_default on public.addresses;
create trigger addresses_first_is_default before insert on public.addresses
  for each row execute function public.addresses_first_is_default();

-- Só um endereço padrão por cliente.
create or replace function public.addresses_single_default()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default
  after insert or update of is_default on public.addresses
  for each row when (new.is_default)
  execute function public.addresses_single_default();

alter table public.addresses enable row level security;

drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.addresses to authenticated;

-- =================================================== 5. STATUS DE PEDIDO ======
-- Normaliza valores fora do conjunto antes de aplicar a checagem.
update public.orders
   set status = 'Pedido confirmado'
 where status is null
    or status not in (
      'Pedido confirmado', 'Em separação', 'Enviado', 'Entregue', 'Cancelado'
    );

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'Pedido confirmado', 'Em separação', 'Enviado', 'Entregue', 'Cancelado'
  ));
-- A RLS `orders_staff_write` (0001) já permite UPDATE para a equipe.

-- ============================================ 6. MÉTRICAS DO PAINEL ===========
-- Reescreve a função para incluir "mostViewed" (produtos mais acessados).
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
