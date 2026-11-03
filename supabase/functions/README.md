# Edge Functions

Projeto Supabase: `oglvswnmvsfzqnwjmkwi`. Código compartilhado em `_shared/` (módulos puros, sem acesso ao banco, ficam fáceis de testar).

| Função | Quem chama | JWT | O que faz |
| --- | --- | --- | --- |
| `shipping-quote` | site (qualquer visitante) | não | Cota frete real na Melhor Envio a partir do CEP e dos produtos (peso/medidas do cadastro) e aplica as regras de frete grátis do painel |
| `order-label` | painel admin | sim (equipe; `check` só administrador) | Gera, imprime, atualiza o rastreio e cancela a etiqueta da Melhor Envio de um pedido pago; `check` mostra o saldo da carteira |
| `shipping-rules-check` | painel admin | sim (só administrador) | Simulador da aba Frete: com este CEP e valor de pedido, haveria frete grátis? |
| `checkout-pay` | site (cliente logado) | sim | Cria o pedido, reserva estoque, recalcula preço/frete/cupom no servidor e cobra no Asaas (Pix ou cartão) |
| `asaas-webhook` | Asaas | não (valida o token) | Confirma/cancela/estorna o pedido conforme o pagamento muda no Asaas |
| `order-refund` | painel admin | sim (só administrador) | Estorno total de um pedido pago: pede ao Asaas, cancela o pedido e devolve (ou não) os itens ao estoque |
| `bling-oauth-callback` | Bling | não | Conclui a conexão OAuth com a Bling |
| `bling-sync-stock` | painel admin | sim (staff) | Sincroniza estoque da Bling |
| `bling-import` | painel admin | sim (staff) | Importa produtos da Bling (um ou em lote) |

## Secrets

Configure com `npx supabase secrets set "NOME=valor" --project-ref oglvswnmvsfzqnwjmkwi`. Nunca coloque no repositório.

| Secret | Obrigatório | Para quê |
| --- | --- | --- |
| `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` | sim (Bling) | OAuth da Bling |
| `ADMIN_REDIRECT_URL` | não | Para onde voltar depois de conectar a Bling (padrão `https://ur3.com.br/admin`) |
| `MELHORENVIO_TOKEN` | sim (frete) | Token de acesso da Melhor Envio |
| `SHIPPING_ORIGIN_CEP` | sim (frete) | CEP de onde a loja despacha (8 dígitos) |
| `SHIPPING_CONTACT_EMAIL` | sim (frete) | E-mail de contato enviado no `User-Agent` (exigência da Melhor Envio) |
| `MELHORENVIO_ENV` | não | `sandbox` para testar; qualquer outro valor = produção |
| `ASAAS_API_KEY` | sim (pagamento) | Chave de API do Asaas |
| `ASAAS_WEBHOOK_TOKEN` | sim (pagamento) | Valor aleatório; o mesmo texto vai no campo "Token de autenticação" do webhook no Asaas |
| `ASAAS_ENV` | não | `sandbox` ou `production`. Sem ele, a chave `$aact_hmlg_...` é tratada como sandbox |

Sem as configurações de frete, `shipping-quote` responde 503 e o site avisa o cliente. Sem frete ou sem a chave do Asaas, `checkout-pay` recusa com 503 antes de criar qualquer pedido.

## Deploy

```bash
npx supabase functions deploy shipping-quote --no-verify-jwt --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy checkout-pay --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy order-refund --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy shipping-rules-check --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy order-label --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy bling-import --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy bling-sync-stock --project-ref oglvswnmvsfzqnwjmkwi
```

## Webhook do Asaas

Em Integrações > Webhooks, crie um webhook de cobranças:

- URL: `https://oglvswnmvsfzqnwjmkwi.supabase.co/functions/v1/asaas-webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`

O webhook é idempotente (eventos repetidos ficam registrados em `payment_events` e ignorados).

## Parcelamento

O limite de parcelas sem juros e a parcela mínima ficam em `store_settings` (chave `installments`) e se mudam no painel, em **Pagamentos** (só administrador). Padrão: até 6x e R$ 5,00. O `checkout-pay` confere o número de parcelas contra essa regra no servidor; o navegador só mostra as opções. A taxa do parcelamento é descontada da loja pelo Asaas.

## Frete grátis por regra

Tudo se define no painel, em **Frete** (só administrador); nada de regra fixa no código. Cada regra diz onde vale (todo o Brasil, estados, cidades de um estado ou faixa de CEP), a partir de que valor de pedido (opcional) e se só a opção mais barata ou todas ficam grátis. Ficam na tabela `shipping_rules`.

- A região vem do **CEP** (ViaCEP, com BrasilAPI de reserva), não do endereço digitado: escrever "Cascavel" no formulário não dá frete grátis.
- O valor mínimo conta os produtos, sem frete e antes de cupom.
- O servidor aplica a regra tanto na cotação (`shipping-quote`) quanto ao fechar a compra (`checkout-pay`). O pedido guarda o custo real da etiqueta (`shipping_option.originalPrice`), que aparece nos detalhes do pedido no painel.
- Se mais de uma regra valer, vence a que libera todas as opções; empatando, a mais antiga. Se a cidade do CEP não for encontrada, regras por estado/cidade não valem (as de CEP e "todo o Brasil" continuam).

## Etiquetas da Melhor Envio

Configuradas no painel, em **Frete → Etiquetas** (só administrador): modo (desligado, só carrinho, comprar e gerar), documento (nota fiscal ou declaração de conteúdo) e dados do remetente. Nada é gerado sozinho enquanto o modo estiver desligado, o remetente incompleto ou o documento não escolhido.

Fluxo (por pedido pago): carrinho (`/me/cart`) → compra (`/me/shipment/checkout`, debita a carteira) → geração (`/me/shipment/generate`) → rastreio (`/me/shipment/tracking`). Cada passo concluído fica em `order_shipments.step`: uma nova tentativa continua de onde parou e nunca compra duas vezes (`claim_shipment` trava execuções simultâneas). Dispara no webhook do Asaas (Pix) e no `checkout-pay` (cartão aprovado na hora), em segundo plano; falhas ficam anotadas no pedido (aba Pedidos → detalhes → Envio) e a equipe pode tentar de novo.

- **Token:** o `MELHORENVIO_TOKEN` precisa destas permissões: `cart-read`, `cart-write`, `orders-read`, `shipping-calculate`, `shipping-checkout`, `shipping-generate`, `shipping-print`, `shipping-tracking`, `shipping-cancel`, `shipping-companies`, `users-read`, `transactions-read`.
- **Nota fiscal:** envio comercial exige a chave da NF-e; a declaração de conteúdo só vale para pessoa física ou empresa que não é contribuinte de ICMS. Com "nota fiscal", o automático espera a pessoa informar a chave no pedido.
- **Não dá por API:** LATAM Cargo e Azul Cargo (o pedido fica com aviso para gerar na Melhor Envio).
- **Volume:** todos os itens vão num volume só (maior largura/comprimento, alturas somadas, peso somado), então o preço pode diferir da cotação. Sem peso/medidas no produto entra a caixa padrão e o pedido fica com aviso.
- **Estorno:** estornar o pedido cancela a etiqueta já comprada (o saldo volta em até 12 horas se a transportadora ainda não coletou).
- **Saldo:** a compra debita a carteira da Melhor Envio; sem saldo o pedido fica com o aviso e é só recarregar e tentar de novo.

## Estorno

No painel, em Pedidos → detalhes do pedido pago → **Estornar pagamento** (só administrador). O pedido vira Cancelado + Reembolsado e sai da receita. O estoque só volta se a opção estiver marcada (não marque quando o produto não existe mais). Pelo painel não dá para cancelar um pedido já pago sem estornar (o banco recusa). Estorno feito direto no Asaas também cancela o pedido pelo webhook, mas não mexe no estoque.

## Pedidos e estoque

- O pedido nasce `Aguardando pagamento` e o estoque fica reservado: 30 min (Pix) ou 120 min (cartão).
- Pagamento confirmado → `Pedido confirmado`. Prazo vencido, recusa ou cancelamento → `Cancelado` e o estoque volta.
- Pagamento que chega depois do cancelamento reativa o pedido se ainda houver estoque; senão fica marcado no pedido para reembolso manual.
- `expire_unpaid_orders()` roda a cada chamada de `checkout-pay`. Opcionalmente agende no `pg_cron` (exemplo comentado no fim da migration `0010`).
