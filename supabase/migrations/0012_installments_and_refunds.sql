-- 0012 — parcelamento configurável no painel e estorno de pedidos pagos.
-- Rode depois da 0010/0011. Pode rodar mais de uma vez.

-- ============================================================ 1. CONFIGURAÇÕES ==
-- Configurações da loja que o site precisa ler sem estar logado (ex.: até quantas
-- parcelas sem juros). SÓ coloque aqui o que pode ser público: a leitura é aberta.
create table if not exists public.store_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Formato do parcelamento: de 1 a 12 parcelas sem juros e parcela mínima de R$ 5,00
-- (o Asaas não aceita menos). O CASE garante a ordem: só converte depois de checar o formato.
alter table public.store_settings drop constraint if exists store_settings_installments_shape;
alter table public.store_settings add constraint store_settings_installments_shape check (
  key <> 'installments' or case
    when jsonb_typeof(value) = 'object'
         and (value ->> 'maxInterestFree') ~ '^[0-9]{1,2}$'
         and (value ->> 'minInstallmentValue') ~ '^[0-9]{1,6}(\.[0-9]{1,2})?$'
    then (value ->> 'maxInterestFree')::int between 1 and 12
         and (value ->> 'minInstallmentValue')::numeric >= 5
    else false
  end
);

create or replace function public.store_settings_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists store_settings_touch on public.store_settings;
create trigger store_settings_touch before insert or update on public.store_settings
  for each row execute function public.store_settings_touch();

alter table public.store_settings enable row level security;

drop policy if exists store_settings_read on public.store_settings;
create policy store_settings_read on public.store_settings for select using (true);

-- Só administrador altera (é dinheiro: quem paga a taxa do parcelamento é a loja).
drop policy if exists store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings for all
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.store_settings from anon, authenticated;
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

-- Padrão: até 6x sem juros (antes era 12x fixo). O administrador muda em Pagamentos.
insert into public.store_settings (key, value)
values ('installments', '{"maxInterestFree": 6, "minInstallmentValue": 5}'::jsonb)
on conflict (key) do nothing;

-- ================================================================= 2. ESTORNO ==
-- "Intenção de estorno": a função do painel grava aqui se o estoque deve voltar ANTES de
-- pedir o estorno ao Asaas. Assim, se o aviso do Asaas chegar antes da resposta, o banco
-- ainda sabe o que o administrador escolheu.
alter table public.orders add column if not exists refund_intent jsonb;

-- Fecha o estorno no banco: pedido vira Cancelado + Reembolsado, e o estoque volta só se
-- foi pedido (produto indisponível NÃO volta: o item não existe mais).
-- Idempotente. Devolve: refunded | already_refunded | not_paid | not_found
create or replace function public.refund_order_record(
  p_order_id      bigint,
  p_restore_stock boolean default null,
  p_note          text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_order   public.orders%rowtype;
  v_restore boolean;
  v_note    text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;
  if coalesce(v_order.payment_status, '') not in ('paid', 'refunded') then
    return 'not_paid';
  end if;
  if v_order.payment_status = 'refunded' and v_order.status = 'Cancelado' then
    return 'already_refunded';
  end if;

  v_restore := coalesce(p_restore_stock, (v_order.refund_intent ->> 'restoreStock')::boolean, false);
  v_note := coalesce(nullif(v_order.refund_intent ->> 'note', ''), p_note, 'Pagamento estornado.');

  -- Pedido já cancelado (pago depois do prazo) não segurava estoque: não há o que devolver.
  if v_restore and v_order.status <> 'Cancelado' then
    update public.products p
       set stock = p.stock + s.qty
      from (select product_id, sum(quantity) as qty
              from public.order_items
             where order_id = p_order_id and product_id is not null
             group by product_id) s
     where p.id = s.product_id;
  end if;

  update public.orders
     set status = 'Cancelado', payment_status = 'refunded',
         payment_note = v_note, refund_intent = null
   where id = p_order_id;
  return 'refunded';
end;
$$;

revoke all on function public.refund_order_record(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.refund_order_record(bigint, boolean, text) to service_role;

-- ================================================= 3. TRAVA: PAGO NÃO CANCELA SEM ESTORNO ==
-- Pelo painel, mudar um pedido PAGO para "Cancelado" deixaria o cliente sem o dinheiro de volta
-- e a venda saindo do relatório. O caminho certo é o botão "Estornar pagamento". Funções do
-- servidor (estorno, webhook) passam: elas mudam o pagamento junto.
create or replace function public.orders_guard_paid_cancel() returns trigger
language plpgsql as $$
begin
  if new.status = 'Cancelado' and old.status <> 'Cancelado'
     and old.payment_status = 'paid' and new.payment_status = 'paid'
     and current_user in ('authenticated', 'anon') then
    raise exception 'Pedido já pago: use "Estornar pagamento" para cancelar e devolver o dinheiro.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_paid_cancel on public.orders;
create trigger orders_guard_paid_cancel before update on public.orders
  for each row execute function public.orders_guard_paid_cancel();
