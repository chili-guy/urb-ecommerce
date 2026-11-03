-- 0013 — regras de frete grátis (cortesia) editáveis no painel, em "Frete".
-- Rode depois da 0012. Pode rodar mais de uma vez.
--
-- Cada regra diz ONDE vale (todo o Brasil, estados, cidades de um estado ou faixa de CEP),
-- a partir de que VALOR de pedido (opcional) e QUAIS opções ficam grátis (só a mais barata
-- ou todas). Quem aplica é o servidor, na hora de cotar e de fechar a compra: o navegador
-- nunca decide o preço do frete. A loja segue pagando a etiqueta na Melhor Envio.

create table if not exists public.shipping_rules (
  id              bigint generated always as identity primary key,
  name            text not null,
  active          boolean not null default true,
  area_type       text not null default 'all',
  states          text[] not null default '{}',
  cities          text[] not null default '{}',
  cep_from        text,
  cep_to          text,
  min_order_value numeric(12, 2),
  scope           text not null default 'cheapest',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null
);

-- Formato validado no banco (o painel valida também, mas o banco é quem garante).
alter table public.shipping_rules drop constraint if exists shipping_rules_name_ok;
alter table public.shipping_rules add constraint shipping_rules_name_ok
  check (char_length(btrim(name)) between 1 and 80);

alter table public.shipping_rules drop constraint if exists shipping_rules_min_ok;
alter table public.shipping_rules add constraint shipping_rules_min_ok
  check (min_order_value is null or (min_order_value >= 0 and min_order_value <= 1000000));

alter table public.shipping_rules drop constraint if exists shipping_rules_scope_ok;
alter table public.shipping_rules add constraint shipping_rules_scope_ok
  check (scope in ('cheapest', 'all'));

alter table public.shipping_rules drop constraint if exists shipping_rules_states_ok;
alter table public.shipping_rules add constraint shipping_rules_states_ok
  check (states <@ array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::text[]);

alter table public.shipping_rules drop constraint if exists shipping_rules_area_ok;
alter table public.shipping_rules add constraint shipping_rules_area_ok check (
  case area_type
    when 'all'       then true
    when 'states'    then cardinality(states) between 1 and 27
    when 'cities'    then cardinality(states) = 1 and cardinality(cities) between 1 and 200
    when 'cep_range' then coalesce(cep_from ~ '^[0-9]{8}$', false)
                      and coalesce(cep_to ~ '^[0-9]{8}$', false)
                      and cep_from <= cep_to
    else false
  end
);

create or replace function public.shipping_rules_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists shipping_rules_touch on public.shipping_rules;
create trigger shipping_rules_touch before insert or update on public.shipping_rules
  for each row execute function public.shipping_rules_touch();

-- Só administrador vê e altera (quem aplica é o servidor, com a service_role).
alter table public.shipping_rules enable row level security;

drop policy if exists shipping_rules_admin on public.shipping_rules;
create policy shipping_rules_admin on public.shipping_rules for all
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.shipping_rules from anon, authenticated;
grant select, insert, update, delete on public.shipping_rules to authenticated;
