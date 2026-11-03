// Regras de frete grátis (cortesia) definidas no painel, em "Frete". Quem aplica é o servidor
// (supabase/functions/_shared/shipping-rules.ts); aqui ficam só os tipos, a lista de estados
// e o texto que descreve cada regra para o administrador.

import { formatCurrency } from "./utils";
import { formatCep } from "./cep";

export type ShippingRuleArea = "all" | "states" | "cities" | "cep_range";
export type ShippingRuleScope = "cheapest" | "all";

export type ShippingRule = {
  id: number;
  name: string;
  active: boolean;
  areaType: ShippingRuleArea;
  states: string[];
  cities: string[];
  cepFrom: string | null;
  cepTo: string | null;
  /** Soma dos produtos (sem frete, antes de cupom). null = sem mínimo. */
  minOrderValue: number | null;
  scope: ShippingRuleScope;
};

export type ShippingRuleInput = Omit<ShippingRule, "id">;

export const BR_STATES: { uf: string; name: string }[] = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

export const BR_REGIONS: { label: string; ufs: string[] }[] = [
  { label: "Sul", ufs: ["PR", "SC", "RS"] },
  { label: "Sudeste", ufs: ["SP", "RJ", "MG", "ES"] },
  { label: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"] },
  { label: "Nordeste", ufs: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"] },
  { label: "Norte", ufs: ["AM", "PA", "AC", "RO", "RR", "AP", "TO"] },
];

/** Uma frase que o administrador entende: onde vale, a partir de quanto e o que fica grátis. */
export function describeRule(r: Pick<ShippingRule, "areaType" | "states" | "cities" | "cepFrom" | "cepTo" | "minOrderValue" | "scope">): string {
  let where: string;
  switch (r.areaType) {
    case "all":
      where = "todo o Brasil";
      break;
    case "states":
      where = r.states.length > 0 ? `estados ${r.states.join(", ")}` : "(escolha os estados)";
      break;
    case "cities": {
      const list = r.cities.slice(0, 3).join(", ");
      const more = r.cities.length > 3 ? ` e mais ${r.cities.length - 3}` : "";
      where = r.cities.length > 0 ? `${list}${more} (${r.states[0] ?? "?"})` : "(informe as cidades)";
      break;
    }
    case "cep_range":
      where = r.cepFrom && r.cepTo ? `CEPs de ${formatCep(r.cepFrom)} a ${formatCep(r.cepTo)}` : "(informe a faixa de CEP)";
      break;
  }
  const min = r.minOrderValue ? `pedidos a partir de ${formatCurrency(r.minOrderValue)}` : "qualquer valor de pedido";
  const which = r.scope === "all" ? "todas as opções de entrega ficam grátis" : "só a opção mais barata fica grátis";
  return `${where} · ${min} · ${which}`;
}
