import {
  Building2,
  CarFront,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { LoginForm } from "./login-form";

export const LOGIN_PORTALS = ["admin", "parceiro", "fornecedor", "motorista"] as const;
export type LoginPortal = (typeof LOGIN_PORTALS)[number];

type PortalConfig = {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  welcome: string;
};

export const PORTAL_CONFIG: Record<LoginPortal, PortalConfig> = {
  admin: {
    label: "Administrativo",
    title: "Acesso administrativo",
    description: "Entre para gerenciar a operação.",
    icon: LayoutDashboard,
    welcome: "Bem-vindo à gestão Nativos.",
  },
  parceiro: {
    label: "Parceiros",
    title: "Portal do Parceiro",
    description: "Acompanhe solicitações e reservas.",
    icon: Building2,
    welcome: "Bem-vindo ao seu portal Nativos.",
  },
  fornecedor: {
    label: "Operação",
    title: "Acesso operacional",
    description: "Gerencie sua agenda, equipe e recursos.",
    icon: Truck,
    welcome: "Bem-vindo à sua operação Nativos.",
  },
  motorista: {
    label: "Motoristas",
    title: "Portal do Motorista",
    description: "Acesse sua agenda de serviços.",
    icon: CarFront,
    welcome: "Bem-vindo à sua jornada Nativos.",
  },
};

export function isLoginPortal(value: string | undefined): value is LoginPortal {
  return LOGIN_PORTALS.includes(value as LoginPortal);
}

export function LoginPanel({ next, portal }: { next?: string; portal: LoginPortal }) {
  const config = PORTAL_CONFIG[portal];
  const Icon = config.icon;

  return (
    <div className="page-enter w-full max-w-[390px]">
      <div className="surface-panel bg-white p-6 shadow-[0_14px_44px_rgba(23,41,35,0.08)] sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-forest">
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
            {config.label}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-forest">{config.title}</h1>
          <p className="mt-3 text-xs font-medium text-forest/70">{config.welcome}</p>
          <p className="mt-1 text-sm text-forest/52">{config.description}</p>
        </div>

        <LoginForm next={next} portal={portal} />

        <div className="mt-6 border-t border-forest/10 pt-5">
          <div className="flex items-center justify-center gap-2 text-[11px] text-forest/46">
            <ShieldCheck size={14} aria-hidden="true" />
            Ambiente seguro e protegido
          </div>
        </div>
      </div>

    </div>
  );
}
