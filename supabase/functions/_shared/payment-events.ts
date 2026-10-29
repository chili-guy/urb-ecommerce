// O que fazer com cada aviso (webhook) de cobrança do Asaas. Pura, pra testar.
// Eventos conferidos em docs.asaas.com ("Eventos para cobranças").

export type WebhookAction =
  | { kind: "paid" }
  | { kind: "failed"; note: string }
  | { kind: "expired"; note: string }
  | { kind: "refunded" }
  | { kind: "chargeback" }
  | { kind: "ignore" };

export function actionForEvent(event: string): WebhookAction {
  switch (event) {
    // Cartão confirma em CONFIRMED; Pix confirma em RECEIVED.
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return { kind: "paid" };
    case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
      return { kind: "failed", note: "O cartão foi recusado na captura." };
    case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
      return { kind: "failed", note: "Pagamento reprovado na análise de risco." };
    case "PAYMENT_OVERDUE":
    case "PAYMENT_DELETED":
      return { kind: "expired", note: "A cobrança venceu ou foi removida no Asaas." };
    case "PAYMENT_REFUNDED":
      return { kind: "refunded" };
    case "PAYMENT_CHARGEBACK_REQUESTED":
      return { kind: "chargeback" };
    default:
      return { kind: "ignore" };
  }
}

export type AsaasWebhookBody = {
  id?: string;
  event?: string;
  payment?: { id?: string; externalReference?: string | null; status?: string; installment?: string | null; value?: number };
};

/** O Asaas manda o token configurado no cabeçalho `asaas-access-token`. Comparação sem pular no primeiro byte diferente. */
export function tokenMatches(received: string | null | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
