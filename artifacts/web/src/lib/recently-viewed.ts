// Histórico local de produtos vistos — só no navegador do cliente, sem
// mandar nada pro banco. Usado na home pra mostrar "Vistos recentemente".
const KEY = "ur3:recently-viewed";
const MAX = 10;

export function recordProductView(id: number): void {
  try {
    const ids = readIds();
    const next = [id, ...ids.filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* modo privado / storage bloqueado — recurso não-crítico */
  }
}

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function getRecentlyViewed(excludeId?: number): number[] {
  const ids = readIds();
  return excludeId ? ids.filter((x) => x !== excludeId) : ids;
}
