import { useState } from "react";
import { Link, Redirect, useLocation, useSearchParams } from "wouter";
import { AuthShell, AuthField, AuthDivider, GoogleButton } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function Login() {
  const { user, signIn, signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("next") || "/conta";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

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
    return <Redirect to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
      setLocation(redirectTo, { replace: true });
    } catch {
      toast.error("E-mail ou senha inválidos");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acompanhe seus pedidos e agilize suas próximas compras."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastrar" className="font-semibold text-[#e26f00] hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} disabled={googlePending} />
      <AuthDivider>ou</AuthDivider>

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
        <AuthField label="Senha">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </AuthField>
        <div className="text-right">
          <Link
            href="/esqueci-senha"
            className="text-sm text-[#4f585d] hover:text-[#e26f00] hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Button
          type="submit"
          className="jurb-cta h-11 w-full text-sm font-bold uppercase tracking-[.1em]"
          disabled={pending}
        >
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
