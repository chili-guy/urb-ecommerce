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
        aria-label="URB — início"
      >
        <img
          src="/images/jurb-logo-mark.png"
          alt="URB"
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
