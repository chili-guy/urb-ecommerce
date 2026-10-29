// Validações de documentos e cartão — puras (sem rede), usadas pelo checkout no servidor.
// O site tem uma cópia espelhada em artifacts/web/src/lib/br-docs.ts (mesmos testes).

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

function allSameDigit(d: string): boolean {
  return /^(\d)\1+$/.test(d);
}

export function isValidCpf(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 11 || allSameDigit(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(d[len])) return false;
  }
  return true;
}

export function isValidCnpj(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 14 || allSameDigit(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export const isValidCpfCnpj = (raw: string): boolean => isValidCpf(raw) || isValidCnpj(raw);

/** Telefone brasileiro com DDD: 10 (fixo) ou 11 dígitos (celular). */
export function isValidPhone(raw: string): boolean {
  const d = onlyDigits(raw);
  return (d.length === 10 || d.length === 11) && !d.startsWith("0") && Number(d.slice(0, 2)) >= 11;
}

/** Algoritmo de Luhn: pega número de cartão digitado errado antes de ir pro Asaas. */
export function isValidCardNumber(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
