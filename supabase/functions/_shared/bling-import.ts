// Converte um produto da Bling (API v3) numa linha da tabela `products` do site.
// Módulo puro — sem rede nem banco — pra dar pra testar sem subir nada.
// Campos conferidos em developer.bling.com.br (GET /produtos e /produtos/{id}).

export type BlingListItem = {
  id: number;
  nome?: string;
  codigo?: string | null;
  preco?: number;
  tipo?: string; // S serviço | P produto | N
  situacao?: string; // A ativo | I inativo
  formato?: string; // S simples | V com variações | E composição
  imagemURL?: string | null;
  estoque?: { saldoVirtualTotal?: number } | null;
};

type BlingImage = string | { link?: string; url?: string };

export type BlingDetail = BlingListItem & {
  descricaoCurta?: string | null;
  descricaoComplementar?: string | null;
  condicao?: number; // 0 não especificado | 1 novo | 2 usado
  marca?: string | null;
  categoria?: { id?: number } | null;
  midia?: {
    video?: { url?: string | null } | null;
    imagens?: {
      imagensURL?: BlingImage[];
      externas?: BlingImage[];
      internas?: BlingImage[];
    } | null;
  } | null;
};

export type ProductInsert = {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  images: string[];
  sku: string;
  condition: "novo" | "usado";
  video_url: string | null;
  specs: { label: string; value: string }[];
  featured: false;
};

export const NO_PHOTO_URL = "https://placehold.co/800x800/e2e8f0/1e293b?text=Sem+foto";
export const MAX_IMAGES = 4;

/** Produto vendável que dá pra importar: ativo, não é serviço, não é "pai" de variações e tem código (SKU). */
export function isImportable(p: BlingListItem): boolean {
  if (!p.codigo || !p.codigo.trim()) return false;
  if (p.tipo === "S") return false;
  if (p.formato === "V") return false;
  if (p.situacao && p.situacao !== "A") return false;
  return true;
}

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Foto principal da Bling primeiro, depois as da galeria, sem repetir. */
export function collectImageUrls(detail: BlingDetail): string[] {
  const urls: string[] = [];
  const push = (v: unknown) => {
    const link =
      typeof v === "string" ? v : (v as { link?: string; url?: string } | null)?.link ?? (v as { url?: string } | null)?.url;
    if (typeof link === "string" && /^https?:\/\//i.test(link.trim())) urls.push(link.trim());
  };
  push(detail.imagemURL);
  const imgs = detail.midia?.imagens;
  for (const list of [imgs?.internas, imgs?.externas, imgs?.imagensURL]) {
    if (Array.isArray(list)) list.forEach(push);
  }
  return [...new Set(urls)];
}

export function mapCondition(condicao: number | undefined): "novo" | "usado" {
  return condicao === 2 ? "usado" : "novo";
}

/**
 * `hostedImages` são as fotos já copiadas pro nosso storage (ou o link original
 * se a cópia falhar), na mesma ordem de `collectImageUrls`.
 */
export function buildProductRow(
  detail: BlingDetail,
  opts: { category: string; hostedImages: string[] },
): ProductInsert {
  const name = (detail.nome ?? "").trim();
  const description =
    htmlToText(detail.descricaoComplementar) || htmlToText(detail.descricaoCurta) || name;
  const stockRaw = detail.estoque?.saldoVirtualTotal;
  const stock = typeof stockRaw === "number" && Number.isFinite(stockRaw) ? Math.max(0, Math.floor(stockRaw)) : 0;
  const [main, ...gallery] = opts.hostedImages;
  const brand = detail.marca?.trim();

  return {
    name,
    description,
    category: opts.category,
    price: Math.round((detail.preco ?? 0) * 100) / 100,
    stock,
    image_url: main ?? NO_PHOTO_URL,
    images: gallery,
    sku: (detail.codigo ?? "").trim(),
    condition: mapCondition(detail.condicao),
    video_url: detail.midia?.video?.url?.trim() || null,
    specs: brand ? [{ label: "Marca", value: brand }] : [],
    featured: false,
  };
}
