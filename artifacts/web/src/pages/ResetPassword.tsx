import { useState } from "react";
import { Link, Redirect, useLocation, useSearchParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell, AuthField } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getGetCustomerSessionQueryKey,
  useResetPassword,
} from "@workspace/api-client-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const resetPassword = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!token) {
    return <Redirect to="/esqueci-senha" replace />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    resetPassword.mutate(
      { data: { token, password } },
      {
        onSuccess: (session) => {
          queryClient.setQueryData(getGetCustomerSessionQueryKey(), session);
          toast.success("Senha redefinida!", { description: "Você já está logado." });
          setLocation("/conta", { replace: true });
        },
        onError: () => {
          toast.error("Link inválido ou expirado", {
            description: "Solicite um novo link de redefinição.",
          });
        },
      },
    );
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
          disabled={resetPassword.isPending}
        >
          {resetPassword.isPending ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
