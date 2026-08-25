---
name: OpenAPI e Zod
description: Compatibilidade entre o codegen Orval e a versão de Zod instalada no workspace.
---

O codegen atual do Orval pode emitir chamadas como `z.int()`, `z.url()` e `z.email()` quando o OpenAPI usa `integer` ou formatos de string. A versão de Zod instalada no workspace não oferece essas APIs.

**Why:** A geração pode terminar com sucesso, mas o `typecheck:libs` falha logo depois, impedindo os hooks de serem usados pelo servidor e pela interface.

**How to apply:** Ao criar novos contratos, confirme primeiro a compatibilidade da versão instalada de Zod; se o workspace continuar em Zod 3, prefira `number` e strings sem `format` quando a validação mais estrita não for indispensável.