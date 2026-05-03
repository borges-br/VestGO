# VestGO — Arquitetura

Documentação técnica do projeto. Reflete o estado real do código no commit corrente do branch. Decisões idealizadas estão marcadas como "planejado" ou "pendente".

---

## 1. Visão geral

VestGO é um monorepo full-stack:

- **Frontend** em Next.js 14 (App Router) servindo a interface web e fazendo proxy de chamadas para a API.
- **Backend** em Fastify + Prisma expondo uma REST API com autenticação JWT.
- **Banco** PostgreSQL (imagem `postgis/postgis:16-3.4-alpine`).
- **Cache/sessão**: Redis.
- **Storage**: MinIO (S3-compatible).
- **Orquestração local e de produção**: Docker Compose.
- **CI/CD**: GitHub Actions publicando imagens em GHCR e disparando webhook do Portainer.

Não há serviços externos obrigatórios fora desta stack. O geocoding pode usar Mapbox (padrão) ou Nominatim, ambos opcionais.

---

## 2. Estrutura do monorepo

```text
VestGO/
├─ api/                       # Backend Fastify + Prisma
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ seed.ts
│  │  └─ migrations/          # 15 migrations versionadas
│  ├─ src/
│  │  ├─ bootstrap/
│  │  ├─ modules/
│  │  ├─ plugins/
│  │  ├─ shared/
│  │  └─ server.ts
│  ├─ Dockerfile
│  ├─ package.json
│  └─ tsconfig.json
├─ web/                       # Frontend Next.js 14
│  ├─ app/
│  │  ├─ (public)/
│  │  ├─ (app)/
│  │  ├─ api/                 # Next route handlers
│  │  └─ layout.tsx
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  ├─ public/
│  ├─ styles/
│  ├─ middleware.ts
│  ├─ Dockerfile
│  └─ package.json
├─ infra/
│  └─ postgres/init.sql       # extensions: uuid-ossp, postgis
├─ docs/
│  └─ PRODUCTION.md
├─ docker-compose.yml         # ambiente padrão (build local)
├─ docker-compose.dev.yml     # overlay de dev (volumes, watch)
├─ docker-compose.prod.yml    # imagens GHCR + rede do NPM
├─ .github/workflows/deploy.yml
├─ README.md
├─ ARCHITECTURE.md
└─ CONTEXT.md
```

---

## 3. Tecnologias e versões principais

Versões a partir dos arquivos reais (`api/package.json`, `web/package.json`).

### Backend (`api/package.json`)

- Node 20 (Dockerfile: `node:20-alpine`)
- Fastify ^4.28
- @fastify/cors ^9, @fastify/jwt ^8
- Prisma + @prisma/client ^5.15
- Redis ^4.6
- MinIO ^7.1
- bcrypt ^5.1
- otplib ^12 (TOTP)
- nodemailer ^8
- zod ^3.23
- dotenv ^16
- TypeScript ^5.5, tsx, ESLint

### Frontend (`web/package.json`)

- Next.js 14.2.35
- React 18.3
- next-auth ^5.0.0-beta.30
- @tanstack/react-query ^5.51
- Tailwind CSS ^3.4 + tailwind-merge + @tailwindcss/typography
- framer-motion ^11
- three ^0.168 + @react-three/fiber + @react-three/drei
- leaflet ^1.9 + react-leaflet ^4.2
- @zxing/browser ^0.2 (leitura de QR)
- react-qr-code ^2 (geração de QR)
- lucide-react, clsx, zod

### Pipeline (deploy.yml)

- `actions/setup-node` com Node 24 (apenas no CI; runtime do container é Node 20)
- `docker/build-push-action@v7` publicando em `ghcr.io/<owner>/vestgo-web` e `ghcr.io/<owner>/vestgo-api`
- Webhook do Portainer disparado após publicação

---

## 4. Frontend

### 4.1 Organização de rotas

App Router em `web/app/`:

- `web/app/(public)/`:
  - `page.tsx` (landing)
  - `login/`, `cadastro/`
  - `mapa/` (mapa público sem shell autenticado)
  - `confirmar-email/`, `esqueci-senha/`, `redefinir-senha/`, `encerrar-conta/`
- `web/app/(app)/`:
  - `inicio/`, `mapa/`, `doar/`, `rastreio/`, `rastreio/[id]/`
  - `operacoes/`, `notificacoes/`, `suporte/`
  - `perfil/` (resumo), `perfil/operacional/`, `perfil/privacidade/`
  - `configuracoes/`, `configuracoes/perfil/`
  - `admin/perfis/`
  - `pontos/` (redireciona para `/mapa`)
- `web/app/api/`:
  - `auth/[...nextauth]/route.ts` — handler do Auth.js
  - `backend/[...path]/route.ts` — proxy para o backend (resolve CORS no navegador)

### 4.2 Middleware (`web/middleware.ts`)

- Define rotas protegidas: `/inicio`, `/doar`, `/rastreio`, `/operacoes`, `/configuracoes`, `/perfil`, `/notificacoes`, `/suporte`.
- Redireciona para `/login?callbackUrl=...` quando o `accessToken` não está na sessão.
- Redireciona para `/inicio` quando usuário autenticado tenta acessar `/login` ou `/cadastro`.

### 4.3 Sessão e refresh

- Auth.js (next-auth v5 beta) com `Credentials` provider em `web/lib/auth.ts`.
- O backend retorna `accessToken`, `refreshToken` e expiração no `/auth/login`. Esses dados são guardados na sessão JWT do Auth.js.
- O callback `jwt` tenta refresh quando o access token está perto de expirar; em falha, marca `RefreshAccessTokenError` e o `AppShell` força sign-out.
- `SessionProvider` usa refetch em foco e em intervalo leve.

### 4.4 Comunicação com o backend

- No navegador: chamadas vão para `/api/backend/...`, que é o proxy em `web/app/api/backend/[...path]/route.ts`. O proxy reenvia para `INTERNAL_API_URL` ou `NEXT_PUBLIC_API_URL`.
- No SSR: `web/lib/api.ts` usa `INTERNAL_API_URL` direto.

### 4.5 Estado e dados

- `@tanstack/react-query` para cache HTTP em vários componentes.
- `web/hooks/use-notifications.tsx` mantém estado das notificações com proteção contra refetch fora de ordem (request versioning).
- `web/hooks/use-address-suggestions.ts` aplica debounce e chama `/addresses/suggestions`.

### 4.6 Componentes relevantes

- `components/layout/app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `bottom-nav.tsx`, `theme-provider.tsx`, `navigation.ts` (nav role-aware).
- `components/map/mapa-page-content.tsx`, `collection-map.tsx` — modos exploração e seleção.
- `components/profile/operational-profile-form.tsx` e `operational-profile-summary.tsx`.
- `components/donations/operational-board.tsx`, `status-action-panel.tsx`, `post-donation-rating.tsx`, `donation-status.ts`.
- `components/operations/code-qr-card.tsx`, `operational-code-scanner.tsx`, `operational-batches-panel.tsx`, `operational-batch-trace-card.tsx`, `pickup-requests-panel.tsx`.
- `components/auth/email-verification-reminder.tsx`.
- `components/gamification/impact-widgets.tsx`.
- `components/branding/vestgo-logo.tsx`, `vestgo-mark.tsx`.
- `components/layout/account-session-guard.tsx` — guarda que reage a expiração da sessão.
- `components/layout/cookie-consent-banner.tsx` + `web/lib/cookie-consent.ts` — banner de consentimento de cookies.
- `web/lib/cpf.ts`, `web/lib/phone.ts`, `web/lib/brazil-locations.ts` — utilitários client-side espelhando a validação do backend.

### 4.7 Navegação por papel (`components/layout/navigation.ts`)

- `DONOR`: `/inicio`, `/mapa`, `/doar`, `/rastreio`.
- `COLLECTION_POINT` e `NGO`: `/inicio`, `/mapa`, `/operacoes`, `/rastreio`.
- `ADMIN`: `/inicio`, `/admin/perfis`, `/operacoes`, `/mapa`.

---

## 5. Backend

### 5.1 Bootstrap (`api/src/server.ts`)

- Carrega `dotenv`.
- Registra plugins: `prisma`, `redis`, `storage` (MinIO), `auth` (decora Fastify com `authenticate`).
- Registra `@fastify/cors` com lista derivada de `CORS_ORIGIN`.
- Registra `@fastify/jwt` com `JWT_SECRET` e expiração `JWT_EXPIRES_IN`.
- Após `app.ready()`, executa `ensureBootstrapAdmin` (idempotente) e ouve em `0.0.0.0:PORT`.

### 5.2 Plugins (`api/src/plugins/`)

- `prisma.ts` — instancia o `PrismaClient` e faz `decorate('prisma', ...)`.
- `redis.ts` — cliente Redis (rate limit, desafios 2FA, setup TOTP).
- `storage.ts` — cliente MinIO.
- `auth.ts` — decorator `fastify.authenticate` que valida JWT e injeta `request.user` (id, email, role, sessionId).

### 5.3 Módulos (`api/src/modules/`)

| Módulo | Arquivos | Prefixo |
| --- | --- | --- |
| auth | `auth.ts`, `auth-sessions.ts`, `auth-totp.ts`, `auth-crypto.ts` | `/auth` |
| profiles | `profiles.ts`, `profile-shared.ts` | `/profiles` |
| admin | `admin-profiles.ts` | `/admin/profiles` |
| addresses | `addresses.ts` | `/addresses` |
| collection-points | `collection-points.ts` | `/collection-points` |
| donations | `donations.ts` | `/donations` |
| notifications | `notifications.ts` | `/notifications` |
| partnerships | `partnerships.ts` | `/partnerships` |
| pickup-requests | `pickup-requests.ts` | `/pickup-requests` |
| operational-batches | `operational-batches.ts` | `/operational-batches` |
| operational-donations | `operational-donations.ts` | `/operational-donations` |
| uploads | `uploads.ts` | `/uploads` |
| health | `health.ts` | `/health` |

### 5.4 Endpoints reais

Lista derivada diretamente do código (`grep` em `api/src/modules`).

**Health**

- `GET /health`

**Auth (`api/src/modules/auth/auth.ts`)**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/2fa/verify-login`
- `POST /auth/refresh`
- `POST /auth/logout` (autenticado)
- `GET /auth/me` (autenticado)
- `POST /auth/change-password` (autenticado)
- `GET /auth/sessions` (autenticado)
- `DELETE /auth/sessions/:id` (autenticado, não pode revogar a atual)
- `POST /auth/sessions/revoke-others` (autenticado)
- `GET /auth/2fa/status` (autenticado)
- `POST /auth/2fa/setup` (autenticado)
- `POST /auth/2fa/confirm` (autenticado)
- `POST /auth/2fa/disable` (autenticado)
- `POST /auth/2fa/recovery-codes/regenerate` (autenticado)
- `POST /auth/verify-email`
- `POST /auth/request-email-verification` (autenticado)
- `POST /auth/account-deletion/request` (autenticado)
- `POST /auth/account-deletion/confirm`
- `POST /auth/request-account-deletion` (autenticado, alias mantido para compatibilidade)

> **Pendentes (chamados pelo frontend, mas ainda sem rota no backend)**: `POST /auth/request-password-reset` e `POST /auth/reset-password`. O template `passwordResetTemplate` já existe em `api/src/shared/email-templates.ts` e o utilitário `UserToken` (tipo `PASSWORD_RESET`) também — o que falta é criar as duas rotas e disparar o e-mail.

**Profiles**

- `GET /profiles/me`
- `PATCH /profiles/me`
- `PATCH /profiles/me/email-preferences`

**Admin profiles**

- `GET /admin/profiles`
- `PATCH /admin/profiles/:id/status`
- `PATCH /admin/profiles/:id/revision`

**Collection points (público)**

- `GET /collection-points`
- `GET /collection-points/:id`

**Donations**

- `POST /donations`
- `GET /donations`
- `GET /donations/operations`
- `GET /donations/:id`
- `GET /donations/:id/timeline`
- `PATCH /donations/:id/status`

**Notifications**

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

**Partnerships**

- `GET /partnerships`
- `POST /partnerships`
- `PATCH /partnerships/:id/status`

**Pickup requests**

- `GET /pickup-requests`
- `POST /pickup-requests`
- `PATCH /pickup-requests/:id/status`

**Operational batches**

- `GET /operational-batches`
- `GET /operational-batches/by-code/:code`
- `POST /operational-batches`
- `GET /operational-batches/:id`
- `POST /operational-batches/:id/items`
- `DELETE /operational-batches/:id/items/:itemId`
- `POST /operational-batches/:id/mark-ready`
- `POST /operational-batches/:id/dispatch`
- `POST /operational-batches/:id/confirm-delivery`
- `POST /operational-batches/:id/close`
- `POST /operational-batches/:id/cancel`

**Operational donations**

- `GET /operational-donations/by-code/:code`

**Addresses**

- `GET /addresses/suggestions`
- `GET /addresses/reverse`

**Uploads**

- `POST /uploads`
- `GET /uploads/:key`

### 5.5 Validação e erros

- Toda entrada validada com `zod`.
- Erros centralizados em `api/src/shared/errors.ts` (`AppError`, `UnauthorizedError`, `NotFoundError`, `ConflictError`, `toErrorResponse`).
- Respostas JSON consistentes (`error`, `message`, `statusCode`).

### 5.6 Infra compartilhada

- `api/src/shared/geocoding.ts` — wrapper de provider (`mapbox` padrão; `nominatim` alternativo).
- `api/src/shared/notifications.ts` — criação de notificações in-app.
- `api/src/shared/email.ts` + `email-templates.ts` + `operational-emails.ts` — SMTP via nodemailer.
- `api/src/shared/rate-limit.ts` — utilitários para limitar por IP / chave.
- `api/src/shared/user-tokens.ts` — geração e consumo seguro de `UserToken` (tipos `EMAIL_VERIFICATION`, `PASSWORD_RESET`, `ACCOUNT_DELETION`). Já consumido pelas rotas de verificação de e-mail e encerramento de conta. Pendente plug-in nas rotas de redefinição de senha.
- `api/src/shared/cpf.ts` — validação de CPF.
- `api/src/shared/phone.ts` — normalização e validação de telefone brasileiro.
- `api/src/shared/brazil-locations.ts` — lista de estados e cidades brasileiras usada por autocompletes.

---

## 6. Banco de dados

### 6.1 Estratégia

- `postgresql` via Prisma (`api/prisma/schema.prisma`).
- Migrations versionadas em `api/prisma/migrations/` (15 migrations no commit atual).
- Em todos os ambientes a stack roda `npx prisma migrate deploy` no startup do `vestgo-api` (definido nos compose files).
- `prisma db push` **não é** usado como mecanismo padrão.

### 6.2 Modelos principais (resumo do `schema.prisma`)

- `User` — usuário com campos pessoais e operacionais (endereço estruturado, lat/long, organização, descrição, regras, categorias, openingSchedule, accessibility, galleryImageUrls, pendingPublicRevision, anonymizedAt, etc.).
- `UserToken` — tokens com tipo `EMAIL_VERIFICATION` / `PASSWORD_RESET` / `ACCOUNT_DELETION`.
- `UserSession` — sessão de refresh token (`refreshTokenHash`, `userAgent`, `ipAddress`, `expiresAt`, `revokedAt`).
- `UserTwoFactor` + `UserTwoFactorRecoveryCode` — segredo TOTP criptografado e códigos de recuperação.
- `Donation` + `DonationItem` + `DonationEvent` — doação com itens e timeline.
- `OperationalPartnership` — parceria ponto ↔ ONG (`PENDING` / `ACTIVE` / `REJECTED`).
- `OperationalBatch` + `OperationalBatchItem` — lote operacional ligando várias doações para uma retirada.
- `PickupRequest` — solicitação de retirada (`PENDING` / `APPROVED` / `REJECTED`).
- `Notification` — notificações in-app por usuário com `type`, `title`, `body`, `payload`, `readAt`.

### 6.3 Enums

`UserRole`, `DonationStatus`, `ItemCategory`, `PublicProfileState`, `OperationalPartnershipStatus`, `NotificationType`, `PickupRequestStatus`, `OperationalBatchStatus`, `PublicProfileRevisionStatus`, `UserTokenType`.

### 6.4 Cuidados sensíveis

- `passwordHash` (bcrypt), `tokenHash` (sha256), `refreshTokenHash` (sha256), `secretEncrypted` (AES com `TWO_FACTOR_ENCRYPTION_KEY`).
- Anonimização: `User.anonymizedAt` é o ponto previsto para o fluxo de encerramento de conta — o backend já tem o campo, mas o endpoint que dispara isso ainda é pendente.
- Backups: política não documentada no repositório (pendência operacional, ver `docs/PRODUCTION.md`).

---

## 7. Infraestrutura local (Docker)

`docker-compose.yml` define cinco serviços:

| Serviço | Imagem | Função | Portas (host) |
| --- | --- | --- | --- |
| `vestgo-web` | build de `./web` | Next.js | 3000 |
| `vestgo-api` | build de `./api` | Fastify + Prisma | 3001 |
| `vestgo-db` | `postgis/postgis:16-3.4-alpine` | PostgreSQL | 5433 → 5432 |
| `vestgo-redis` | `redis:7-alpine` | Cache + 2FA | — |
| `vestgo-minio` | `minio/minio:latest` | Storage + console | 9000, 9001 |

Detalhes:

- `vestgo-api` espera `vestgo-db`, `vestgo-redis` e `vestgo-minio` saudáveis e roda `npx prisma migrate deploy && npm run start`.
- Redis exige senha (`REDIS_PASSWORD`) e roda com `--maxmemory 256mb --maxmemory-policy allkeys-lru`.
- `infra/postgres/init.sql` ativa `uuid-ossp` e `postgis` no primeiro start do banco.
- O alias de rede `vestgo-storage` aponta para o container do MinIO.
- `docker-compose.dev.yml` é um overlay que troca o comando para `npm run dev` e monta volumes locais.

`docker-compose.prod.yml`:

- usa imagens publicadas (`${WEB_IMAGE}`, `${API_IMAGE}`) e `pull_policy: always`;
- conecta os serviços de borda na rede externa `${NPM_EXTERNAL_NETWORK:-rvproxy_npm_backend_network}` para integrar com Nginx Proxy Manager;
- `vestgo-storage` substitui `vestgo-minio` como nome do serviço.

---

## 8. Variáveis de ambiente

Todas as variáveis abaixo aparecem em `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml` ou `.github/workflows/deploy.yml`. Não inclui segredos reais.

### URLs e domínios

- `APP_PUBLIC_URL` — URL pública do frontend.
- `WEB_PUBLIC_URL` — usado por templates de e-mail para gerar links absolutos.
- `API_PUBLIC_URL` — URL pública da API.
- `STORAGE_PUBLIC_URL` — URL pública do MinIO (S3 público).
- `NEXT_PUBLIC_API_URL` — URL da API exposta ao navegador.
- `INTERNAL_API_URL` — URL interna (rede Docker) usada no SSR e no proxy.
- `NEXTAUTH_URL` — base do Auth.js.
- `AUTH_TRUST_HOST` — confiança em proxy reverso (true em produção atrás de NPM).

### Auth

- `NEXTAUTH_SECRET` / `AUTH_SECRET` — segredo do Auth.js.
- `JWT_SECRET` — assinatura do access token.
- `JWT_REFRESH_SECRET` — assinatura do refresh token.
- `JWT_EXPIRES_IN` (default `15m`) e `JWT_REFRESH_EXPIRES_IN` (default `7d`).
- `TWO_FACTOR_ENCRYPTION_KEY` — chave hex de 32 bytes para criptografar segredos TOTP.

### CORS / proxy

- `CORS_ORIGIN` — lista separada por vírgula com origens permitidas.
- `TRUST_PROXY` — habilita confiança em headers `X-Forwarded-*`.

### Banco

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- `DATABASE_URL` — string de conexão (ex.: `postgresql://vestgo:vestgo@vestgo-db:5432/vestgo`).

### Redis

- `REDIS_PASSWORD`, `REDIS_URL`.

### Storage (MinIO)

- `MINIO_ENDPOINT` (alias interno `vestgo-storage`).
- `MINIO_PORT` (default 9000).
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`.
- `MINIO_CONSOLE_URL` — URL do console.
- `MINIO_BROWSER_REDIRECT_URL` (compose) — para SSO de retorno do console.

### E-mail

- `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`.
- `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_FROM_ADDRESS`.
- `EMAIL_VERIFICATION_EXPIRES_MINUTES`, `PASSWORD_RESET_EXPIRES_MINUTES`, `ACCOUNT_DELETION_EXPIRES_MINUTES` — TTLs já listados em `.env.example`, mas só serão consumidos quando as rotas pendentes forem implementadas.

### Geocoding

- `GEOCODING_PROVIDER` — `mapbox` (padrão) ou `nominatim`.
- `GEOCODING_BASE_URL`, `GEOCODING_USER_AGENT`, `GEOCODING_ACCEPT_LANGUAGE`, `GEOCODING_COUNTRY_CODES`, `GEOCODING_TIMEOUT_MS`, `GEOCODING_EMAIL`.
- `MAPBOX_SECRET_TOKEN`, `MAPBOX_PUBLIC_TOKEN` (também exposto como `NEXT_PUBLIC_MAPBOX_TOKEN`).

### Bootstrap admin (provisório)

- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.

### Deploy / produção

- `WEB_IMAGE`, `API_IMAGE` — tags GHCR.
- `NPM_EXTERNAL_NETWORK` — rede externa do Nginx Proxy Manager.
- `PORTAINER_WEBHOOK_URL` (secret) — webhook que redepliará a stack.
- `WEB_HEALTHCHECK_URL`, `API_HEALTHCHECK_URL` — usados pelo job de healthcheck do GitHub Actions.

---

## 9. Fluxos técnicos principais

### 9.1 Autenticação

1. `POST /auth/register` ou `POST /auth/login` valida credenciais com bcrypt.
2. Em caso de 2FA habilitado, `/auth/login` retorna um `challengeId` e exige `POST /auth/2fa/verify-login`.
3. Sucesso cria uma `UserSession` com `refreshTokenHash` e devolve `accessToken` (15 min default) + `refreshToken` (7 dias default).
4. O frontend guarda os tokens na sessão JWT do Auth.js.
5. `POST /auth/refresh` valida o refresh token, compara com o hash da sessão e rotaciona ambos.
6. `POST /auth/logout` revoga a sessão atual.
7. Mudança de senha (`/auth/change-password`) revoga todas as sessões e emite tokens novos.

### 9.2 2FA (TOTP)

1. `POST /auth/2fa/setup` gera segredo, salva em Redis com TTL e retorna `otpauthUri`.
2. Usuário escaneia no app autenticador.
3. `POST /auth/2fa/confirm` valida o código, criptografa o segredo (`TWO_FACTOR_ENCRYPTION_KEY`) e gera códigos de recuperação.
4. `GET /auth/2fa/status`, `POST /auth/2fa/disable`, `POST /auth/2fa/recovery-codes/regenerate` completam o ciclo.

### 9.3 Sessões ativas

- `GET /auth/sessions` lista sessões não revogadas.
- `DELETE /auth/sessions/:id` revoga (não permite revogar a atual).
- `POST /auth/sessions/revoke-others` revoga todas exceto a atual.

### 9.4 Perfil operacional

- `PATCH /profiles/me` aplica regras de `profile-shared.ts` para derivar `publicProfileState` (`DRAFT` / `PENDING` / `ACTIVE` / `VERIFIED`).
- Para perfis `ACTIVE` ou `VERIFIED`, mudanças em campos públicos críticos não são publicadas direto: viram `pendingPublicRevision` e ficam em `/admin/perfis`.
- O backend executa geocoding no save quando o endereço está completo o suficiente.

### 9.5 Doação

1. `POST /donations` (apenas `DONOR`) cria a doação ligada a um `COLLECTION_POINT` que tenha parceria `ACTIVE`.
2. Notificações são criadas para o doador e para o ponto.
3. E-mail operacional "doação registrada" é enviado se `EMAIL_ENABLED=true`.
4. `PATCH /donations/:id/status` atualiza `DonationStatus` e gera `DonationEvent` na timeline.
5. Mudança de status pode disparar e-mail operacional e notificações in-app (`DONATION_STATUS`, `DONATION_POINTS`, `BADGE_EARNED`).

### 9.6 Parceria e retirada

- `COLLECTION_POINT` cria parceria com `POST /partnerships`. ONG aprova via `PATCH /partnerships/:id/status`.
- Com parceria `ACTIVE`, a ONG cria `POST /pickup-requests`. O ponto aprova/rejeita via `PATCH /pickup-requests/:id/status`.
- Apenas uma `PickupRequest` `PENDING` por parceria.

### 9.7 Lote operacional

- `POST /operational-batches` cria lote ligado à parceria.
- `POST /operational-batches/:id/items` adiciona doações (uma doação só pode pertencer a um lote — restrição do schema).
- Transições explícitas: `mark-ready`, `dispatch`, `confirm-delivery`, `close`, `cancel`.

### 9.8 Uploads / storage

- `POST /uploads` aceita `target` (`avatar` | `cover` | `gallery`), `contentType`, `dataBase64`.
- Validação: tamanho ≤ 5 MB, MIME declarado, magic bytes (jpeg/png/webp).
- Arquivos vão para o bucket MinIO definido em `MINIO_BUCKET`.
- `GET /uploads/:key` retorna o objeto via stream.

### 9.9 Geocoding

- Entrada: endereço estruturado ou consulta livre.
- Provider configurável (`GEOCODING_PROVIDER`).
- Cache em memória com TTL curto.
- Erros tratados: endereço incompleto / não encontrado / provider indisponível.

### 9.10 Notificações

- Sem WebSocket. Frontend usa `react-query` com refetch em foco e polling leve.
- `notifications.ts` (frontend) protege contra mutações fora de ordem.

### 9.11 Verificação de e-mail, encerramento de conta, redefinição de senha

- **Verificação de e-mail (implementado)**: `POST /auth/request-email-verification` cria um `UserToken` `EMAIL_VERIFICATION`, envia o e-mail com `emailVerificationTemplate` e dispara `POST /auth/verify-email` na confirmação. A tela `/confirmar-email` consome esse fluxo.
- **Encerramento de conta (implementado)**: `POST /auth/account-deletion/request` envia o link de confirmação; `POST /auth/account-deletion/confirm` consome o token e anonimiza o usuário (`User.anonymizedAt`). Mantido alias `POST /auth/request-account-deletion` para compatibilidade. Tela `/encerrar-conta`.
- **Redefinição de senha (pendente)**: `web/lib/api.ts` chama `/auth/request-password-reset` e `/auth/reset-password` e a tela `/esqueci-senha` / `/redefinir-senha` existe; o template `passwordResetTemplate` está pronto, mas as rotas no backend ainda não foram criadas.

---

## 10. Segurança

### Implementado

- Senhas com bcrypt (salt rounds via const).
- JWT com `JWT_SECRET` e expiração curta + refresh token rotacionado.
- Refresh token armazenado como hash sha256 em `UserSession`.
- 2FA TOTP com segredo criptografado (`TWO_FACTOR_ENCRYPTION_KEY`).
- Rate limit por IP e por e-mail no login (Redis).
- Validação rígida de inputs com `zod`.
- Upload com whitelist de MIME e checagem de magic bytes.
- CORS por allowlist (`CORS_ORIGIN`).
- `TRUST_PROXY` configurável para produção atrás de proxy reverso.
- Sessões revogáveis individualmente; mudança de senha revoga todas.
- Cookies do Auth.js gerenciados pela própria lib (nada manual).

### Lacunas conhecidas / pendências

- Sem CSRF dedicado para chamadas via proxy `/api/backend` (depende da política do navegador e do `SameSite` dos cookies do Auth.js).
- Sem auditoria de eventos (login, exclusão de sessão, mudanças de papel) em tabela dedicada.
- Sem WAF/IDS — depende do Nginx Proxy Manager + Cloudflare se aplicável.
- Sem rotação automática de `JWT_SECRET` ou `TWO_FACTOR_ENCRYPTION_KEY`.
- Bootstrap admin é proposital e deve ser removido após o primeiro provisionamento (reler `BOOTSTRAP_ADMIN_*`).
- `.env` não deve ser versionado (já está no `.gitignore`).

---

## 11. Estado atual da integração frontend ↔ backend

| Área | Frontend | Backend | Estado |
| --- | --- | --- | --- |
| Login / cadastro / refresh / logout | OK | OK | Implementado |
| 2FA TOTP | OK | OK | Implementado |
| Sessões ativas | OK | OK | Implementado |
| Perfil operacional + revisão | OK | OK | Implementado |
| Governança admin | OK | OK | Implementado |
| Wizard de doação | OK | OK | Implementado |
| Mapa / descoberta pública | OK | OK | Implementado |
| Notificações in-app | OK | OK | Implementado |
| Parceria ponto ↔ ONG | OK | OK | Implementado |
| Pickup requests | OK | OK | Implementado |
| Lotes operacionais | OK | OK | Implementado |
| Uploads (avatar/capa/galeria) | OK | OK | Implementado |
| QR de doação | OK (zxing + react-qr-code) | OK (códigos persistidos) | Implementado |
| Verificação de e-mail | OK | OK | Implementado |
| Encerramento de conta | OK | OK | Implementado |
| Recuperação de senha | OK | **Faltando rotas** | Parcial |
| E-mail transacional de eventos não-doação | — | Apenas templates | Pendente |
| Push notifications / WebSocket | — | — | Planejado |

---

## 12. Débitos técnicos identificados

- Implementar `POST /auth/request-password-reset` e `POST /auth/reset-password` (frontend já assume que existem).
- Cobertura de testes inexistente (nenhum framework configurado em `package.json`).
- `pontos/` mantido como redirecionamento; pode ser removido em fase futura.
- Tipos do `next-auth` ainda em beta (v5 beta.30); upgrade pode exigir ajustes.
- `gamification.ts` no frontend tem regras locais que não são autoritativas — ainda não há fonte única no backend para badges/pontos.
- `prisma migrate deploy` roda no startup do container — em produção é correto, mas torna o restart mais lento; aceitar como decisão consciente.
- Não há `.env.production.example` separado do `.env.example`.

---

## 13. Decisões arquiteturais observadas

- **Monorepo simples** sem ferramentas tipo Turborepo ou pnpm workspaces — cada app gerencia o próprio `package.json`.
- **Proxy frontend → backend** via `web/app/api/backend/[...path]/route.ts` para evitar configurar CORS no navegador e centralizar o tráfego.
- **Auth.js no web + JWT puro no backend** — integração via callback `jwt` que sincroniza tokens.
- **Migrations como fonte de verdade**, não `db push`.
- **Endereço estruturado no `User`** em vez de uma tabela separada de `Address`.
- **Notificações por refetch/polling** — simplicidade primeiro, WebSocket depois.
- **Bootstrap admin ambient-driven**, removível.
- **Storage S3-like local com MinIO**, evitando dependência de S3 real em dev.

---

## 14. Recomendações futuras (não implementadas)

- Adicionar testes (Vitest / Jest no backend, Playwright no web).
- Centralizar logs estruturados (ex.: Loki ou Datadog) — hoje só há logger Fastify.
- Implementar fila de jobs (BullMQ via Redis) para envio de e-mails e geocoding assíncrono.
- Considerar `pgbouncer` quando o volume crescer.
- Avaliar substituir `@zxing/browser` por uma alternativa mantida ativamente.
- Documentar política de backup de Postgres e MinIO (ver `docs/PRODUCTION.md`).
- Separar staging e produção (compose, secrets, banco).
- Adicionar tabela de auditoria para ações sensíveis.

---

## 15. Apêndice — pipeline CI/CD

`.github/workflows/deploy.yml` define quatro jobs encadeados:

1. `web-quality` — `npm ci`, `lint`, `type-check`, `build` em `web/`.
2. `api-quality` — idem em `api/`.
3. `publish-images` — login no GHCR, build/push de `vestgo-web` e `vestgo-api` com tags `:latest` e `:sha-<commit>`.
4. `deploy-production` — dispara webhook do Portainer (segredo `PORTAINER_WEBHOOK_URL`).
5. `post-deploy-healthcheck` — `curl` em `WEB_HEALTHCHECK_URL` e `API_HEALTHCHECK_URL` com retry curto.

Os jobs de publicação e deploy não rodam em pull requests (`if: github.event_name != 'pull_request'`).
