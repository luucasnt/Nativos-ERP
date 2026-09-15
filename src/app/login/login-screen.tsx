import { BadgeCheck, CalendarDays, Headphones, Route, ShieldCheck, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { LoginPanel, PORTAL_CONFIG, type LoginPortal } from "./login-panel";

const LEFT_CONTENT: Record<
  LoginPortal,
  {
    headline: string;
    description: string;
    features: Array<{ icon: typeof Route; label: string }>;
  }
> = {
  admin: {
    headline: "Controle a operação sem ruído.",
    description: "Decisões rápidas, processos claros e toda a gestão em um só lugar.",
    features: [
      { icon: Route, label: "Operação do dia em tempo real" },
      { icon: BadgeCheck, label: "Pendências e aprovações direcionadas" },
      { icon: ShieldCheck, label: "Acesso seguro por perfil" },
    ],
  },
  parceiro: {
    headline: "Reservas e solicitações em um só lugar.",
    description: "Acompanhe cada etapa com clareza e mantenha sua operação conectada.",
    features: [
      { icon: CalendarDays, label: "Reservas e serviços organizados" },
      { icon: BadgeCheck, label: "Status e confirmações visíveis" },
      { icon: Users, label: "Comunicação direta com a Nativos" },
    ],
  },
  fornecedor: {
    headline: "Operação organizada. Respostas mais rápidas.",
    description: "Confirme serviços, organize recursos e acompanhe sua equipe sem perder tempo.",
    features: [
      { icon: Route, label: "Serviços disponíveis e confirmados" },
      { icon: Users, label: "Equipe e veículos em um só lugar" },
      { icon: BadgeCheck, label: "Ações operacionais objetivas" },
    ],
  },
  motorista: {
    headline: "Sua operação, sempre à mão.",
    description: "Agenda, rotas, documentos e ações essenciais pensados para o celular.",
    features: [
      { icon: CalendarDays, label: "Agenda diária objetiva" },
      { icon: Route, label: "Informações completas do serviço" },
      { icon: Headphones, label: "Contato rápido com a operação" },
    ],
  },
};

export function LoginScreen({
  portal,
  next,
}: {
  portal: LoginPortal;
  next?: string;
}) {
  const content = LEFT_CONTENT[portal];

  return (
    <main className="grid min-h-screen flex-1 bg-[#f8f7f3] lg:grid-cols-[38%_62%]">
      <section className="relative hidden overflow-hidden bg-forest px-10 py-12 text-cream lg:flex lg:flex-col xl:px-16 xl:py-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.035]" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full border border-gold/[0.07]" aria-hidden="true" />

        <Wordmark size={31} tone="cream-on-forest" priority />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.17em] text-cream/55">
          {PORTAL_CONFIG[portal].label}
        </p>

        <div className="relative my-auto max-w-[390px]">
          <span className="block h-px w-10 bg-gold" aria-hidden="true" />
          <h2 className="mt-8 text-[34px] font-medium leading-[1.14] tracking-[-0.035em] text-white xl:text-[40px]">
            {content.headline}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-cream/57">{content.description}</p>

          <ul className="mt-9 grid gap-5">
            {content.features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-cream/72">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gold">
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-[11px] text-cream/48">
          <span>Nativos Experiences</span>
          <span aria-hidden="true">•</span>
          <span>Trancoso, Bahia</span>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="relative min-h-[172px] overflow-hidden bg-forest px-5 pb-12 pt-[max(22px,env(safe-area-inset-top))] text-cream lg:hidden">
          <div className="absolute -right-14 -top-20 h-48 w-48 rounded-full border border-white/[0.06]" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-16 h-44 w-44 rounded-full border border-gold/[0.12]" aria-hidden="true" />
          <div className="relative mx-auto max-w-[390px]">
            <div className="flex items-center justify-between gap-4">
              <Wordmark size={25} tone="cream-on-forest" priority />
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/70">
                {PORTAL_CONFIG[portal].label}
              </span>
            </div>
            <h2 className="mt-7 max-w-[300px] text-xl font-semibold leading-tight tracking-[-0.025em] text-white">
              {content.headline}
            </h2>
          </div>
        </div>
        <div className="relative z-10 -mt-8 flex flex-1 items-start justify-center px-3 pb-8 sm:px-8 lg:mt-0 lg:items-center lg:py-14">
          <LoginPanel next={next} portal={portal} />
        </div>
        <footer className="px-5 py-5 text-center text-[11px] text-forest/35">
          Nativos ERP · Acesso restrito a usuários autorizados
        </footer>
      </section>
    </main>
  );
}
