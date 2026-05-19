# VestGO — Contexto para Outras IAs

Documento conciso de briefing técnico estruturado para alimentar qualquer Inteligência Artificial (Gemini, Claude, GPT, etc.) que venha a trabalhar neste repositório. Este arquivo resume o estado real do código-fonte — sem prometer funcionalidades inexistentes.

---

## 1. Resumo e Objetivo do Ecossistema

O **VestGO** é uma plataforma solidária full-stack que orquestra e audita de ponta a ponta a cadeia física de doações de peças de vestuário. O objetivo é conectar doadores (`DONOR`), estabelecimentos físicos que funcionam como pontos de coleta (`COLLECTION_POINT`) e ONGs parceiras (`NGO`) que realizam a triagem e distribuição final útil. O sistema é regulado por perfis operacionais moderados por administradores (`ADMIN`).

---

## 2. Visão Geral da Stack Técnica

- **Monorepo Simples** (sem ferramentas complexas como Turborepo ou Lerna):
  - **Frontend (`web/`)**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Auth.js (next-auth v5 beta), React Query, Framer Motion, Leaflet, e `@zxing/browser` para leitura rápida de QR Code pela câmera.
  - **Backend (`api/`)**: Fastify ^4, TypeScript, Prisma ^5, `@fastify/cors`, `@fastify/jwt`, `bcrypt` (segurança de senha), `otplib` (desafios TOTP 2FA), e `nodemailer` para disparo de SMTP.
  - **Banco de Dados**: PostgreSQL 16 com a extensão espacial **PostGIS** via imagem `postgis/postgis:16-3.4-alpine`.
  - **Cache & Rate Limit**: Redis Server 7.
  - **Storage de Mídia**: MinIO (compatível com S3).
  - **Ambiente & Orquestração**: Docker e Docker Compose (`docker-compose.yml`, `docker-compose.dev.yml` e `docker-compose.prod.yml`).

---

## 3. Domínios Principais do Schema Prisma (`api/prisma/schema.prisma`)

- **Usuários & Papéis (`User`, enum `UserRole`)**: Donos de contas sob os papéis `DONOR`, `COLLECTION_POINT`, `NGO` e `ADMIN`. Admins são provisionados exclusivamente via variáveis de ambiente (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).
- **Autenticação & Sessões (`UserSession`)**: Tokens JWT rotacionados em banco e sessões ativas totalmente revogáveis de forma individual.
- **Segurança de Conta (`UserTwoFactor` & `UserTwoFactorRecoveryCode`)**: Segundo fator TOTP criptografado com segredo AES e controle de códigos estáticos.
- **Perfil Operacional**: Endereço estruturado e atributos de funcionamento ( checklist, CNPJ, lat/long e acessibilidade) persistidos no próprio registro `User`. Alterações públicas críticas geram um registro pendente em `pendingPublicRevision` para governança do Admin.
- **Ciclo Logístico de Peças**:
  - `Donation` + `DonationItem` + `DonationEvent`: A doação é criada pelo `DONOR` apontando para um `COLLECTION_POINT` ativo.
  - `OperationalPartnership`: Vinculação formal entre Ponto de Coleta e ONG (`PENDING` / `ACTIVE` / `REJECTED`).
  - `PickupRequest`: Solicitação de retirada emitida pela ONG com janela de horários.
  - `OperationalBatch` + `OperationalBatchItem`: Lotes logísticos consolidando várias doações em sacas. Ciclo de vida: `OPEN` $\rightarrow$ `READY_TO_SHIP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED` $\rightarrow$ `CLOSED`.
- **Notificações (`Notification`)**: Sistema de alertas in-app baseado em banco e consumido por meio de timers de polling no frontend.
- **Gamificação (`PointLedger` & `UserAchievement`)**: Ledger de pontos e controle de conquistas do doador.

Organizar o ciclo de doação de roupas, calçados e acessórios em um fluxo digital simples, com rastreio para o doador, fila operacional para o ponto de coleta e operação posterior pela ONG parceira.

## 3. Público-alvo

- Doadores (`DONOR`)
- Pontos de coleta (`COLLECTION_POINT`)
- ONGs parceiras (`NGO`)
- Administradores (`ADMIN`)

## 4. Problema que resolve

Doações soltas, sem rastreabilidade, com pontos de coleta sem visibilidade e ONGs recebendo material sem trilha. O VestGO formaliza parcerias, padroniza estados e dá retorno ao doador.

## 5. Estado atual

- **Funcional**: autenticação, 2FA TOTP, sessões ativas, verificação de e-mail, redefinição de senha completa, e-mails operacionais transacionais, gamificação (com curva frontend e backend sincronizadas), encerramento de conta com anonimização, perfil operacional, mapa público, doação, parceria, retirada, lotes operacionais, notificações in-app, uploads em MinIO, validação de CPF/telefone, banner de consentimento de cookies.
- **Parcial**: nenhuma funcionalidade principal do escopo básico do monorepo está parcial no momento.
- **Planejado**: WebSocket, push, testes automatizados extensivos, dashboards de impacto.

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

- Gamificação: curva de níveis sincronizada no frontend (`web/lib/gamification.ts`) com os thresholds oficiais do backend, servindo `/gamification/me` como a fonte oficial de dados e a curva local estritamente como fallback visual.

## 12. O que está pendente

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

## 5. Diretrizes e Regras Cruciais para o Desenvolvimento de Código

Qualquer IA que venha a editar arquivos neste monorepo **deve** obedecer estritamente aos seguintes critérios:

1. **Fidelidade Técnica Rígida**: Não invente funcionalidades na documentação. Se uma funcionalidade não existe codificada no backend, ela deve ser explicitamente classificada como "Parcial" ou "Pendente".
2. **Preserve Comentários e Docstrings**: Nunca remova comentários explicativos ou docstrings úteis de arquivos que você estiver editando.
3. **Não comite Segredos**: O `.env` está configurado no `.gitignore`. Exemplos de chaves e variáveis devem ser fornecidos estritamente como placeholders em `.env.example` ou guias como `PRODUCTION.md`.
4. **Respeite o Padrão de Comunicação**: O frontend web conecta-se ao backend Fastify por meio do Proxy de rotas `/api/backend/[...path]`. No SSR, utilize a variável interna Docker `INTERNAL_API_URL` diretamente.
5. **Idioma**: Todo o código visível ao usuário final (telas, labels, alertas e e-mails) e a documentação técnica devem seguir rigorosamente o padrão **Português Brasileiro (PT-BR)**.
