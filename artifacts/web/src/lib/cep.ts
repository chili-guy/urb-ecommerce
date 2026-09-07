export type CepAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
};

/** Só os dígitos, no máximo 8. */
export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** "01001000" -> "01001-000" */
export function formatCep(value: string): string {
  const d = normalizeCep(value);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Consulta o ViaCEP (API pública, sem chave). Devolve null se o CEP não
 * existir ou a rede falhar — o chamador segue com preenchimento manual.
 */
export async function lookupCep(rawCep: string): Promise<CepAddress | null> {
  const cep = normalizeCep(rawCep);
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
