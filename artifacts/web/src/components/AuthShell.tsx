import type { ReactNode } from "react";
import { Link } from "wouter";

/**
 * Moldura das telas de conta do cliente (entrar, cadastrar, recuperar senha).
 * Segue a identidade da loja: fundo creme, cartão claro, acento laranja.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[440px] flex-col justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center justify-center"
        aria-label="UR3 — início"
      >
        <img
          src="/images/jurb-logo-mark.png"
          alt="UR3"
          className="h-12 w-12 object-contain"
        />
      </Link>

      <div className="rounded-xl border border-[#e4dfd7] bg-white p-6 shadow-[0_10px_34px_rgba(17,24,32,0.08)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold tracking-[-.02em] text-[#111820]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm leading-6 text-[#4f585d]">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>

      {footer ? (
        <div className="mt-6 text-center text-sm text-[#4f585d]">{footer}</div>
      ) : null}
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#111820]">{label}</span>
      {children}
    </label>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-[#8a8a8a]">
      <span className="h-px flex-1 bg-[#e4dfd7]" />
      {children}
      <span className="h-px flex-1 bg-[#e4dfd7]" />
    </div>
  );
}

export function GoogleButton({
  onClick,
  disabled,
  label = "Continuar com Google",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#d5cfc4] bg-white text-sm font-semibold text-[#111820] transition-colors hover:bg-[#f7f4ee] disabled:opacity-60"
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {label}
    </button>
  );
}
