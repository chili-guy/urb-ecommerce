// Validações e máscaras de CPF/CNPJ, telefone e cartão. A conferência de verdade é feita de novo
// no servidor (supabase/functions/_shared/br-docs.ts, mesmas regras) — aqui é só pra avisar na hora.

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

const allSameDigit = (d: string) => /^(\d)\1+$/.test(d);

export function isValidCpf(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 11 || allSameDigit(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(d[len])) return false;
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

export function isValidPhone(raw: string): boolean {
  const d = onlyDigits(raw);
  return (d.length === 10 || d.length === 11) && !d.startsWith("0") && Number(d.slice(0, 2)) >= 11;
}

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

/** Máscara enquanto digita: CPF (000.000.000-00) até 11 dígitos, CNPJ (00.000.000/0000-00) depois. */
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** (11) 99999-8888 ou (11) 3333-4444. */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 4111 1111 1111 1111 */
export function formatCardNumber(value: string): string {
  return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "0530" -> "05/30" */
export function formatCardExpiry(value: string): string {
  const d = onlyDigits(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
