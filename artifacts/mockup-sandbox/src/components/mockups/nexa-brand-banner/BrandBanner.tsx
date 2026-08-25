import { ArrowRight, Check, ChevronRight, ShieldCheck, Truck, Zap } from "lucide-react";
import "./_group.css";

const benefits = [
  { icon: Zap, label: "Curadoria técnica", text: "Só entra o que a nossa bancada aprova." },
  { icon: ShieldCheck, label: "Garantia JURB", text: "Suporte que continua depois da compra." },
  { icon: Truck, label: "Postagem expressa", text: "Pedidos aprovados saem no mesmo dia." },
];

export function BrandBanner() {
  return (
    <main className="nexa-banner min-h-screen overflow-hidden bg-[#111820] text-[#f4f1eb]">
      <section className="relative isolate min-h-screen">
        <div className="nexa-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-40 top-0 h-[620px] w-[620px] rounded-full bg-[#ff8a0a]/[.08] blur-3xl" />
        <header className="relative z-10 mx-auto flex max-w-[1320px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
           <img className="h-auto w-[150px] sm:w-[184px]" src="/__mockup/images/nexa-logo-full.png" alt="JURB Comércio de Eletrônicos" />
          <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] md:flex" aria-label="Navegação principal">
            <a className="nexa-link transition-colors hover:text-[#ff8a0a]" href="#destaques">Destaques</a>
             <a className="nexa-link transition-colors hover:text-[#ff8a0a]" href="#por-que-jurb">Por que JURB</a>
            <a className="nexa-link transition-colors hover:text-[#ff8a0a]" href="#oferta">Oferta da semana</a>
          </nav>
          <a className="nexa-link flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffb85d]" href="#destaques">
            Ver catálogo <ChevronRight className="h-4 w-4" />
          </a>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 md:pb-24 md:pt-20 lg:grid-cols-[.88fr_1.12fr] lg:gap-16 lg:px-12 lg:pt-24">
          <div className="max-w-[620px]">
            <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.24em] text-[#ffb85d]">
               <span className="h-px w-9 bg-[#ff8a0a]" /> Seleção especial
            </div>
            <h1 className="nexa-display max-w-[650px] text-[clamp(3.2rem,7.5vw,7.7rem)] font-semibold leading-[.88] tracking-[-.065em] text-[#f4f1eb]">
              O futuro<br /><span className="text-[#ff8a0a]">na sua mesa.</span>
            </h1>
            <p className="mt-8 max-w-[510px] text-base leading-7 text-[#c4c8c9] sm:text-lg">
              Equipamentos de alta performance, escolhidos por quem entende de tecnologia — para o seu trabalho, seu jogo e tudo que vem depois.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a className="nexa-cta group inline-flex min-h-14 items-center justify-center gap-4 bg-[#ff8a0a] px-7 text-sm font-bold uppercase tracking-[.12em] text-[#111820]" href="#destaques">
                Explorar catálogo <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
              <a className="nexa-cta inline-flex min-h-14 items-center justify-center border border-[#f4f1eb]/30 px-7 text-sm font-bold uppercase tracking-[.12em] text-[#f4f1eb] hover:border-[#ff8a0a] hover:bg-[#ff8a0a] hover:text-[#111820]" href="#oferta">
                Ver notebooks
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#92999d]">
              <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#ff8a0a]" /> 12x sem juros</span>
               <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#ff8a0a]" /> Garantia JURB</span>
              <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#ff8a0a]" /> Envio rastreado</span>
            </div>
          </div>

          <div id="oferta" className="relative min-h-[430px] overflow-hidden border border-[#f4f1eb]/15 bg-[#07101a] sm:min-h-[560px] lg:min-h-[630px]">
            <img className="nexa-product absolute inset-0 h-full w-full object-cover object-center opacity-90" src="/__mockup/images/hero-nexa.jpg" alt="Notebook e acessórios em um setup de alta performance" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07101a] via-[#07101a]/10 to-transparent" />
            <div className="nexa-scanline pointer-events-none absolute inset-0 opacity-50" />
            <div className="absolute left-5 top-5 border border-[#ff8a0a]/70 bg-[#111820]/80 px-3 py-2 backdrop-blur-sm sm:left-7 sm:top-7">
               <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ffb85d]">JURB / LAB 04</div>
              <div className="mt-1 text-xs font-bold text-[#f4f1eb]">Performance sem ruído</div>
            </div>
            <div className="absolute bottom-5 right-5 max-w-[190px] border-l-2 border-[#ff8a0a] bg-[#111820]/85 p-4 backdrop-blur-sm sm:bottom-7 sm:right-7">
              <div className="text-[10px] uppercase tracking-[.16em] text-[#92999d]">Setup da semana</div>
              <div className="nexa-display mt-1 text-2xl font-semibold leading-none text-[#f4f1eb]">Potência<br />bem escolhida.</div>
            </div>
          </div>
        </div>
      </section>

       <section id="por-que-jurb" className="relative border-t border-[#f4f1eb]/15 bg-[#f4f1eb] text-[#111820]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:items-center md:py-16 lg:px-12">
          <div>
             <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">O padrão JURB</div>
            <h2 className="nexa-display mt-3 max-w-[360px] text-3xl font-semibold leading-[.95] tracking-[-.04em] sm:text-4xl">Tecnologia boa é tecnologia que entrega.</h2>
          </div>
          <div id="destaques" className="grid gap-7 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, label, text }) => (
              <article key={label} className="border-t-2 border-[#111820] pt-4">
                <Icon className="mb-5 h-5 w-5 text-[#e26f00]" aria-hidden="true" />
                <h3 className="text-sm font-bold">{label}</h3>
                <p className="mt-2 text-sm leading-5 text-[#4f585d]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}