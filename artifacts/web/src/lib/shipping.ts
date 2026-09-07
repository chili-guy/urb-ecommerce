import type { ShippingOption } from "./types";

/**
 * Cotação de frete simulada (mesma regra que rodava no servidor Express).
 * Substituir por Melhor Envio quando o cliente conectar a conta.
 */
export function getShippingOptions(
  itemCount: number,
  postalCode: string,
): ShippingOption[] {
  const regionFactor = postalCode.replace(/\D/g, "").startsWith("0") ? 1.15 : 1;
  const standard = Number(((12.9 + itemCount * 3.4) * regionFactor).toFixed(2));

  return [
    {
      id: "correios-pac",
      carrier: "Correios",
      service: "PAC",
      price: standard,
      deliveryDays: 6,
      description: "Entrega econômica com rastreio",
    },
    {
      id: "correios-sedex",
      carrier: "Correios",
      service: "SEDEX",
      price: Number((standard * 1.68).toFixed(2)),
      deliveryDays: 3,
      description: "Entrega expressa com rastreio",
    },
    {
      id: "urb-express",
      carrier: "URB Entregas",
      service: "Express",
      price: Number((standard * 2.12).toFixed(2)),
      deliveryDays: 1,
      description: "Prioridade máxima para capitais",
    },
  ];
}
