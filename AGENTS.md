# Agentes 1Música

## Convenções
- Backend em `server.ts` (Express + Vite dev middleware). Frontend em `src/`.
- Tipos compartilhados em `src/types.ts`.
- Custos de IA são registrados via `logCost()` em `server.ts`.
- Rotas de admin usam `x-admin-key` ou `session_token` de usuário admin.

## Auth model
O projeto usa um sistema de auth customizado, **não** o `auth.users` do Supabase.

- **Tabela `users`**: armazena `email`, `session_token`, `referral_code`, `free_songs_balance`, `status`, etc.
- **Login**: email + OTP de 6 dígitos enviado por e-mail (Brevo). O OTP expira em 10 minutos.
- **Session token**: `crypto.randomUUID()` gerado a cada verify bem-sucedido. Rotacionado a cada login.
- **Logout**: `/api/logout` anula o `session_token` (`update({ session_token: null })`).
- **Por que não `auth.users`**: login por magic-link/OTP sem dependência de Supabase Auth; controle total sobre `session_token` e dados do usuário no schema custom.

## Custo por música
- Alvo: Lyria ~R$ 0,20/música. Preço de venda MVP: R$ 1,00.
- Instrumentação: `logCost` em `/api/chat`, `/api/speech-to-text`, `/api/orders/:id/compose-lyrics`, `/api/orders/:id/generate`, `/api/orders/:id/revise`.
- Dashboard: `/admin/custos` (AdminCosts.tsx) com filtros e breakdown por etapa.
