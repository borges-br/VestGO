# VestGO Architecture

## Visao geral

VestGO e uma aplicacao full-stack com frontend em Next.js e backend em Fastify/Prisma. A arquitetura atual prioriza evolucao incremental: regras de negocio no backend, App Router no frontend, descoberta publica baseada em perfis operacionais reais e integracoes enxutas com eventos de dominio ja existentes.

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
- o shell autenticado agora tambem fornece o contexto real de notificacoes via `NotificationsProvider`

### Paginas relevantes

- `/inicio`: branch minima por papel
- `/doar`: wizard real, mas so para `DONOR`
- `/operacoes`: fila operacional atual
- `/perfil/operacional`: onboarding/edicao de perfis operacionais
- `/perfil`: resumo operacional com a UI minima de parceria ponto -> ONG
- `/inicio`: para papeis operacionais, tambem funciona como dashboard/contexto de retirada
- `/notificacoes`: listagem real de notificacoes do usuario autenticado
- `/mapa`: descoberta publica com busca real e modo opcional de selecao para o wizard
- `/pontos`: redireciona para `/mapa`

### Wizard de doacao

O wizard em `web/app/(app)/doar/page.tsx` continua client-side, mas possui um contrato explicito com o mapa:

- o rascunho da doacao e preservado em `sessionStorage`
- a etapa 3 pode abrir `/mapa` em modo de selecao
- ao confirmar um ponto no mapa, o retorno para `/doar` aplica `selectedPointId`
- se o ponto escolhido nao estiver na lista curta carregada pelo wizard, o frontend hidrata esse ponto via `GET /collection-points/:id?forDonation=true`

Isso evita perda de contexto ao sair do wizard e permite concluir a doacao com o ponto realmente escolhido no mapa.

### Regras de elegibilidade no fluxo doador

- o fluxo doador nunca seleciona `NGO` como destino
- a busca de pontos para doacao usa `forDonation=true` no backend
- pontos sem parceria `ACTIVE` continuam visiveis, mas ficam indisponiveis para confirmacao
- a UI mostra esse estado como `Aguardando ONG`

### Formularios operacionais e endereco inteligente

Os formularios operacionais em `web/components/profile/operational-profile-form.tsx` agora usam endereco estruturado:

- `address`: logradouro
- `addressNumber`: numero
- `addressComplement`: complemento
- `neighborhood`, `city`, `state`, `zipCode`
- `latitude`, `longitude`

Fluxo atual no frontend:

- o usuario digita o endereco base
- o hook `web/hooks/use-address-suggestions.ts` aplica debounce e chama o backend
- ao selecionar uma sugestao, o formulario preenche automaticamente os campos disponiveis
- as coordenadas sugeridas ficam visiveis antes do save
- o backend continua sendo a fonte autoritativa para persistencia e geocoding final

### Dashboards operacionais em `/inicio`

Sem abrir uma nova area pesada nesta fase, `/inicio` foi expandido como dashboard por papel:

- `COLLECTION_POINT`: estado do perfil, parceria ativa, pendencias de retirada e acoes de aprovar/rejeitar
- `NGO`: estado do perfil, parceria ativa, historico de retiradas e acao de solicitar retirada
- `ADMIN`: visao sintetica de governanca/operacao

`/operacoes` continua sendo a fila operacional compartilhada para execucao detalhada.

### Mapa e descoberta publica

`web/components/map/mapa-page-content.tsx` agora trabalha com duas camadas separadas:

- busca textual de parceiros cadastrados
- sugestoes de endereco/lugar para recentralizar o mapa

Essa separacao evita churn desnecessario no Leaflet.

Comportamentos ativos:

- tentativa automatica de `navigator.geolocation` ao abrir o mapa
- fallback previsivel para Sorocaba quando a localizacao nao esta disponivel
- selecao visual de ponto na lista e no marcador
- confirmacao explicita antes de retornar ao wizard
- correcao de `setView` e `invalidateSize()` para evitar cortes, areas brancas e loops de tiles

### Notificacoes no frontend

A UI atual de notificacoes foi preservada e ligada ao backend real:

- `web/hooks/use-notifications.tsx` centraliza listagem, contador e marcacao como lida
- `web/components/layout/app-shell.tsx` injeta o provider no shell autenticado
- `web/components/layout/topbar.tsx` mostra preview e contador real
- `web/app/(app)/notificacoes/page.tsx` usa os dados persistidos do backend

Nao ha websocket nesta fase. O consumo atual usa refetch controlado:

- carga inicial
- foco da janela
- `visibilitychange`
- polling leve

## Backend

### Modulos principais

- `auth`: login, cadastro, refresh e logout
- `profiles`: leitura e edicao do proprio perfil
- `donations`: criacao, listagem, detalhe, timeline e mudanca de status
- `collection-points`: descoberta publica e detalhe de ponto/ONG
- `partnerships`: solicitacao e resposta minima de parceria operacional
- `pickup-requests`: solicitacao e resposta minima de retirada entre ONG e ponto parceiro
- `addresses`: sugestoes/autocomplete de endereco
- `notifications`: listagem e leitura de notificacoes persistidas
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
- `GET /partnerships`
- `POST /partnerships`
- `PATCH /partnerships/:id/status`
- `GET /pickup-requests`
- `POST /pickup-requests`
- `PATCH /pickup-requests/:id/status`
- `GET /addresses/suggestions`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `GET /admin/profiles`
- `PATCH /admin/profiles/:id/status`

## Modelo de papeis

Papeis atuais no schema Prisma:

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
- o doador so consegue concluir doacao com `COLLECTION_POINT` que possua parceria `ACTIVE`

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

## Geocoding e sugestoes de endereco

### Implementacao atual

- arquivo central: `api/src/shared/geocoding.ts`
- provider padrao: Nominatim (`https://nominatim.openstreetmap.org/search`)
- entrada: endereco estruturado do perfil operacional ou consulta livre para sugestoes
- saida:
  - `latitude` e `longitude` persistidas no usuario
  - lista de sugestoes de endereco com dados normalizados
- estrategia:
  - geocoding estruturado primeiro, com fallback textual progressivo
  - sugestoes com vies geografico, cache curto e ordenacao por relevancia/distancia

### Fluxo de geocoding no save

1. usuario salva o perfil operacional
2. backend valida se o endereco esta completo o suficiente
3. backend normaliza CEP, estado e composicao do endereco
4. backend chama o provider com tentativas progressivas
5. coordenadas resolvidas sao persistidas
6. checklist e estado publico passam a refletir a capacidade de descoberta no mapa

Se o endereco estiver completo, mas nao puder ser geolocalizado, o backend responde erro de validacao em vez de persistir coordenadas inconsistentes.
Se o provider estiver indisponivel, o backend responde erro temporario de servico.

### Fluxo de sugestao

`GET /addresses/suggestions` entrega uma camada controlada de autocomplete:

- minimo de 3 caracteres
- limite curto de resultados
- vies por `lat/lng` quando disponivel
- fallback para Sorocaba quando nao houver localizacao atual
- cache em memoria para reduzir carga no provider externo

## Descoberta publica

### Fonte unica

`GET /collection-points` e a fonte real para mapa e busca.

### Regras da consulta

- inclui `COLLECTION_POINT` e `NGO`
- inclui apenas perfis `ACTIVE` ou `VERIFIED`
- exige `latitude` e `longitude` persistidas
- aceita filtro por `category`
- aceita filtro por `role`
- aceita `forDonation=true` para blindar o fluxo doador contra `NGO`
- aceita `search` por nome, organizacao, endereco, numero, bairro, CEP, cidade e estado
- aceita busca por proximidade com `lat`, `lng` e `radius`

### Comportamento do mapa

O mapa usa dois modos no frontend:

- modo exploracao: lista parceiros publicos e detalhes gerais
- modo selecao: restringe a lista a `COLLECTION_POINT` e so confirma pontos elegiveis para o fluxo de doacao

Comportamentos implementados:

- geolocalizacao automatica controlada
- fallback previsivel para Sorocaba
- busca textual sincronizada com os resultados proximos
- camada adicional de sugestao de endereco/lugar
- distincao visual entre `COLLECTION_POINT`, `NGO` e ponto `Aguardando ONG`

## Login, cadastro e sessao

O login via `Credentials` usa Auth.js com sessao JWT:

- a tela de login saneia `callbackUrl` e estabiliza a sessao antes do redirect
- o cadastro usa o mesmo principio para evitar corrida entre `signIn`, cookie e navegacao
- o middleware continua protegendo as rotas internas
- `/inicio` recebe a sessao server-side via `auth()` ja no primeiro acesso autenticado

### Cadastro orientado por perfil

- os cards da tela de login enviam o usuario para `/cadastro` com o perfil correto
- o cadastro aceita aliases e enums reais para evitar dupla escolha de papel
- perfis operacionais seguem para `/perfil/operacional?setup=1` apos autenticacao

## Dados e persistencia

### Banco

- PostgreSQL via Prisma
- schema central em `api/prisma/schema.prisma`

### User

O usuario agora concentra tambem os campos estruturados de endereco:

- `address`
- `addressNumber`
- `addressComplement`
- `neighborhood`
- `city`
- `state`
- `zipCode`
- `latitude`
- `longitude`

### OperationalPartnership

O modelo existente foi reaproveitado e endurecido:

- `status`: `PENDING`, `ACTIVE`, `REJECTED`
- `isActive`: mantido por compatibilidade imediata
- o status passou a ser a referencia principal para elegibilidade e resposta operacional

Fluxo minimo atual:

1. `COLLECTION_POINT` solicita parceria
2. `NGO` aprova ou rejeita
3. apenas `ACTIVE` torna o ponto elegivel para doacoes

### PickupRequest

Nova entidade operacional minima para retirada:

- `operationalPartnershipId`
- `collectionPointId`
- `ngoId`
- `status`: `PENDING`, `APPROVED`, `REJECTED`
- `notes`
- `responseNotes`
- `respondedAt`
- `createdAt`
- `updatedAt`

Fluxo atual:

1. `NGO` cria uma solicitacao de retirada para uma parceria `ACTIVE`
2. `COLLECTION_POINT` aprova ou rejeita
3. a mesma parceria nao pode manter mais de uma retirada `PENDING`
4. a solicitacao alimenta dashboard e notificacoes de ambos os papeis

### Notification

Nova entidade persistida para notificacoes in-app:

- `userId`
- `type`
- `title`
- `body`
- `href`
- `payload`
- `readAt`
- `createdAt`
- `updatedAt`

Tipos atualmente usados:

- `DONATION_STATUS`
- `DONATION_POINTS`
- `BADGE_EARNED`
- `DONATION_CREATED_FOR_POINT`
- `PARTNERSHIP_REQUEST_RECEIVED`
- `PARTNERSHIP_STATUS_CHANGED`
- `PICKUP_REQUEST_CREATED`
- `PICKUP_REQUEST_RECEIVED`
- `PICKUP_REQUEST_STATUS_CHANGED`

## Eventos reais conectados a notificacoes

### Donation events

`api/src/modules/donations/donations.ts` agora cria notificacoes para:

- nova doacao recebida no ponto
- mudanca relevante de status para o doador
- pontuacao atualizada quando o evento gera pontos reais
- badge conquistada quando a condicao atual e detectavel

### Partnership events

`api/src/modules/partnerships/partnerships.ts` agora cria notificacoes para:

- nova solicitacao de parceria recebida pela ONG
- aprovacao ou rejeicao da solicitacao

### Pickup request events

`api/src/modules/pickup-requests/pickup-requests.ts` agora cria notificacoes para:

- nova solicitacao de retirada recebida pelo ponto de coleta
- criacao da retirada para a ONG que iniciou o pedido
- aprovacao ou rejeicao da retirada para a ONG solicitante

### Gamificacao

`web/lib/gamification.ts` foi mantido estavel.

No backend, `api/src/shared/notifications.ts` espelha apenas o minimo necessario para detectar:

- pontos ganhos por eventos reais de doacao
- badges atualmente detectaveis

O mesmo arquivo contem placeholders comentados para futuras badges, sem acoplamento prematuro a UI.

## Infra de apoio

- Redis para refresh token e suporte de autenticacao
- MinIO para storage
- Docker Compose para stack local e deploy

## Bootstrap admin temporario

Arquivo central:

- `api/src/bootstrap/bootstrap-admin.ts`

Comportamento:

- a API le `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`
- se o email nao existir como `ADMIN`, cria um admin bootstrap
- se ja existir admin com o mesmo email, nao altera nem duplica
- se o email ja pertencer a outro papel, apenas registra aviso no log

Essa rotina e propositalmente temporaria e voltada a provisionamento inicial em ambiente real.

## Estado desta arquitetura nesta fase

Resolvido:

- vazamento do fluxo de doacao para perfis operacionais
- criacao publica de `ADMIN`
- latitude/longitude manual no perfil operacional
- busca apenas visual no mapa
- superficie mockada de `/pontos`
- quebra do retorno do mapa para o wizard de doacao
- recentralizacao inconsistente do Leaflet apos geolocalizacao
- scroll vertical excessivo e cortes visuais no layout do mapa
- corrida entre `signIn`, cookie de sessao e navegacao manual no login
- duplicidade de escolha de perfil no cadastro
- possibilidade de ONG ser tratada como destino doador
- falta de estado explicito para ponto sem ONG ativa
- ausencia de fluxo minimo de parceria ponto -> ONG
- endereco sem numero separado
- ausencia de sugestoes/autocomplete de endereco
- notificacoes mock sem persistencia
- falha de preenchimento do logradouro ao selecionar sugestoes
- corrida entre mutation/refetch que fazia notificacoes voltarem para nao lidas
- ausencia de um modelo minimo de retirada entre ONG e ponto parceiro

Preparado para a proxima fase:

- proximidade operacional ponto -> ONG
- rastreio com semantica operacional especifica
- refinamento de notificacoes operacionais quando existirem novos eventos reais no dominio
