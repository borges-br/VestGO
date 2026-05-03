# VestGO — Contexto para outras IAs

Documento curto e direto para servir de briefing inicial a qualquer IA (ChatGPT, Claude, Gemini, Codex, etc.) que vá trabalhar neste repositório sem conhecimento prévio. Reflete o estado real do código no commit corrente — não promete o que ainda não existe.

---

## 1. Resumo

VestGO é uma plataforma full-stack de doação solidária que liga doadores, pontos de coleta e ONGs parceiras. Cada doação tem uma trilha digital com status, parceria operacional e (quando aplicável) lote de retirada.

## 2. Objetivo

Organizar o ciclo de doação de roupas, calçados e acessórios em um fluxo digital simples, com rastreio para o doador, fila operacional para o ponto de coleta e operação posterior pela ONG parceira.

## 3. Público-alvo

- Doadores (`DONOR`)
- Pontos de coleta (`COLLECTION_POINT`)
- ONGs parceiras (`NGO`)
- Administradores (`ADMIN`)

## 4. Problema que resolve

Doações soltas, sem rastreabilidade, com pontos de coleta sem visibilidade e ONGs recebendo material sem trilha. O VestGO formaliza parcerias, padroniza estados e dá retorno ao doador.

## 5. Estado atual

- **Funcional**: autenticação, 2FA TOTP, sessões ativas, verificação de e-mail, encerramento de conta com anonimização, perfil operacional, mapa público, doação, parceria, retirada, lotes operacionais, notificações in-app, uploads em MinIO, validação de CPF/telefone, banner de consentimento de cookies.
- **Parcial**: redefinição de senha — UI e cliente HTTP existem (`/esqueci-senha`, `/redefinir-senha`), mas as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram implementadas no backend.
- **Planejado**: WebSocket, push, e-mail transacional para todos os eventos, gamificação completa, testes automatizados, dashboards de impacto.

## 6. Stack técnica

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, next-auth v5 beta, react-query, framer-motion, three.js, Leaflet, @zxing/browser, lucide-react. Componentes auxiliares: `account-session-guard`, `cookie-consent-banner`, e libs `cpf`, `phone`, `brazil-locations`, `cookie-consent`.
- **Backend**: Fastify ^4 + TypeScript, Prisma ^5, @fastify/cors, @fastify/jwt, bcrypt, otplib, nodemailer, zod, dotenv. Shared: `geocoding`, `notifications`, `email`, `email-templates`, `operational-emails`, `rate-limit`, `user-tokens`, `cpf`, `phone`, `brazil-locations`.
- **Banco**: PostgreSQL (`postgis/postgis:16-3.4-alpine`).
- **Cache / sessão**: Redis 7.
- **Storage**: MinIO (S3 compatível).
- **Infra**: Docker + Docker Compose. Imagens publicadas em GHCR. Deploy disparado via webhook do Portainer atrás de Nginx Proxy Manager.
- **Geocoding**: Mapbox (padrão) ou Nominatim, configurável.

## 7. Estrutura do repositório

```text
VestGO/
├─ api/        # Fastify + Prisma (modules, plugins, shared, prisma/)
├─ web/        # Next.js 14 (app/(public), app/(app), components, lib, hooks)
├─ infra/postgres/init.sql
├─ docs/PRODUCTION.md
├─ docker-compose.yml | .dev.yml | .prod.yml
├─ .github/workflows/deploy.yml
├─ .env.example
├─ README.md
├─ ARCHITECTURE.md
└─ CONTEXT.md
```

## 8. Domínios principais

- **Usuários e papéis** (`User`, enum `UserRole`): `DONOR`, `COLLECTION_POINT`, `NGO`, `ADMIN`. Cadastro público bloqueia `ADMIN`. Bootstrap admin via env (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).
- **Autenticação**: bcrypt + JWT (access curto + refresh) + sessões `UserSession` revogáveis. Auth.js no frontend mantém a sessão e faz refresh.
- **2FA TOTP**: `UserTwoFactor` + `UserTwoFactorRecoveryCode`. Setup via `/auth/2fa/setup` → `/2fa/confirm`.
- **Perfis operacionais**: estados `DRAFT` / `PENDING` / `ACTIVE` / `VERIFIED`. Endereço estruturado no próprio `User`. Revisões pendentes (`pendingPublicRevision`) para alterações públicas críticas.
- **Doações**: `Donation` + `DonationItem` + `DonationEvent` (timeline). Apenas `DONOR` cria. Apenas `COLLECTION_POINT` com parceria `ACTIVE` é destino válido.
- **Parcerias** (`OperationalPartnership`): ponto ↔ ONG com `PENDING` / `ACTIVE` / `REJECTED`.
- **Retiradas** (`PickupRequest`): ONG solicita ao ponto com data e janela de horário; `PENDING` / `APPROVED` / `REJECTED`.
- **Lotes operacionais** (`OperationalBatch` + `OperationalBatchItem`): ciclo `OPEN` → `READY_TO_SHIP` → `IN_TRANSIT` → `DELIVERED` → `CLOSED` (com `CANCELLED` opcional).
- **Notificações** (`Notification`): in-app, sem WebSocket. Tipos: `DONATION_STATUS`, `DONATION_POINTS`, `BADGE_EARNED`, `DONATION_CREATED_FOR_POINT`, `PARTNERSHIP_REQUEST_RECEIVED`, `PARTNERSHIP_STATUS_CHANGED`, `PICKUP_REQUEST_CREATED`, `PICKUP_REQUEST_RECEIVED`, `PICKUP_REQUEST_STATUS_CHANGED`, `PROFILE_APPROVAL_REQUIRED`, `PROFILE_REVISION_PENDING`.
- **Uploads**: `POST /uploads` com whitelist de MIME e checagem de magic bytes; arquivos vão para o bucket MinIO `MINIO_BUCKET`.
- **Governança admin**: `/admin/profiles` para aprovação inicial e revisão de mudanças públicas.
- **Geocoding e endereço**: provider configurável (`GEOCODING_PROVIDER`); autocomplete servido pelo backend (`GET /addresses/suggestions`).

## 9. Comunicação frontend ↔ backend

- No navegador, o frontend chama `/api/backend/...` (Next route handler em `web/app/api/backend/[...path]/route.ts`) que faz proxy para a API.
- No SSR, o frontend usa `INTERNAL_API_URL` direto.
- Auth.js armazena `accessToken`, `refreshToken` e expiração na sessão JWT do navegador.

## 10. O que já está implementado

- Cadastro/login/refresh/logout, 2FA TOTP, gerenciamento de sessões ativas.
- Verificação de e-mail (`/auth/request-email-verification`, `/auth/verify-email`).
- Encerramento de conta com anonimização (`/auth/account-deletion/request`, `/auth/account-deletion/confirm`, alias `request-account-deletion`).
- Validação de CPF e telefone (`api/src/shared/cpf.ts`, `phone.ts`; espelho em `web/lib/`).
- Banner de consentimento de cookies (`cookie-consent-banner.tsx`).
- Perfis operacionais com checklist, revisão pendente e governança admin.
- Wizard de doação (somente `DONOR`) com integração ao mapa.
- Mapa público com Leaflet, geolocalização e fallback para Sorocaba.
- Parceria, retirada e lotes operacionais com transições explícitas.
- Notificações in-app persistidas com refetch + polling.
- Uploads para MinIO de avatar, capa e galeria.
- Pipeline CI/CD em GitHub Actions publicando em GHCR e disparando Portainer.

## 11. O que está parcial

- Redefinição de senha: telas (`/esqueci-senha`, `/redefinir-senha`), cliente HTTP em `web/lib/api.ts` e template `passwordResetTemplate` existem; as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram criadas no backend, então as chamadas retornam 404.
- Gamificação: estrutura no frontend e tipos de notificação, mas regras de badges/pontos no backend ainda mínimas.
- E-mails operacionais: hoje só "doação registrada" e "mudança de status".

## 12. O que está pendente

- Implementar `POST /auth/request-password-reset` e `POST /auth/reset-password` em `api/src/modules/auth/auth.ts`.
- Política oficial de backup do Postgres e do MinIO (não documentada no repo).
- Testes automatizados (sem framework configurado).
- WebSocket / push notifications.
- Dashboards de impacto e métricas.

## 13. Decisões técnicas refletidas no código

- Migrations Prisma como fonte de verdade. `prisma migrate deploy` roda no startup do container `vestgo-api`.
- Endereço estruturado armazenado no próprio `User`, não em tabela separada.
- Tokens de refresh guardados como hash sha256 em `UserSession`.
- 2FA com segredo TOTP criptografado por `TWO_FACTOR_ENCRYPTION_KEY` (AES).
- Rate limit de login por IP e por e-mail via Redis.
- CORS por allowlist (`CORS_ORIGIN`).
- Proxy `/api/backend` no frontend para evitar configurar CORS em todos os endpoints.
- Bootstrap admin idempotente, ativo apenas se as envs estiverem definidas.

---

## Regras para futuras IAs

Antes de propor qualquer mudança, leia as regras abaixo. Elas existem para evitar drift entre documentação e código.

1. **Não invente funcionalidades.** Se não está no código, não está pronto.
2. **Verifique o código antes de responder.** `grep` em `api/src/modules` para rotas reais e `web/app` para telas reais.
3. **Mantenha a documentação fiel ao backend.** Se uma tela existe e chama um endpoint, valide se a rota realmente existe em `api/src/modules/...` antes de marcar a feature como implementada.
4. **Respeite o escopo acadêmico.** O projeto é incremental e não precisa parecer pronto para produção em larga escala. Não infle o status.
5. **Separe explicitamente "existe" de "sugestão futura".** Use as classificações: implementado, parcial, em desenvolvimento, planejado, pendente de integração, requer decisão técnica, não confirmado no código.
6. **Não altere a arquitetura sem justificativa técnica clara.** Se uma decisão arquitetural existe (ex.: migrations como fonte de verdade, proxy frontend → backend), preserve-a salvo se houver problema concreto.
7. **Não crie dados fictícios no README.** Sem métricas inventadas, badges falsos, número de usuários, parceiros nominais, prêmios.
8. **Não documente endpoints inexistentes.** Confira `grep -nE "fastify\.(get|post|patch|put|delete)" api/src` antes de listar.
9. **Não assuma que algo está pronto só porque há tela no frontend.** Tela sem rota correspondente é parcial.
10. **Confira se a tela está realmente conectada ao backend** (chamada a `apiFetch`/`fetch` de fato em uso).
11. **Não exponha segredos.** `.env` não é commitado. Os exemplos em `.env.example` são placeholders.
12. **Não adicione dependências sem necessidade clara.** O projeto valoriza stack enxuta.
13. **Em dúvida, registre como pendência ou incerteza.** É melhor um "não confirmado no código" honesto do que uma afirmação errada.
14. **Mude um arquivo de cada vez quando estiver implementando.** Diffs grandes são difíceis de revisar.
15. **Em PT-BR.** Documentação e mensagens de UI no projeto seguem português brasileiro.
