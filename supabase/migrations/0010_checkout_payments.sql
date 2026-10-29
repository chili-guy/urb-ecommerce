-- =============================================================================
-- UR3 — checkout com pagamento real (Asaas) e frete real (Melhor Envio)
-- (rode no SQL Editor DEPOIS de 0001..0009). Idempotente.
--
--   1. Peso e medidas dos produtos (base do cálculo de frete)
--   2. Pedidos: endereço de entrega, CPF, telefone e dados do pagamento
--   3. FECHA brechas: ninguém além do servidor insere pedido direto na tabela
--   4. Funções do fluxo (só a service_role das Edge Functions executa):
--        create_checkout_order  cria o pedido já com estoque reservado
--        cancel_unpaid_order    cancela e devolve o estoque
--        mark_order_paid        confirma o pagamento (idempotente)
--        expire_unpaid_orders   cancela pedidos cujo prazo de pagamento acabou
--   5. Painel: receita e clientes ignoram pedidos não pagos/cancelados
-- =============================================================================

-- ====================================================== 1. FRETE: PRODUTOS ===
alter table public.products add column if not exists weight_g  integer;
alter table public.products add column if not exists width_cm  numeric(6, 1);
alter table public.products add column if not exists height_cm numeric(6, 1);
alter table public.products add column if not exists length_cm numeric(6, 1);

alter table public.products drop constraint if exists products_package_check;
alter table public.products add constraint products_package_check check (
  (weight_g  is null or weight_g  > 0) and
  (width_cm  is null or width_cm  > 0) and
  (height_cm is null or height_cm > 0) and
  (length_cm is null or length_cm > 0)
);

-- ========================================================= 2. PEDIDOS =======
alter table public.orders add column if not exists customer_cpf        text;
alter table public.orders add column if not exists customer_phone      text;
alter table public.orders add column if not exists shipping_address    jsonb;
alter table public.orders add column if not exists payment_method      text;
alter table public.orders add column if not exists payment_status      text;
alter table public.orders add column if not exists payment_id          text;
alter table public.orders add column if not exists payment_data        jsonb;
alter table public.orders add column if not exists payment_note        text;
alter table public.orders add column if not exists installments        integer;
alter table public.orders add column if not exists paid_at             timestamptz;
alter table public.orders add column if not exists payment_expires_at  timestamptz;
-- Uma chave por tentativa de compra: clique duplo ou reenvio não cria 2 pedidos nem cobra 2 vezes.
alter table public.orders add column if not exists idempotency_key     text;

-- payment_status NULL = pedido antigo, de antes do pagamento real.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('pix', 'credit_card'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'expired', 'refunded'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'Aguardando pagamento', 'Pedido confirmado', 'Em separação', 'Enviado', 'Entregue', 'Cancelado'
));

create unique index if not exists orders_idempotency_key on public.orders (user_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists orders_payment_id_key on public.orders (payment_id) where payment_id is not null;
create index if not exists orders_payment_pending_idx on public.orders (payment_expires_at)
  where status = 'Aguardando pagamento' and payment_status = 'pending';

-- Log dos avisos (webhooks) do Asaas: o id do evento garante que não processamos duas vezes.
create table if not exists public.payment_events (
  id           text primary key,
  event        text not null,
  order_id     bigint references public.orders (id) on delete set null,
  result       text,
  payload      jsonb,
  received_at  timestamptz not null default now()
);

alter table public.payment_events enable row level security;
drop policy if exists payment_events_staff_read on public.payment_events;
create policy payment_events_staff_read on public.payment_events for select using (public.is_staff());
revoke all on public.payment_events from anon, authenticated;
grant select on public.payment_events to authenticated;

-- ============================================= 3. FECHA AS BRECHAS DE PEDIDO ==
-- Antes: qualquer visitante inseria linha em orders/order_items direto pela API
-- (política "user_id is null"), com total e status à escolha. Agora só o servidor cria.
drop policy if exists orders_insert on public.orders;
drop policy if exists order_items_insert on public.order_items;
revoke insert on public.orders, public.order_items from anon, authenticated;
revoke all on public.orders, public.order_items from anon;

-- ============================================================ 4. FUNÇÕES =====
drop function if exists public.create_checkout_order(uuid, jsonb, jsonb, jsonb, text, text, integer);

create or replace function public.create_checkout_order(
  p_user_id          uuid,
  p_items            jsonb,   -- [{ "productId": 1, "quantity": 2 }]
  p_shipping         jsonb,   -- { id, carrier, service, price, deliveryDays, description }  (preço já conferido no servidor)
  p_customer         jsonb,   -- { name, email, cpf, phone, postalCode, address: {...} }
  p_coupon_code      text,
  p_payment_method   text,
  p_expires_minutes  integer,
  p_idempotency_key  text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_row       record;
  v_product   public.products%rowtype;
  v_subtotal  double precision := 0;
  v_shipping  double precision;
  v_discount  double precision := 0;
  v_coupon    text := null;
  v_preview   json;
  v_total     numeric;
  v_order_id  bigint;
  v_expires   timestamptz;
  v_existing  bigint;
begin
  if p_user_id is null then
    raise exception 'login obrigatório';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'pedido sem itens';
  end if;
  if p_payment_method not in ('pix', 'credit_card') then
    raise exception 'forma de pagamento inválida';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing from public.orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      return json_build_object('orderId', v_existing, 'existing', true);
    end if;
  end if;

  v_shipping := (p_shipping ->> 'price')::double precision;
  if v_shipping is null or v_shipping < 0 then
    raise exception 'frete inválido';
  end if;

  -- Trava os produtos (em ordem de id, pra não dar deadlock), confere o estoque
  -- e soma o subtotal com o preço do banco. Itens repetidos são somados.
  for v_row in
    select (e ->> 'productId')::bigint as product_id, sum((e ->> 'quantity')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if v_row.qty is null or v_row.qty < 1 then
      raise exception 'quantidade inválida';
    end if;
    select * into v_product from public.products where id = v_row.product_id for update;
    if not found then
      raise exception 'produto % indisponível', v_row.product_id;
    end if;
    if v_product.stock < v_row.qty then
      raise exception 'estoque insuficiente para %', v_product.name;
    end if;
    v_subtotal := v_subtotal + v_product.price * v_row.qty;
  end loop;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    v_preview := public.preview_coupon(p_coupon_code, v_subtotal);
    if not coalesce((v_preview ->> 'valid')::boolean, false) then
      raise exception '%', coalesce(v_preview ->> 'reason', 'cupom inválido');
    end if;
    v_discount := (v_preview ->> 'discount')::double precision;
    v_coupon := v_preview ->> 'code';
  end if;

  v_total := round(greatest(v_subtotal + v_shipping - v_discount, 0)::numeric, 2);
  if v_total < 5 then
    raise exception 'O valor mínimo do pedido é R$ 5,00.';
  end if;

  -- Outra requisição com a mesma chave pode ter terminado enquanto esperávamos a trava.
  if p_idempotency_key is not null then
    select id into v_existing from public.orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      return json_build_object('orderId', v_existing, 'existing', true);
    end if;
  end if;

  begin
    if v_coupon is not null then
      update public.coupons set used_count = used_count + 1
       where upper(code) = upper(v_coupon) and (max_uses is null or used_count < max_uses);
      if not found then
        raise exception 'Cupom esgotado.';
      end if;
    end if;

    v_expires := now() + make_interval(mins => greatest(coalesce(p_expires_minutes, 30), 5));

    insert into public.orders (
      user_id, profile_id, customer_name, customer_email, postal_code,
      customer_cpf, customer_phone, shipping_address,
      subtotal, shipping, discount, coupon_code, total, shipping_option,
      status, payment_method, payment_status, payment_expires_at, idempotency_key
    ) values (
      p_user_id, (select id from public.profiles where id = p_user_id),
      p_customer ->> 'name', p_customer ->> 'email', p_customer ->> 'postalCode',
      p_customer ->> 'cpf', p_customer ->> 'phone', p_customer -> 'address',
      round(v_subtotal::numeric, 2), v_shipping, round(v_discount::numeric, 2), v_coupon, v_total, p_shipping,
      'Aguardando pagamento', p_payment_method, 'pending', v_expires, nullif(p_idempotency_key, '')
    ) returning id into v_order_id;

    -- itens (o trigger order_items_decrement_stock baixa o estoque = reserva)
    for v_row in
      select (e ->> 'productId')::bigint as product_id, sum((e ->> 'quantity')::int) as qty
        from jsonb_array_elements(p_items) e
       group by 1
       order by 1
    loop
      select * into v_product from public.products where id = v_row.product_id;
      insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, total)
      values (v_order_id, v_product.id, v_product.name, v_row.qty, v_product.price,
              round((v_product.price * v_row.qty)::numeric, 2));
    end loop;
  exception when unique_violation then
    select id into v_existing from public.orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      return json_build_object('orderId', v_existing, 'existing', true);
    end if;
    raise;
  end;

  return json_build_object(
    'orderId',   v_order_id,
    'subtotal',  round(v_subtotal::numeric, 2),
    'shipping',  v_shipping,
    'discount',  round(v_discount::numeric, 2),
    'total',     v_total,
    'expiresAt', v_expires
  );
end;
$$;

-- Cancela um pedido ainda não pago e devolve estoque e cupom. false = nada a fazer.
create or replace function public.cancel_unpaid_order(
  p_order_id       bigint,
  p_payment_status text,   -- 'failed' | 'expired'
  p_note           text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found
     or v_order.status <> 'Aguardando pagamento'
     or coalesce(v_order.payment_status, '') <> 'pending' then
    return false;
  end if;

  update public.products p
     set stock = p.stock + s.qty
    from (select product_id, sum(quantity) as qty
            from public.order_items
           where order_id = p_order_id and product_id is not null
           group by product_id) s
   where p.id = s.product_id;

  if v_order.coupon_code is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0)
     where upper(code) = upper(v_order.coupon_code);
  end if;

  update public.orders
     set status = 'Cancelado', payment_status = p_payment_status, payment_note = p_note
   where id = p_order_id;
  return true;
end;
$$;

-- Confirma o pagamento. Idempotente: o Asaas pode avisar mais de uma vez.
-- Devolve: paid | already_paid | reactivated | paid_after_cancel | not_found
create or replace function public.mark_order_paid(p_order_id bigint, p_payment_id text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_order   public.orders%rowtype;
  v_row     record;
  v_product public.products%rowtype;
  v_ok      boolean := true;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_order.payment_status = 'paid' then
    return 'already_paid';
  end if;

  -- Pago depois do prazo: tenta reservar o estoque de novo; se não der, avisa pra reembolsar.
  if v_order.status = 'Cancelado' and coalesce(v_order.payment_status, '') in ('expired', 'failed') then
    for v_row in
      select product_id, sum(quantity) as qty from public.order_items
       where order_id = p_order_id and product_id is not null
       group by product_id order by product_id
    loop
      select * into v_product from public.products where id = v_row.product_id for update;
      if not found or v_product.stock < v_row.qty then
        v_ok := false;
      end if;
    end loop;

    if v_ok then
      update public.products p
         set stock = p.stock - s.qty
        from (select product_id, sum(quantity) as qty from public.order_items
               where order_id = p_order_id and product_id is not null group by product_id) s
       where p.id = s.product_id;
      update public.orders
         set status = 'Pedido confirmado', payment_status = 'paid', paid_at = now(),
             payment_id = coalesce(payment_id, p_payment_id),
             payment_note = 'Pago depois do prazo; o estoque foi reservado de novo.'
       where id = p_order_id;
      return 'reactivated';
    end if;

    update public.orders
       set payment_status = 'paid', paid_at = now(),
           payment_id = coalesce(payment_id, p_payment_id),
           payment_note = 'Pago depois do cancelamento e sem estoque: reembolsar o cliente.'
     where id = p_order_id;
    return 'paid_after_cancel';
  end if;

  update public.orders
     set payment_status = 'paid', paid_at = now(),
         payment_id = coalesce(payment_id, p_payment_id),
         status = case when status = 'Aguardando pagamento' then 'Pedido confirmado' else status end,
         payment_note = case when status = 'Cancelado'
                             then 'Pago em pedido cancelado: reembolsar o cliente.' else payment_note end
   where id = p_order_id;
  return 'paid';
end;
$$;

-- Cancela os pedidos cujo prazo de pagamento acabou. Roda a cada checkout/webhook
-- (e, se quiser, por agendamento — veja o fim do arquivo).
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_n  integer := 0;
begin
  for v_id in
    select id from public.orders
     where status = 'Aguardando pagamento' and payment_status = 'pending'
       and payment_expires_at is not null and payment_expires_at < now()
  loop
    if public.cancel_unpaid_order(v_id, 'expired', 'O prazo para pagamento terminou.') then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- Só o servidor (service_role) executa. Sem isto, o Postgres libera para todos.
revoke all on function public.create_checkout_order(uuid, jsonb, jsonb, jsonb, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.cancel_unpaid_order(bigint, text, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(bigint, text) from public, anon, authenticated;
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid, jsonb, jsonb, jsonb, text, text, integer, text) to service_role;
grant execute on function public.cancel_unpaid_order(bigint, text, text) to service_role;
grant execute on function public.mark_order_paid(bigint, text) to service_role;
grant execute on function public.expire_unpaid_orders() to service_role;

-- ================================================ 5. PAINEL: SÓ O QUE FOI PAGO ==
-- Receita, vendas e "mais vendidos" ignoram pedidos aguardando pagamento ou cancelados.
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
    'revenue',       coalesce((select sum(total) from public.orders
                                where status not in ('Cancelado', 'Aguardando pagamento')), 0),
    'revenueChange', 0,
    'orders',        (select count(*) from public.orders
                       where status not in ('Cancelado', 'Aguardando pagamento')),
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
            and o.status not in ('Cancelado', 'Aguardando pagamento')
        ), 0)
      ) order by d), '[]'::json)
      from generate_series(
        (current_date - interval '6 days'), current_date, interval '1 day'
      ) as d
    ),
    'topProducts', (
      select coalesce(json_agg(t), '[]'::json) from (
        select oi.product_name as name,
               sum(oi.quantity)::int as sales,
               round(sum(oi.total)::numeric, 2) as revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.status not in ('Cancelado', 'Aguardando pagamento')
        group by oi.product_name
        order by sum(oi.total) desc
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
        and status not in ('Cancelado', 'Aguardando pagamento')
      group by user_id
    ) o on o.user_id = p.id
  ) t;

  return result;
end;
$$;

grant execute on function public.admin_customers_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- OPCIONAL — agendar a limpeza de pedidos vencidos a cada 5 minutos (pg_cron).
-- Sem isto o prazo também é aplicado a cada novo checkout e a cada aviso do Asaas.
-- Ative a extensão em Database > Extensions > pg_cron e então rode:
--   select cron.schedule('expire-unpaid-orders', '*/5 * * * *', 'select public.expire_unpaid_orders()');
-- ---------------------------------------------------------------------------
