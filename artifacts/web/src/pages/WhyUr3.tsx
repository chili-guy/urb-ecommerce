import { Link } from "wouter";
import {
  ArrowRight,
  Microscope,
  ShieldCheck,
  Truck,
  ClipboardCheck,
  Cpu,
  PackageCheck,
  Boxes,
  FileText,
  RotateCcw,
  Zap,
} from "lucide-react";

const PILLARS = [
  {
    n: "01",
    icon: Microscope,
    title: "Curadoria técnica",
    lead: "Só entra o que a nossa bancada aprova.",
    body: "Testamos desempenho, acabamento e procedência antes de listar qualquer produto. O que não passa no nosso teste não chega até você.",
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "Garantia UR3",
    lead: "Suporte que continua depois da compra.",
    body: "São 12 meses de garantia direto com a gente — sem empurrar você para o fabricante. Deu problema, a UR3 resolve.",
  },
  {
    n: "03",
    icon: Truck,
    title: "Postagem expressa",
    lead: "Pedidos aprovados saem no mesmo dia.",
    body: "Pagamento aprovado até as 16h em dia útil, a gente despacha no mesmo dia. O rastreio chega no seu e-mail e fica na sua conta.",
  },
];

const BENCH_STEPS = [
  { n: "01", icon: Boxes, title: "Recebimento", body: "Conferimos lacre, número de série e nota fiscal de cada lote que chega." },
  { n: "02", icon: Cpu, title: "Teste de bancada", body: "Ligamos, medimos e rodamos carga: tela, bateria, portas, térmica — tudo." },
  { n: "03", icon: ClipboardCheck, title: "Aprovação", body: "Só o que passa vira anúncio. O resto volta para o fornecedor." },
  { n: "04", icon: PackageCheck, title: "Postagem", body: "Embalado com proteção reforçada e postado no mesmo dia útil." },
];

const COMMITMENTS = [
  { icon: ShieldCheck, big: "12 meses", small: "de garantia direto com a UR3" },
  { icon: Zap, big: "Mesmo dia", small: "de postagem para pedidos aprovados até 16h" },
  { icon: RotateCcw, big: "7 dias", small: "para troca ou devolução, como manda o CDC" },
  { icon: FileText, big: "Nota fiscal", small: "em 100% dos pedidos, sempre" },
];

export default function WhyUr3() {
  return (
    <div className="bg-[#f4f1eb] text-[#111820]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-t-2 border-[#ff8a0a] bg-[#111820] text-[#f4f1eb]">
        <div className="jurb-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full bg-[#ff8a0a]/[.10] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-[1320px] px-4 py-12 sm:px-8 md:py-16 lg:px-12">
          <div className="max-w-[46ch]">
            <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-[#ffb85d]">
              <span className="h-2 w-2 bg-[#ff8a0a]" /> O padrão UR3
            </div>
            <h1 className="mt-5 text-balance font-display text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.03] tracking-[-.035em] text-[#f4f1eb]">
              Tecnologia boa é tecnologia que <span className="text-[#ff8a0a]">entrega.</span>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[#c4c8c9] sm:text-base">
              A UR3 nasceu de uma ideia simples: revender eletrônico não é empilhar caixa,
              é responder pelo que se vende. Cada item passa pela nossa bancada antes de
              entrar no catálogo — e o suporte continua depois que a nota é emitida.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="jurb-cta group inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/ofertas"
                className="inline-flex min-h-11 items-center gap-2 border border-[#f4f1eb]/25 px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#f4f1eb] transition-colors hover:border-[#ff8a0a] hover:text-[#ff8a0a]"
              >
                Oferta da semana
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8 md:py-20 lg:px-12">
        <div className="mb-8 sm:mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">Como trabalhamos</div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.04em] sm:text-3xl md:text-4xl">
            Três compromissos que não abrem exceção
          </h2>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article
              key={p.n}
              className="flex flex-col border border-[#111820]/15 bg-[#f9f7f2] p-6 transition-colors hover:border-[#ff8a0a] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#ff8a0a]">{p.n}</span>
                <p.icon className="h-6 w-6 text-[#111820]" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-[-.02em]">{p.title}</h3>
              <p className="mt-2 font-medium text-[#111820]">{p.lead}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4f585d]">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Como a bancada trabalha */}
      <section className="border-y border-[#111820]/15 bg-[#efe9df]">
        <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8 md:py-20 lg:px-12">
          <div className="mb-8 sm:mb-10">
            <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">Bancada UR3</div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.04em] sm:text-3xl md:text-4xl">
              O caminho que todo produto percorre
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm text-[#4f585d] sm:text-base">
              Nada é listado no impulso. Todo item entra por esta esteira antes de virar anúncio.
            </p>
          </div>

          <ol className="grid gap-px overflow-hidden border border-[#111820]/15 bg-[#111820]/15 sm:grid-cols-2 lg:grid-cols-4">
            {BENCH_STEPS.map((s) => (
              <li key={s.n} className="flex flex-col bg-[#f4f1eb] p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#111820] font-mono text-xs font-bold text-[#ff8a0a]">
                    {s.n}
                  </span>
                  <s.icon className="h-5 w-5 text-[#4f585d]" strokeWidth={1.7} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-[-.02em]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4f585d]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compromissos */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8 md:py-20 lg:px-12">
        <div className="mb-8 sm:mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">O que está garantido</div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.04em] sm:text-3xl md:text-4xl">
            Sem asterisco, sem letra miúda
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {COMMITMENTS.map((c) => (
            <div key={c.big} className="border border-[#111820]/15 bg-[#f9f7f2] p-5 sm:p-6">
              <c.icon className="h-6 w-6 text-[#ff8a0a]" strokeWidth={1.7} />
              <div className="mt-4 font-display text-xl font-semibold tracking-[-.02em] sm:text-2xl">{c.big}</div>
              <p className="mt-1 text-xs leading-relaxed text-[#4f585d] sm:text-sm">{c.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative isolate overflow-hidden border-t-2 border-[#ff8a0a] bg-[#111820] text-[#f4f1eb]">
        <div className="jurb-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto flex max-w-[1320px] flex-col items-start gap-6 px-4 py-14 sm:px-8 md:flex-row md:items-center md:justify-between md:py-16 lg:px-12">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Compre com quem testa antes.
            </h2>
            <p className="mt-2 max-w-[48ch] text-sm text-[#c4c8c9] sm:text-base">
              Todo o catálogo passou pela bancada. Escolha o seu e a gente posta hoje.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="jurb-cta group inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
            >
              Ver catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/ofertas"
              className="inline-flex min-h-11 items-center gap-2 border border-[#f4f1eb]/25 px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#f4f1eb] transition-colors hover:border-[#ff8a0a] hover:text-[#ff8a0a]"
            >
              Oferta da semana
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
