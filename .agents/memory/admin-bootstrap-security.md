---
name: Inicialização segura do painel
description: Regra para configurar o primeiro administrador sem expor credenciais reutilizáveis.
---

O painel administrativo não pode criar contas padrão, exibir senhas de demonstração nem permitir registro aberto. O primeiro administrador exige uma chave de inicialização mantida nos segredos do ambiente, e essa etapa é permanentemente encerrada após a primeira configuração.

**Why:** Credenciais conhecidas em uma instalação nova concedem controle total a qualquer visitante e anulam a proteção por papéis.

**How to apply:** Em mudanças de autenticação, preserve o bootstrap de uso único, o cookie de sessão HttpOnly e a limitação de tentativas. Para recuperação de acesso, use fluxos autenticados de convite ou redefinição, não recrie administradores automaticamente.