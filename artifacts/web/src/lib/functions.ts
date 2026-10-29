import { supabase } from "./supabase";

/** O servidor respondeu com erro (4xx/5xx). Diferente de falha de rede, onde não sabemos o que aconteceu. */
export class FunctionHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FunctionHttpError";
    this.status = status;
  }
}

/**
 * Chama uma Edge Function (POST com JSON). Em resposta de erro (não-2xx), lança com a
 * mensagem que a própria função mandou no corpo — quase sempre já em português e pronta
 * pra mostrar ao cliente — em vez do genérico "non-2xx status code".
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { method: "POST", body });
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      let message = error.message;
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error === "not_connected" ? "Bling não conectada." : String(payload.error);
      } catch {
        /* corpo ilegível: fica a mensagem genérica */
      }
      throw new FunctionHttpError(message, response.status);
    }
    // Sem resposta do servidor (rede caiu, função fora do ar): a mensagem original vem em inglês.
    throw new Error("Não consegui falar com o servidor. Confira sua conexão e tente de novo.");
  }
  return data as T;
}
