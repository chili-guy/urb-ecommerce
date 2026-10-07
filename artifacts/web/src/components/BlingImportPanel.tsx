import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Search } from "lucide-react";
import {
  useBlingImportCandidates,
  useCategories,
  useImportFromBling,
  type BlingCandidate,
  type BlingImportItem,
} from "@/lib/api";
import { formatCurrency, normalizeSearch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Sem preço na Bling o produto entraria na loja custando R$ 0 — por isso não dá pra importar. */
const canImport = (c: BlingCandidate) => c.price > 0;

export function BlingImportPanel() {
  const candidatesQuery = useBlingImportCandidates();
  const importer = useImportFromBling();
  const { data: knownCategories } = useCategories();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<BlingImportItem[] | null>(null);

  const data = candidatesQuery.data;
  const loading = candidatesQuery.isFetching;
  const importing = importer.isPending;

  const visible = useMemo(() => {
    const list = data?.candidates ?? [];
    const q = normalizeSearch(term);
    if (!q) return list;
    return list.filter((c) => normalizeSearch(c.name).includes(q) || normalizeSearch(c.sku).includes(q));
  }, [data, term]);

  const selectableVisible = visible.filter(canImport);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((c) => selected.has(c.id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) selectableVisible.forEach((c) => next.delete(c.id));
      else selectableVisible.forEach((c) => next.add(c.id));
      return next;
    });

  const load = async () => {
    setReport(null);
    setSelected(new Set());
    const result = await candidatesQuery.refetch();
    if (result.error) toast.error(result.error instanceof Error ? result.error.message : "Falha ao buscar na Bling");
  };

  const runImport = (ids: number[]) => {
    if (ids.length === 0 || importing) return;
    if (
      ids.length > 1 &&
      !confirm(
        `Importar ${ids.length} produto(s) da Bling para o site? Quem tiver estoque já aparece na loja assim que entrar.`,
      )
    ) {
      return;
    }
    setReport(null);
    setProgress({ done: 0, total: ids.length });
    importer.mutate(
      {
        ids,
        category: category.trim() || undefined,
        onProgress: (done, total) => setProgress({ done, total }),
      },
      {
        onSuccess: (results) => {
          setProgress(null);
          setReport(results);
          setSelected((prev) => {
            const next = new Set(prev);
            results.forEach((r) => {
              if (r.status !== "error") next.delete(r.id);
            });
            return next;
          });
          const imported = results.filter((r) => r.status === "imported").length;
          if (imported > 0) toast.success(`${imported} produto(s) importado(s)`);
          else toast.error("Nenhum produto foi importado — veja os detalhes abaixo");
        },
        onError: (err) => {
          setProgress(null);
          toast.error(err instanceof Error ? err.message : "Falha ao importar");
        },
      },
    );
  };

  const importedCount = report?.filter((r) => r.status === "imported").length ?? 0;
  const hiddenCount = report?.filter((r) => r.status === "imported" && r.hidden).length ?? 0;
  const problems = report?.filter((r) => r.status !== "imported") ?? [];

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="border-b border-border/30 pb-4">
        <CardTitle className="text-lg">Importar da Bling</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Traz pro site produtos que estão ativos na Bling e ainda não existem aqui (comparando pelo SKU). Entram como
          produto novo, com fotos copiadas, descrição e estoque da Bling. Depois é só revisar em Catálogo.
        </p>
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-end">
          <Button onClick={load} disabled={loading || importing} className="jurb-cta sm:shrink-0">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {data ? "Atualizar lista" : "Buscar produtos na Bling"}
          </Button>
          <div className="flex-1 sm:max-w-xs">
            <label className="text-xs font-semibold text-muted-foreground">Categoria no site (opcional)</label>
            <Input
              list="bling-import-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Vazio = usa a categoria da Bling"
              className="h-9 mt-1"
            />
            <datalist id="bling-import-categories">
              {(knownCategories ?? []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {candidatesQuery.isError && !loading && (
          <p className="text-sm text-destructive">
            {candidatesQuery.error instanceof Error ? candidatesQuery.error.message : "Falha ao buscar na Bling"}
          </p>
        )}

        {!data && !loading && !candidatesQuery.isError && (
          <p className="text-sm text-muted-foreground">Clique em "Buscar produtos na Bling" pra ver o que dá pra importar.</p>
        )}

        {data && (
          <>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{data.candidates.length}</strong> produto(s) novo(s) pra importar ·{" "}
              {data.alreadyOnSite} já estão no site
              {data.withoutCode > 0 && ` · ${data.withoutCode} sem código (SKU) na Bling não aparecem aqui`}
            </p>

            {data.candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada novo: tudo que está ativo e com SKU na Bling já existe no site.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou SKU..."
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {progress && (
                      <span className="text-xs text-muted-foreground">
                        Importando {progress.done} de {progress.total}...
                      </span>
                    )}
                    <Button
                      onClick={() => runImport([...selected])}
                      disabled={selected.size === 0 || importing}
                      className="jurb-cta"
                    >
                      {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Importar selecionados ({selected.size})
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os listados"
                            checked={allVisibleSelected}
                            onChange={toggleAllVisible}
                            disabled={selectableVisible.length === 0 || importing}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </th>
                        <th className="px-2 py-3">Produto</th>
                        <th className="px-4 py-3 text-right">Preço</th>
                        <th className="px-4 py-3 text-right">Estoque</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            Nenhum produto com esse termo.
                          </td>
                        </tr>
                      ) : (
                        visible.map((c) => (
                          <tr key={c.id} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Selecionar ${c.name}`}
                                checked={selected.has(c.id)}
                                onChange={() => toggle(c.id)}
                                disabled={!canImport(c) || importing}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-border/50 bg-white">
                                  {c.imageUrl && (
                                    <img src={c.imageUrl} alt="" className="h-full w-full object-contain p-0.5 mix-blend-multiply" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground line-clamp-1">{c.name}</div>
                                  <div className="font-mono text-[11px] text-muted-foreground">{c.sku}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {canImport(c) ? (
                                formatCurrency(c.price)
                              ) : (
                                <span className="inline-flex rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                  Sem preço
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {c.stock ?? "—"}
                              {c.stock === 0 && (
                                <span className="block text-[10px] text-muted-foreground">ficará oculto</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canImport(c) || importing}
                                onClick={() => runImport([c.id])}
                              >
                                Importar
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {report && (
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">
              {importedCount} importado(s)
              {problems.length > 0 && ` · ${problems.length} não importado(s)`}
            </p>
            {hiddenCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {hiddenCount} entrou(ram) com estoque 0 e fica(m) oculto(s) na loja até ter saldo.
              </p>
            )}
            {importedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Revise em <strong>Catálogo</strong>: categoria, destaque e as informações que a Bling não tem.
              </p>
            )}
            {problems.length > 0 && (
              <ul className="space-y-1 text-xs">
                {problems.map((r) => (
                  <li key={r.id} className={r.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                    <span className="font-medium">{r.name ?? r.sku ?? `#${r.id}`}</span> — {r.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
