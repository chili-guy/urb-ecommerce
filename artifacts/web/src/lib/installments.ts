// Regras do parcelamento no cartão (cópia de supabase/functions/_shared/installments.ts —
// mantenha as duas iguais). O servidor é quem decide de verdade; aqui só mostramos as opções.
//
// "Sem juros" = o cliente paga o mesmo total em qualquer número de parcelas; a taxa do
// parcelamento é descontada da loja pelo Asaas.

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
