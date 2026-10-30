// Regras do parcelamento no cartão. Pura, pra testar. O site tem uma cópia em
// artifacts/web/src/lib/installments.ts — mantenha as duas iguais.
//
// "Sem juros" aqui significa que o cliente paga o mesmo total em qualquer número de parcelas;
// a taxa do parcelamento é descontada da loja pelo Asaas.

export type InstallmentSettings = {
  /** Até quantas parcelas sem juros a loja oferece (1 = só à vista). */
  maxInterestFree: number;
  /** Valor mínimo de cada parcela, em reais. */
  minInstallmentValue: number;
};

/** O Asaas não aceita parcela abaixo de R$ 5,00 nem mais de 12 parcelas. */
export const ASAAS_MIN_INSTALLMENT = 5;
export const ASAAS_MAX_INSTALLMENTS = 12;

export const DEFAULT_INSTALLMENT_SETTINGS: InstallmentSettings = {
  maxInterestFree: 6,
  minInstallmentValue: ASAAS_MIN_INSTALLMENT,
};

/** Lê o que veio do banco/formulário; qualquer coisa fora do permitido volta para um valor válido. */
export function parseInstallmentSettings(raw: unknown): InstallmentSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const max = Math.round(Number(o.maxInterestFree));
  const min = Number(o.minInstallmentValue);
  return {
    maxInterestFree: Number.isFinite(max)
      ? Math.min(Math.max(max, 1), ASAAS_MAX_INSTALLMENTS)
      : DEFAULT_INSTALLMENT_SETTINGS.maxInterestFree,
    minInstallmentValue: Number.isFinite(min)
      ? Math.max(Math.round(min * 100) / 100, ASAAS_MIN_INSTALLMENT)
      : DEFAULT_INSTALLMENT_SETTINGS.minInstallmentValue,
  };
}

/** Maior número de parcelas disponível para esse total (sempre pelo menos 1, à vista). */
export function maxInstallments(total: number, s: InstallmentSettings): number {
  const byValue = Math.floor((total + 1e-9) / s.minInstallmentValue);
  return Math.max(1, Math.min(s.maxInterestFree, byValue));
}

export function installmentsAllowed(total: number, installments: number, s: InstallmentSettings): boolean {
  return Number.isInteger(installments) && installments >= 1 && installments <= maxInstallments(total, s);
}
