import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AuthShell, AuthField } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function ResetPassword() {
  const { user, isLoading, updatePassword } = useAuth();
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  // O link do e-mail estabelece uma sessão de recuperação (detectSessionInUrl).
  if (!isLoading && !user) {
    return (
      <AuthShell
        title="Link inválido ou expirado"
        footer={
          <Link href="/esqueci-senha" className="font-semibold text-[#e26f00] hover:underline">
            Pedir um novo link
          </Link>
        }
      >
        <p className="text-sm leading-6 text-[#4f585d]">
          Abra esta página pelo link que enviamos por e-mail. Se já passou de
          uma hora, solicite um novo.
        </p>
      </AuthShell>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setPending(true);
    try {
      await updatePassword(password);
      toast.success("Senha redefinida!", { description: "Você já está logado." });
      setLocation("/conta", { replace: true });
    } catch {
      toast.error("Não foi possível redefinir a senha", {
        description: "O link pode ter expirado. Solicite um novo.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle="Escolha uma senha nova para a sua conta."
      footer={
        <Link href="/entrar" className="font-semibold text-[#e26f00] hover:underline">
          Voltar para entrar
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nova senha">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ao menos 8 caracteres"
          />
        </AuthField>
        <AuthField label="Confirmar senha">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
          />
        </AuthField>
        <Button
          type="submit"
          className="jurb-cta h-11 w-full text-sm font-bold uppercase tracking-[.1em]"
          disabled={pending}
        >
          {pending ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
