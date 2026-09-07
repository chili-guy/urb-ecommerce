import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { AuthShell, AuthField } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function Register() {
  const { customer, register } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (customer) {
    return <Redirect to="/conta" replace />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    register.mutate(
      { data: { name, email, password } },
      {
        onSuccess: () => {
          toast.success("Conta criada!", { description: "Você já está logado." });
          setLocation("/conta", { replace: true });
        },
        onError: (error) => {
          const status = (error as { status?: number })?.status;
          toast.error(
            status === 409
              ? "Já existe uma conta com este e-mail"
              : "Não foi possível criar a conta",
          );
        },
      },
    );
  };

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="É rápido — depois é só o e-mail e a senha nas próximas compras."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-[#e26f00] hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nome completo">
          <Input
            required
            minLength={2}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </AuthField>
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
        <AuthField label="Senha">
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
        <Button
          type="submit"
          className="jurb-cta h-11 w-full text-sm font-bold uppercase tracking-[.1em]"
          disabled={register.isPending}
        >
          {register.isPending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
