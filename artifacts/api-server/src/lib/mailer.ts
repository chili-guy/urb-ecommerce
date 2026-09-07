import { logger } from "./logger";

/**
 * Envio de e-mail transacional.
 *
 * Ainda não há provedor SMTP conectado — enquanto isso, o e-mail é apenas
 * registrado no log do servidor (o link de redefinição aparece no console).
 * Para produção, plugar aqui um transporte real (Resend, SES, SMTP…) lendo
 * as credenciais do ambiente.
 */
export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  logger.info(
    { to: email.to, subject: email.subject, body: email.text },
    "[mailer] e-mail simulado (nenhum provedor SMTP conectado)",
  );
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}
