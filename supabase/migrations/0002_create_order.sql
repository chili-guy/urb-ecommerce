-- =============================================================================
-- create_order — cria pedido + itens de forma atômica, com preços e totais
-- calculados no servidor (o cliente não pode forjar valores).
-- Rode no SQL Editor DEPOIS de 0001_init.sql.
-- =============================================================================
create or replace function public.create_order(
  p_items           jsonb,   -- [{ "productId": 1, "quantity": 2 }, ...]
  p_shipping_option jsonb,   -- { id, carrier, service, price, deliveryDays, description }
  p_customer_name   text,
  p_customer_email  text,
  p_postal_code     text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_order_id  bigint;
  v_subtotal  double precision := 0;
  v_shipping  double precision;
  v_item      jsonb;
  v_product   public.products%rowtype;
  v_qty       integer;
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

  insert into public.orders (
    user_id, profile_id, customer_name, customer_email, postal_code,
    subtotal, shipping, total, shipping_option
  ) values (
    auth.uid(), auth.uid(), p_customer_name, p_customer_email, p_postal_code,
    round(v_subtotal::numeric, 2), v_shipping,
    round((v_subtotal + v_shipping)::numeric, 2), p_shipping_option
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

grant execute on function public.create_order(jsonb, jsonb, text, text, text)
  to anon, authenticated;
