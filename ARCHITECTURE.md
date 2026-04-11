# VestGO Architecture

## Visao geral

VestGO e uma aplicacao full-stack com frontend em Next.js e backend em Fastify/Prisma. A arquitetura atual prioriza evolucao incremental: regras de negocio no backend, App Router no frontend e descoberta publica baseada em perfis operacionais reais.

## Monorepo

```text
VestGO/
|-- api/                     # Fastify + Prisma
|-- web/                     # Next.js 14 App Router
|-- infra/                   # artefatos de infra
|-- docker-compose.yml
|-- docker-compose.dev.yml
|-- docker-compose.prod.yml
|-- README.MD
`-- ARCHITECTURE.md
```

## Frontend

### Organizacao de rotas

- `web/app/(public)`: landing, login, cadastro e detalhes publicos
- `web/app/(app)`: rotas autenticadas e areas internas
- `web/middleware.ts`: protege rotas internas e deixa a descoberta publica acessivel

### Shell e navegacao

- `AppShell` envolve a experiencia autenticada
- `/mapa` pode ser usado publicamente; nesse caso o shell autenticado e suprimido
- a navegacao principal e role-aware:
  - `DONOR`: `/inicio`, `/mapa`, `/doar`, `/rastreio`
  - `COLLECTION_POINT` / `NGO` / `ADMIN`: `/inicio`, `/mapa`, `/operacoes`, `/rastreio`

### Paginas relevantes

- `/inicio`: branch minima por papel
- `/doar`: wizard real, mas so para `DONOR`
- `/operacoes`: fila operacional atual
- `/perfil/operacional`: onboarding/edicao de perfis operacionais
- `/mapa`: descoberta publica com busca real
- `/pontos`: redireciona para `/mapa`

## Backend

### Modulos principais

- `auth`: login, cadastro, refresh e logout
- `profiles`: leitura e edicao do proprio perfil
- `donations`: criacao, listagem, detalhe, timeline e mudanca de status
- `collection-points`: descoberta publica e detalhe de ponto/ONG
- `admin-profiles`: governanca minima de perfis operacionais

### Endpoints importantes

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /donations`
- `GET /donations`
- `GET /donations/:id`
- `PATCH /donations/:id/status`
- `GET /profiles/me`
- `PATCH /profiles/me`
- `GET /collection-points`
- `GET /collection-points/:id`
- `GET /admin/profiles`
- `PATCH /admin/profiles/:id/status`

## Modelo de papéis

Papéis atuais no schema Prisma:

- `DONOR`
- `COLLECTION_POINT`
- `NGO`
- `ADMIN`

### Regras ativas

- `POST /donations` aceita apenas `DONOR`
- `COLLECTION_POINT` faz a etapa inicial da operacao
- `NGO` conclui etapas posteriores
- `ADMIN` acompanha e modera
- o cadastro publico so aceita `DONOR`, `COLLECTION_POINT` e `NGO`

## Perfil operacional

Os perfis operacionais usam um checklist para derivar o estado publico:

- `DRAFT`
- `PENDING`
- `ACTIVE`
- `VERIFIED`

Arquivos centrais:

- `api/src/modules/profiles/profile-shared.ts`
- `api/src/modules/profiles/profiles.ts`
- `web/components/profile/operational-profile-form.tsx`

## Geocoding

### Implementacao atual

- arquivo central: `api/src/shared/geocoding.ts`
- provider padrao: Nominatim (`https://nominatim.openstreetmap.org/search`)
- entrada: endereco textual do perfil operacional
- saida: `latitude` e `longitude` persistidas no usuario

### Fluxo

1. usuario salva o perfil operacional
2. backend valida se o endereco esta completo o suficiente
3. backend chama o provider de geocoding
4. coordenadas resolvidas sao persistidas
5. checklist e estado publico passam a refletir a capacidade de descoberta no mapa

Se o endereco estiver completo, mas nao puder ser geolocalizado, o backend responde erro de validacao em vez de persistir coordenadas inconsistentes.

## Descoberta publica

### Fonte unica

`GET /collection-points` e a fonte real para mapa e busca.

### Regras da consulta

- inclui `COLLECTION_POINT` e `NGO`
- inclui apenas perfis `ACTIVE` ou `VERIFIED`
- exige `latitude` e `longitude` persistidas
- aceita filtro por `category`
- aceita `search` por nome, organizacao, endereco, bairro, cidade e estado
- aceita busca por proximidade com `lat`, `lng` e `radius`

### Consumo no frontend

- `web/components/map/mapa-page-content.tsx`
- `web/lib/api.ts`

## Dados e persistencia

### Banco

- PostgreSQL via Prisma
- schema central em `api/prisma/schema.prisma`

### Infra de apoio

- Redis para refresh token e suporte de autenticacao
- MinIO para storage
- Docker Compose para stack local e deploy

## Estado desta arquitetura apos a Fase 10A

Resolvido:

- vazamento do fluxo de doacao para perfis operacionais
- criacao publica de `ADMIN`
- latitude/longitude manual no perfil operacional
- busca apenas visual no mapa
- superficie mockada de `/pontos`

Preparado para a Fase 10B:

- solicitacao de retirada
- proximidade operacional ponto -> ONG
- dashboards dedicados por papel operacional
- rastreio com semantica operacional especifica
