import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { AuthShell, AuthField, AuthDivider, GoogleButton } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { user, signUp, signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGooglePending(true);
    try {
      await signInWithGoogle();
    } catch {
      toast.error("Não foi possível iniciar o login com Google");
      setGooglePending(false);
    }
  };

  if (user) {
    return <Redirect to="/conta" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    setPending(true);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) {
        setSentTo(email);
      } else {
        toast.success("Conta criada!", { description: "Você já está logado." });
        setLocation("/conta", { replace: true });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      toast.error(
        /registered|already/i.test(msg)
          ? "Já existe uma conta com este e-mail"
          : "Não foi possível criar a conta",
      );
    } finally {
      setPending(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        title="Confirme seu e-mail"
        footer={
          <Link href="/entrar" className="font-semibold text-[#e26f00] hover:underline">
            Ir para entrar
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e8f5ec] text-[#267b4e]">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm leading-6 text-[#4f585d]">
            Enviamos um link de confirmação para{" "}
            <strong className="text-[#111820]">{sentTo}</strong>. Confirme para
            ativar sua conta.
          </p>
        </div>
      </AuthShell>
    );
  }

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
      <GoogleButton onClick={handleGoogle} disabled={googlePending} label="Cadastrar com Google" />
      <AuthDivider>ou</AuthDivider>

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
          disabled={pending}
        >
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
