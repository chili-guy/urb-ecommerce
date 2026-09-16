-- =============================================================================
-- UR3 — pacote de escopo do cliente (rode no SQL Editor DEPOIS de 0001..0004)
--
--   1. Catálogo:    subcategoria, SKU, variações (variant_group/variant_label)
--   2. Produto:     galeria de imagens extra, vídeo do YouTube
--   3. Avaliações:  product_reviews (nota + comentário), recalcula rating/
--                   review_count do produto automaticamente
--   4. Cupons:      tabela coupons + validação/aplicação dentro do create_order
--   5. Painel:      admin_customers_summary() para a aba Clientes
--
-- Idempotente: pode ser rodado mais de uma vez sem erro.
-- =============================================================================

-- ============================================================ 1. CATÁLOGO ====
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists variant_group text;
alter table public.products add column if not exists variant_label text;

create index if not exists products_subcategory_idx on public.products (subcategory);
create index if not exists products_variant_group_idx on public.products (variant_group);
create unique index if not exists products_sku_key
  on public.products (sku) where sku is not null and sku <> '';

-- ============================================================== 2. MÍDIA =====
-- Galeria extra (além de image_url). Lista de URLs: ["https://...", ...]
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists video_url text;

-- =========================================================== 3. AVALIAÇÕES ===
create table if not exists public.product_reviews (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  author     text not null default '',
  rating     integer not null check (rating between 1 and 5),
  comment    text not null default '',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_id_idx on public.product_reviews (product_id);

alter table public.product_reviews enable row level security;

drop policy if exists product_reviews_read on public.product_reviews;
create policy product_reviews_read on public.product_reviews for select using (true);

drop policy if exists product_reviews_insert on public.product_reviews;
create policy product_reviews_insert on public.product_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists product_reviews_update on public.product_reviews;
create policy product_reviews_update on public.product_reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists product_reviews_delete on public.product_reviews;
create policy product_reviews_delete on public.product_reviews for delete
  using (auth.uid() = user_id or public.is_staff());

grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to authenticated;

-- Mantém products.rating / review_count sincronizados com as avaliações reais
-- (só é acionado quando o produto de fato recebe uma avaliação — produtos sem
-- nenhuma continuam com a nota "de vitrine" do catálogo).
create or replace function public.product_reviews_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_product_id bigint := coalesce(new.product_id, old.product_id);
  v_avg double precision;
  v_count integer;
begin
  select avg(rating)::double precision, count(*) into v_avg, v_count
    from public.product_reviews where product_id = v_product_id;
  update public.products
     set rating = coalesce(round(v_avg::numeric, 1)::double precision, 4.8),
         review_count = coalesce(v_count, 0)
   where id = v_product_id;
  return null;
end;
$$;

drop trigger if exists product_reviews_recompute on public.product_reviews;
create trigger product_reviews_recompute
  after insert or update or delete on public.product_reviews
  for each row execute function public.product_reviews_recompute();

-- ================================================================ 4. CUPONS ==
alter table public.orders add column if not exists discount double precision not null default 0;
alter table public.orders add column if not exists coupon_code text;

create table if not exists public.coupons (
  id          bigint generated always as identity primary key,
  code        text not null,
  type        text not null check (type in ('percent', 'fixed')),
  value       double precision not null check (value > 0),
  min_order   double precision not null default 0,
  max_uses    integer,
  used_count  integer not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists coupons_code_key on public.coupons (upper(code));

alter table public.coupons enable row level security;

drop policy if exists coupons_staff on public.coupons;
create policy coupons_staff on public.coupons for all
  using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.coupons to authenticated;

-- Confere um cupom sem "gastá-lo" — usado no checkout antes de fechar o pedido.
-- SECURITY DEFINER: cliente deslogado/comum não tem SELECT em coupons, mas pode
-- checar validade de um código específico através desta função.
create or replace function public.preview_coupon(p_code text, p_subtotal double precision)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount double precision;
begin
  select * into v_coupon from public.coupons where upper(code) = upper(trim(p_code));

  if not found then
    return json_build_object('valid', false, 'reason', 'Cupom não encontrado.');
  end if;
  if not v_coupon.active then
    return json_build_object('valid', false, 'reason', 'Cupom inativo.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return json_build_object('valid', false, 'reason', 'Cupom expirado.');
  end if;
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return json_build_object('valid', false, 'reason', 'Cupom esgotado.');
  end if;
  if p_subtotal < v_coupon.min_order then
    return json_build_object(
      'valid', false,
      'reason', format('Pedido mínimo de R$ %s para este cupom.', to_char(v_coupon.min_order, 'FM999990.00'))
    );
  end if;

  v_discount := case
    when v_coupon.type = 'percent' then round((p_subtotal * v_coupon.value / 100)::numeric, 2)
    else least(v_coupon.value, p_subtotal)
  end;

  return json_build_object(
    'valid', true,
    'code', v_coupon.code,
    'type', v_coupon.type,
    'value', v_coupon.value,
    'discount', v_discount
  );
end;
$$;

grant execute on function public.preview_coupon(text, double precision) to anon, authenticated;

-- Rescreve create_order (0002) para aceitar cupom opcional. A validação é
-- refeita no servidor — nunca confia no desconto calculado pelo front.
drop function if exists public.create_order(jsonb, jsonb, text, text, text);

create or replace function public.create_order(
  p_items           jsonb,
  p_shipping_option jsonb,
  p_customer_name   text,
  p_customer_email  text,
  p_postal_code     text,
  p_coupon_code     text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_order_id    bigint;
  v_subtotal    double precision := 0;
  v_shipping    double precision;
  v_discount    double precision := 0;
  v_coupon_code text := null;
  v_preview     json;
  v_item        jsonb;
  v_product     public.products%rowtype;
  v_qty         integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'pedido sem itens';
  end if;

  v_shipping := coalesce((p_shipping_option ->> 'price')::double precision, 0);

  -- valida estoque e soma o subtotal com o preço atual do banco
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    select * into v_product from public.products
      where id = (v_item ->> 'productId')::bigint;
    if not found then
      raise exception 'produto % indisponível', v_item ->> 'productId';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception 'quantidade inválida para %', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'estoque insuficiente para %', v_product.name;
    end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    v_preview := public.preview_coupon(p_coupon_code, v_subtotal);
    if (v_preview ->> 'valid')::boolean then
      v_discount := (v_preview ->> 'discount')::double precision;
      v_coupon_code := v_preview ->> 'code';
      update public.coupons set used_count = used_count + 1
        where upper(code) = upper(v_coupon_code);
    else
      raise exception '%', coalesce(v_preview ->> 'reason', 'cupom inválido');
    end if;
  end if;

  insert into public.orders (
    user_id, profile_id, customer_name, customer_email, postal_code,
    subtotal, shipping, discount, coupon_code, total, shipping_option
  ) values (
    auth.uid(), auth.uid(), p_customer_name, p_customer_email, p_postal_code,
    round(v_subtotal::numeric, 2), v_shipping, round(v_discount::numeric, 2), v_coupon_code,
    round(greatest(v_subtotal + v_shipping - v_discount, 0)::numeric, 2), p_shipping_option
  ) returning id into v_order_id;

  -- itens (o trigger order_items_decrement_stock baixa o estoque)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    select * into v_product from public.products
      where id = (v_item ->> 'productId')::bigint;
    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total
    ) values (
      v_order_id, v_product.id, v_product.name, v_qty, v_product.price,
      round((v_product.price * v_qty)::numeric, 2)
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(jsonb, jsonb, text, text, text, text)
  to anon, authenticated;

-- ========================================================= 5. PAINEL: CLIENTES
create or replace function public.admin_customers_summary()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  result json;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(json_agg(t order by t."totalSpent" desc, t."createdAt" desc), '[]'::json)
    into result
  from (
    select
      p.id,
      p.name,
      p.email,
      p.created_at as "createdAt",
      coalesce(o.orders_count, 0)::int as "ordersCount",
      coalesce(o.total_spent, 0) as "totalSpent",
      o.last_order_at as "lastOrderAt"
    from public.profiles p
    left join (
      select user_id,
             count(*) as orders_count,
             sum(total) as total_spent,
             max(created_at) as last_order_at
      from public.orders
      where user_id is not null
      group by user_id
    ) o on o.user_id = p.id
  ) t;

  return result;
end;
$$;

grant execute on function public.admin_customers_summary() to authenticated;
