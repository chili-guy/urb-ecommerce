-- 0014 — etiquetas da Melhor Envio geradas automaticamente depois do pagamento.
-- Rode depois da 0013. Pode rodar mais de uma vez.
--
-- Guarda as configurações privadas (modo, documento fiscal e dados do remetente), o andamento
-- de cada etiqueta e o código de rastreio. Quem escreve é só o servidor (Edge Functions).

-- ================================================ 1. CONFIGURAÇÕES PRIVADAS ==
-- Diferente de store_settings (leitura pública), aqui só administrador lê e altera:
-- tem CPF/CNPJ, telefone e endereço do remetente.
create table if not exists public.private_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create or replace function public.private_settings_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists private_settings_touch on public.private_settings;
create trigger private_settings_touch before insert or update on public.private_settings
  for each row execute function public.private_settings_touch();

alter table public.private_settings enable row level security;

drop policy if exists private_settings_admin on public.private_settings;
create policy private_settings_admin on public.private_settings for all
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.private_settings from anon, authenticated;
grant select, insert, update on public.private_settings to authenticated;

-- ============================================================ 2. ETIQUETAS ==
-- Uma linha por pedido que já tentou gerar etiqueta. `step` é o último passo concluído na
-- Melhor Envio (cart -> purchased -> generated); com ele, uma nova tentativa continua de onde
-- parou e nunca compra duas vezes. `status`: processing | ok | failed.
create table if not exists public.order_shipments (
  order_id     bigint primary key references public.orders (id) on delete cascade,
  status       text not null default 'processing',
  step         text,
  me_order_id  text,
  protocol     text,
  service_id   integer,
  price        numeric(12, 2),
  tracking     text,
  note         text,
  attempts     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.order_shipments drop constraint if exists order_shipments_status_ok;
alter table public.order_shipments add constraint order_shipments_status_ok
  check (status in ('processing', 'ok', 'failed'));
alter table public.order_shipments drop constraint if exists order_shipments_step_ok;
alter table public.order_shipments add constraint order_shipments_step_ok
  check (step is null or step in ('cart', 'purchased', 'generated'));

create or replace function public.order_shipments_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists order_shipments_touch on public.order_shipments;
create trigger order_shipments_touch before update on public.order_shipments
  for each row execute function public.order_shipments_touch();

-- A equipe (admin e operador) vê o andamento; ninguém escreve pelo painel, só o servidor.
alter table public.order_shipments enable row level security;

drop policy if exists order_shipments_staff_read on public.order_shipments;
create policy order_shipments_staff_read on public.order_shipments for select
  using (public.is_staff());

revoke all on public.order_shipments from anon, authenticated;
grant select on public.order_shipments to authenticated;

-- Código de rastreio que o cliente enxerga no pedido (o resto do andamento é só da equipe).
alter table public.orders add column if not exists tracking_code text;

-- Chave da nota fiscal (44 dígitos) que a pessoa informa antes de gerar a etiqueta.
alter table public.orders add column if not exists invoice_key text;
alter table public.orders drop constraint if exists orders_invoice_key_ok;
alter table public.orders add constraint orders_invoice_key_ok
  check (invoice_key is null or invoice_key ~ '^[0-9]{44}$');

-- ============================================== 3. TRAVA CONTRA ETIQUETA DUPLA ==
-- Reserva o direito de gerar a etiqueta de um pedido (webhook repetido, clique duplo e retentativa
-- não compram duas vezes). Só pedido PAGO e não cancelado. Devolve:
--   { ok: true,  resume: null | { meOrderId, step } }
--   { ok: false, reason: not_found | not_paid | already_generated | in_progress }
create or replace function public.claim_shipment(p_order_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_ship  public.order_shipments%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(v_order.payment_status, '') <> 'paid' or v_order.status = 'Cancelado' then
    return jsonb_build_object('ok', false, 'reason', 'not_paid');
  end if;

  select * into v_ship from public.order_shipments where order_id = p_order_id for update;
  if not found then
    insert into public.order_shipments (order_id, status, attempts) values (p_order_id, 'processing', 1);
    return jsonb_build_object('ok', true, 'resume', null);
  end if;

  if v_ship.step = 'generated' then
    return jsonb_build_object('ok', false, 'reason', 'already_generated');
  end if;
  -- Outra execução está rodando agora (uma que travou há mais de 3 minutos pode ser retomada).
  if v_ship.status = 'processing' and v_ship.updated_at > now() - interval '3 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'in_progress');
  end if;

  update public.order_shipments
     set status = 'processing', attempts = attempts + 1, note = null
   where order_id = p_order_id;
  return jsonb_build_object(
    'ok', true,
    'resume', case when v_ship.me_order_id is null and v_ship.step is null then null
                   else jsonb_build_object('meOrderId', v_ship.me_order_id, 'step', v_ship.step) end
  );
end;
$$;

revoke all on function public.claim_shipment(bigint) from public, anon, authenticated;
grant execute on function public.claim_shipment(bigint) to service_role;
