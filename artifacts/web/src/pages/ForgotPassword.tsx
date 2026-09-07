import { useState } from "react";
import { Link } from "wouter";
import { AuthShell, AuthField } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // resposta idêntica exista ou não a conta — não vaza cadastro
    } finally {
      setPending(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Verifique seu e-mail"
        footer={
          <Link href="/entrar" className="font-semibold text-[#e26f00] hover:underline">
            Voltar para entrar
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e8f5ec] text-[#267b4e]">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm leading-6 text-[#4f585d]">
            Se houver uma conta para{" "}
            <strong className="text-[#111820]">{email}</strong>, enviamos um link
            para redefinir a senha.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <Link href="/entrar" className="font-semibold text-[#e26f00] hover:underline">
          Voltar para entrar
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="E-mail">
          <Input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </AuthField>
        <Button
          type="submit"
          className="jurb-cta h-11 w-full text-sm font-bold uppercase tracking-[.1em]"
          disabled={pending}
        >
          {pending ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
    </AuthShell>
  );
}
