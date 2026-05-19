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

---

## 4. Estado Funcional das Funcionalidades

### 🟢 Totalmente Implementado no Backend e Frontend
- Cadastro, login, refresh automatizado de sessão e encerramento de conta com anonimização.
- Fluxo de segundo fator (2FA TOTP) e revogação cirúrgica de sessões conectadas.
- Verificação de e-mail por links e tokens temporários.
- Wizard de doação no mapa com Leaflet, geolocalização e autocomplete de endereço estruturado.
- Geocoding automático de coordenadas (lat/long) no banco.
- Fluxo de parcerias operacionais, retiradas e transições completas de lotes com QR Code.
- Uploads para MinIO com checagem binária profunda contra injeção de código.
- Notificações persistentes in-app e banner de consentimento de cookies.
- **Gamificação**: Cálculo de pontos, progressão por 30 níveis operacionais, ledger de pontuação atômica no banco (`PointLedger`) e sincronização pela API pelas rotas `/gamification/me` e `/gamification/me/sync`. Contém **10 Conquistas Públicas** e **5 Conquistas Secretas Ruby** (`medal-hunter`, `community-ambassador`, `unstoppable`, `supreme-donor`, `supreme-solidarity-hero`).

### 🟡 Parcialmente Implementado
- **Redefinição de Senha**: A interface do usuário (`/esqueci-senha`, `/redefinir-senha`), templates e conexões de cliente HTTP existem. **No entanto, as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram criadas no Fastify**.
- **E-mails Operacionais**: Templates ativos apenas para cadastro e alteração de status de doação. Outros eventos logísticos ainda não enviam e-mails.

### 🔴 Pendente / Não Confirmado (Fora de Escopo)
- Testes automatizados (sem frameworks instalados).
- WebSocket para notificações em tempo real.
- Dashboards estatísticos consolidados.

---

## 5. Diretrizes e Regras Cruciais para o Desenvolvimento de Código

Qualquer IA que venha a editar arquivos neste monorepo **deve** obedecer estritamente aos seguintes critérios:

1. **Fidelidade Técnica Rígida**: Não invente funcionalidades na documentação. Se uma funcionalidade não existe codificada no backend, ela deve ser explicitamente classificada como "Parcial" ou "Pendente".
2. **Preserve Comentários e Docstrings**: Nunca remova comentários explicativos ou docstrings úteis de arquivos que você estiver editando.
3. **Não comite Segredos**: O `.env` está configurado no `.gitignore`. Exemplos de chaves e variáveis devem ser fornecidos estritamente como placeholders em `.env.example` ou guias como `PRODUCTION.md`.
4. **Respeite o Padrão de Comunicação**: O frontend web conecta-se ao backend Fastify por meio do Proxy de rotas `/api/backend/[...path]`. No SSR, utilize a variável interna Docker `INTERNAL_API_URL` diretamente.
5. **Idioma**: Todo o código visível ao usuário final (telas, labels, alertas e e-mails) e a documentação técnica devem seguir rigorosamente o padrão **Português Brasileiro (PT-BR)**.
