# VestGO — Estrutura do Projeto

## Stack definida

| Camada    | Tecnologia                 | Justificativa                                                                            |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router)    | SSR/SSG para SEO da landing pública, Server Components, rotas API para proxy fino        |
| Backend   | Fastify + Prisma ORM       | Performance altíssima (~30k req/s), schema type-safe via Prisma, plugins nativos de auth |
| Banco     | PostgreSQL 16 + PostGIS    | Queries geoespaciais para "pontos de coleta próximos" (`ST_DWithin`), confiabilidade     |
| Cache     | Redis 7                    | Refresh tokens, rate limiting, cache de queries geoespaciais                             |
| Storage   | MinIO                      | S3-compatível, self-hosted, para fotos de doações e documentos das ONGs                  |
| Proxy     | Nginx Proxy Manager        | Já em uso, SSL automático, integra pela rede `rvproxy_npm_backend_network`               |
| CI/CD     | GitHub Actions + Portainer | Push → build image → push ghcr.io → webhook Portainer → redeploy automático              |
| Linguagem | TypeScript (full-stack)    | Tipagem compartilhada entre API e Web via pacote `@vestgo/types`                         |

---

## Estrutura de pastas

```
vestgo/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline completo
│
├── web/                        # Next.js 14 — Frontend
│   ├── app/
│   │   ├── (public)/           # Rotas sem autenticação
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   └── mapa/           # Mapa público de pontos
│   │   ├── (app)/              # Rotas autenticadas
│   │   │   ├── layout.tsx      # Layout com bottom navigation
│   │   │   ├── inicio/         # Dashboard do doador
│   │   │   ├── doar/           # Fluxo de nova doação
│   │   │   ├── rastreio/       # Rastreio de doações
│   │   │   ├── mapa/           # Mapa interativo (auth)
│   │   │   └── perfil/         # Perfil do usuário
│   │   └── api/                # Proxy routes (Next.js → Fastify)
│   ├── components/
│   │   ├── ui/                 # Design system components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── chip.tsx
│   │   │   └── timeline.tsx
│   │   ├── forms/
│   │   └── layout/
│   │       ├── bottom-nav.tsx
│   │       └── top-bar.tsx
│   ├── lib/
│   │   ├── api.ts              # Cliente HTTP tipado
│   │   └── auth.ts             # Configuração NextAuth
│   ├── hooks/
│   │   ├── use-geolocation.ts
│   │   └── use-donations.ts
│   ├── tailwind.config.ts      # Cores exatas do DESIGN.md
│   └── Dockerfile
│
├── api/                        # Fastify — Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # JWT, refresh token, logout
│   │   │   ├── users/          # CRUD de usuários e perfis
│   │   │   ├── donations/      # CRUD + status flow
│   │   │   ├── collection-points/  # Busca geoespacial
│   │   │   ├── ngos/           # Gerenciamento de ONGs
│   │   │   ├── timeline/       # Rastreio e eventos
│   │   │   └── notifications/  # Push notifications
│   │   ├── plugins/
│   │   │   ├── prisma.ts       # Plugin Prisma para Fastify
│   │   │   ├── redis.ts        # Plugin Redis
│   │   │   ├── auth.ts         # JWT plugin
│   │   │   └── minio.ts        # Plugin MinIO
│   │   ├── shared/
│   │   │   ├── errors.ts       # Error classes padronizadas
│   │   │   ├── pagination.ts   # Paginação cursor-based
│   │   │   └── geo.ts          # Helpers PostGIS
│   │   └── server.ts           # Entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Schema completo (ver arquivo separado)
│   │   ├── migrations/         # Gerado pelo Prisma Migrate
│   │   └── seed.ts             # Seed de dados de desenvolvimento
│   └── Dockerfile
│
├── packages/                   # Pacotes compartilhados (monorepo opcional)
│   └── types/                  # Tipos TypeScript compartilhados
│       └── src/
│           ├── donation.ts
│           ├── user.ts
│           └── collection-point.ts
│
├── infra/
│   └── postgres/
│       └── init.sql            # Ativa extensões PostGIS e uuid-ossp
│
├── docker-compose.yml          # Stack de produção
├── docker-compose.dev.yml      # Override para desenvolvimento local
├── .env.example                # Template de variáveis de ambiente
└── README.md
```

---

## Milestones de implementação

### Milestone 1 — Infra & Auth (Semana 1-2)

- [ ] Configurar monorepo com npm workspaces
- [ ] Dockerfiles para Web e API (multi-stage build)
- [ ] `docker-compose.dev.yml` para desenvolvimento local
- [x] Rotas de auth no Fastify: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [x] Middleware JWT no Fastify (`plugins/auth.ts` com `fastify.authenticate`)
- [x] Tela de login e cadastro (Next.js — `app/(public)/login/page.tsx`)
- [x] Configurar NextAuth com credentials provider (`lib/auth.ts`)

### Milestone 2 — Landing & Mapa público (Semana 2-3)

- [x] Landing page completa (`app/(public)/page.tsx`)
- [x] Endpoint `GET /collection-points?lat=&lng=&radius=` com Haversine SQL
- [x] Endpoint `GET /collection-points/:id` com detalhe completo
- [x] Mapa público com Leaflet + lista de pontos (`app/(public)/mapa/page.tsx`)
- [x] Página de detalhe do ponto de coleta (`app/(public)/mapa/[id]/page.tsx`)
- [x] Seed de dados com 5 pontos de coleta em São Paulo
- [x] `lib/api.ts` — cliente HTTP tipado para o backend

### Milestone 3 — Dashboard do doador (Semana 3-4)

- [ ] Dashboard autenticado (já existe screenshot)
- [ ] `GET /donations` paginado por cursor
- [ ] `GET /donations/:id` com timeline
- [ ] Bottom navigation component

### Milestone 4 — Fluxo de doação (Semana 4-5)

- [ ] `POST /donations` com upload de fotos para MinIO
- [ ] `PATCH /donations/:id/status` (lógica de estado machine)
- [ ] Tela de nova doação (formulário multi-step)
- [ ] Tela de rastreio com timeline visual

### Milestone 5 — Painel ONG / Coleta (Semana 6+)

- [ ] Autenticação por role (ONG, ponto de coleta)
- [ ] Endpoints de triagem
- [ ] Relatórios de impacto
- [ ] Notificações push (Web Push API)

---

## Rotas da API implementadas

### Auth — `/auth`

| Método | Rota | Autenticação | Descrição |
| ------ | ---- | ------------ | --------- |
| POST | `/auth/register` | Pública | Cria usuário com `bcrypt` hash + retorna JWT par |
| POST | `/auth/login` | Pública | Verifica senha, gera access + refresh token (Redis) |
| POST | `/auth/refresh` | Pública | Valida refresh no Redis, rotaciona tokens |
| POST | `/auth/logout` | JWT Bearer | Revoga refresh token do Redis |

### Health — `/health`

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| GET | `/health` | Status do servidor + timestamp |

### Próximos módulos planejados

| Prefix | Módulo | Status |
| ------ | ------ | ------ |
| `/donations` | CRUD + state machine de status | 🔜 Milestone 4 |
| `/collection-points` | Busca geoespacial Haversine | ✅ Milestone 2 |
| `/users` | CRUD de perfil | 🔜 Milestone 3 |

### Collection Points — `/collection-points`

| Método | Rota | Autenticação | Descrição |
| ------ | ---- | ------------ | --------- |
| GET | `/collection-points?lat=&lng=&radius=&limit=` | Pública | Busca pontos próximos (Haversine, paginação por cursor) |
| GET | `/collection-points/:id` | Pública | Detalhe de um ponto |

## Configuração do Portainer para deploy via GitHub

### Criar a stack no Portainer

1. Acesse **Portainer > Stacks > Add stack**
2. Escolha **Repository** como fonte
3. Preencha:
   - Repository URL: `https://github.com/SEU_USUARIO/vestgo`
   - Branch: `main`
   - Compose file path: `docker-compose.yml`
   - Auth: habilite e use um GitHub PAT com `read:packages`
4. Adicione as variáveis de ambiente do `.env`
5. Habilite **Auto update > Webhook**
6. Copie a URL do webhook e salve em `PORTAINER_WEBHOOK_URL` nos secrets do GitHub

### Fluxo completo após setup

```
git push origin main
  └─ GitHub Actions: lint → build → push ghcr.io → POST webhook
       └─ Portainer: pull nova imagem → docker compose up -d
            └─ Containers reiniciam com zero downtime
```

---

## Nginx Proxy Manager — Configuração dos hosts

| Domínio               | Forward para           | Porta |
| --------------------- | ---------------------- | ----- |
| app.mosfet.com.br     | vestgo-web             | 3000  |
| api.mosfet.com.br     | vestgo-api             | 3001  |
| storage.mosfet.com.br | vestgo-minio (console) | 9001  |

Todos na rede `rvproxy_npm_backend_network`.
