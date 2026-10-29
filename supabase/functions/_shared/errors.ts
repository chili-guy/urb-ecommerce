/** Erro que pode ser mostrado ao cliente como está (já em português, sem detalhe técnico). */
export class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserError";
    this.status = status;
  }
}

/** Falha de configuração/integração: vai pro log, e o cliente vê só uma mensagem genérica. */
export class IntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationError";
  }
}
