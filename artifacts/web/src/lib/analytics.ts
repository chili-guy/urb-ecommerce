// Rastreamento opcional: GA4, Google Tag Manager, Meta Pixel e conversão do
// Google Ads. Cada um só é carregado se a variável de ambiente correspondente
// existir — sem configurar nada, este módulo não injeta nenhum script nem
// dispara nenhuma rede. Preencha em artifacts/web/.env (ver .env.example) com
// os IDs reais do cliente.
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const GTM_ID = import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: {
      (...args: unknown[]): void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
  }
}

function injectScript(src: string): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initGtm(containerId: string): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${containerId}`);
}

function initGtag(primaryId: string): void {
  window.dataLayer = window.dataLayer ?? [];
  const gtag: NonNullable<Window["gtag"]> = (...args) => window.dataLayer!.push(args);
  window.gtag = gtag;
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${primaryId}`);
  gtag("js", new Date());
  if (GA4_ID) gtag("config", GA4_ID);
  if (GOOGLE_ADS_ID) gtag("config", GOOGLE_ADS_ID);
}

function initMetaPixel(pixelId: string): void {
  const fbq = ((...args: unknown[]) => {
    (fbq.queue ??= []).push(args);
  }) as NonNullable<Window["fbq"]>;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  injectScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", pixelId);
  fbq("track", "PageView");
}

let initialized = false;

/** Chame uma vez no boot do app. Idempotente; não faz nada sem env vars. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (GTM_ID) initGtm(GTM_ID);
  if (GA4_ID || GOOGLE_ADS_ID) initGtag(GA4_ID || GOOGLE_ADS_ID!);
  if (META_PIXEL_ID) initMetaPixel(META_PIXEL_ID);
}

export type AnalyticsItem = {
  id: string | number;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
};

function gtagEvent(name: string, params: Record<string, unknown>): void {
  window.gtag?.("event", name, params);
}

function fbqEvent(name: string, params: Record<string, unknown>): void {
  window.fbq?.("track", name, params);
}

export function trackViewItem(item: AnalyticsItem): void {
  gtagEvent("view_item", { currency: "BRL", value: item.price, items: [item] });
  fbqEvent("ViewContent", {
    currency: "BRL",
    value: item.price,
    content_ids: [item.id],
    content_name: item.name,
  });
}

export function trackAddToCart(item: AnalyticsItem): void {
  const value = item.price * (item.quantity ?? 1);
  gtagEvent("add_to_cart", { currency: "BRL", value, items: [item] });
  fbqEvent("AddToCart", { currency: "BRL", value, content_ids: [item.id] });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number): void {
  gtagEvent("begin_checkout", { currency: "BRL", value, items });
  fbqEvent("InitiateCheckout", { currency: "BRL", value, num_items: items.length });
}

export function trackPurchase(
  orderId: number | string,
  value: number,
  items: AnalyticsItem[],
): void {
  gtagEvent("purchase", { transaction_id: String(orderId), currency: "BRL", value, items });
  fbqEvent("Purchase", { currency: "BRL", value, content_ids: items.map((i) => i.id) });
  if (GOOGLE_ADS_ID) {
    gtagEvent("conversion", {
      send_to: GOOGLE_ADS_ID,
      transaction_id: String(orderId),
      value,
      currency: "BRL",
    });
  }
}
