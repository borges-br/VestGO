<div align="center">

<img src="web/public/branding/vestgo-logo.svg" alt="Logotipo do VestGO" width="220" />

# VestGO

Plataforma full-stack de doação solidária focada na jornada real da peça doada: cadastro, ponto de coleta, ONG parceira, operação e rastreio.

</div>

---

## Sobre o projeto

O VestGO é uma plataforma web que conecta três atores principais ao redor da doação de roupas, calçados e acessórios:

- pessoas que querem doar peças;
- pontos de coleta que recebem essas doações;
- ONGs parceiras que recebem o material e dão destino final.

A ideia central é dar visibilidade a cada etapa: quem doou, onde a doação foi entregue, qual ONG ficou responsável e em que estado está o ciclo. O sistema não substitui o trabalho humano de coleta e distribuição — ele organiza esse trabalho em um fluxo digital simples.

> **Status acadêmico**: o VestGO é um projeto desenvolvido em contexto universitário (Facens), em evolução incremental. Ele já tem partes funcionais e partes ainda em desenvolvimento. A documentação abaixo separa claramente o que está pronto, o que é parcial e o que ainda é planejado.

---

## Problema que o projeto busca resolver

Doações de roupas frequentemente ficam soltas: a pessoa que doa não sabe para onde a peça foi, o ponto de coleta acumula material sem visibilidade, e a ONG parceira recebe sem rastreabilidade. O VestGO tenta:

- dar uma trilha digital simples para cada doação;
- aproximar pontos de coleta e ONGs por meio de parcerias formais;
- permitir que doadores acompanhem a evolução da própria doação.

---

## Público-alvo

- **Doadores**: pessoas físicas que querem entregar peças em um ponto de coleta confiável.
- **Pontos de coleta**: estabelecimentos ou voluntários que recebem doações e atualizam o status inicial.
- **ONGs parceiras**: organizações que recebem as doações encaminhadas pelos pontos de coleta.
- **Administradores**: pessoas responsáveis por moderar perfis operacionais e governança.
- **Avaliadores e curiosos**: professores, colegas e visitantes que querem entender a proposta.

---

## Funcionalidades

A lista abaixo separa por estado real no código.

### Implementadas

- Cadastro e login com Auth.js + JWT/refresh token no backend
- Refresh automático de access token e logout controlado quando o refresh falha
- Bootstrap admin temporário via variáveis de ambiente
- Papéis: `DONOR`, `COLLECTION_POINT`, `NGO`, `ADMIN`
- Cadastro público bloqueando criação de `ADMIN`
- Wizard de doação restrito a `DONOR`, com integração ao mapa para escolha do ponto
- Mapa público (`/mapa`) com Leaflet, geolocalização automática e fallback para Sorocaba
- Busca textual de parceiros + camada adicional de sugestão de endereço/lugar
- Endereço estruturado (logradouro, número, complemento, bairro, CEP, cidade, estado, lat/long)
- Autocomplete de endereço servido pelo backend (provider Mapbox ou Nominatim)
- Geocoding no save do perfil operacional
- Perfil operacional com checklist e estados públicos `DRAFT` / `PENDING` / `ACTIVE` / `VERIFIED`
- Revisão pendente de alterações públicas críticas em perfis aprovados
- Governança em `/admin/perfis` para aprovação inicial e revisões pendentes
- Parceria operacional ponto → ONG com estados `PENDING` / `ACTIVE` / `REJECTED`
- Solicitação de retirada (PickupRequest) entre ONG e ponto parceiro
- Lotes operacionais (OperationalBatch) com fluxo `OPEN` → `READY_TO_SHIP` → `IN_TRANSIT` → `DELIVERED` → `CLOSED`
- Notificações in-app persistidas no banco (sem websocket; refetch + polling)
- Uploads via MinIO para avatar, capa e galeria pública (validação de MIME e magic bytes)
- Leitura de QR de doação para o fluxo operacional (zxing-js no navegador)
- 2FA TOTP no backend (setup/confirm/disable, códigos de recuperação)
- Sessões ativas: listagem, revogação individual e "sair de outros dispositivos"
- Rate limit por IP e por e-mail no login (Redis)
- Verificação de e-mail (envio do link e confirmação)
- Encerramento de conta com anonimização (`/auth/account-deletion/request` e `/auth/account-deletion/confirm`)
- Validação de CPF e telefone no backend e no frontend (`api/src/shared/cpf.ts`, `phone.ts`)
- Lista de cidades/estados brasileiros para autocomplete (`brazil-locations.ts`)
- Banner de consentimento de cookies (`cookie-consent-banner.tsx` + `cookie-consent.ts`)
- Guarda de sessão de conta (`account-session-guard.tsx`) integrada ao shell autenticado
- Layout responsivo, dark mode, navegação role-aware (sidebar, topbar e bottom nav)

### Parcialmente implementadas

- **Redefinição de senha**: as telas `/esqueci-senha` e `/redefinir-senha` existem, o cliente HTTP em `web/lib/api.ts` chama `/auth/request-password-reset` e `/auth/reset-password`, e o template de e-mail (`passwordResetTemplate`) já existe — porém **as duas rotas correspondentes em `api/src/modules/auth/auth.ts` ainda não foram implementadas**. O fluxo só termina quando o backend ganhar essas rotas.
- **Gamificação**: existe estrutura no frontend (`web/lib/gamification.ts`, componentes de `impact-widgets` e badges) e tipos de notificação (`DONATION_POINTS`, `BADGE_EARNED`) no banco, mas as regras de pontuação e badges no backend ainda estão minimalistas. Pendente refinamento.
- **E-mails operacionais**: hoje o backend dispara e-mails apenas para "doação registrada" e "mudança de status de doação" (`api/src/shared/operational-emails.ts`). Outros eventos não geram e-mail.
- **Página `/pontos`**: redireciona para `/mapa`, mantida apenas por compatibilidade.

### Planejadas / pendentes

- Push notifications, e-mail transacional para todos os eventos e WebSocket
- Sugestão de parceiros por proximidade operacional
- Semântica operacional própria no rastreio (atualmente compartilha estados com a fila)
- Métricas de impacto e dashboards mais ricos
- Testes automatizados (não há suíte de testes no repositório)

---

## Fluxo básico para o usuário

1. **Cadastro / login** em `/cadastro` ou `/login`.
2. **Doador** abre `/doar` e segue o wizard: dados das peças, escolha do ponto de coleta no mapa, confirmação.
3. **Ponto de coleta** recebe a doação fisicamente e atualiza o status na fila operacional.
4. **ONG parceira** acompanha pela fila, abre solicitações de retirada e fecha lotes operacionais.
5. **Doador** acompanha o ciclo em `/rastreio`.
6. **Admin** aprova novos perfis operacionais e revisões públicas em `/admin/perfis`.

---

## Tecnologias usadas

Resumo simples (versões reais nos `package.json`):

| Camada | Tecnologia | O que faz |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Renderiza a interface e organiza rotas públicas/privadas |
| UI / efeitos | framer-motion, three.js / react-three-fiber, lucide-react | Animações, cena 3D na home e ícones |
| Mapa | Leaflet + react-leaflet | Mostra parceiros no mapa público |
| QR | @zxing/browser, react-qr-code | Geração e leitura de QR de doação |
| Estado de servidor | @tanstack/react-query | Cache de chamadas à API |
| Autenticação web | next-auth v5 (beta) | Sessão JWT no navegador |
| Backend | Fastify + TypeScript | API HTTP em Node.js |
| Banco de dados | PostgreSQL (imagem `postgis/postgis:16-3.4-alpine`) via Prisma | Persistência relacional |
| Cache / sessão | Redis 7 | Rate limit, desafios de 2FA, setup TOTP |
| Armazenamento de arquivos | MinIO (S3 compatível) | Avatar, capa e galeria pública |
| E-mail | nodemailer (SMTP configurável) | Envio de e-mails operacionais |
| 2FA | otplib | Geração e verificação de códigos TOTP |
| Geocoding | Mapbox (padrão) ou Nominatim | Coordenadas a partir de endereço |
| Infra local | Docker / Docker Compose | Orquestração de serviços |
| CI/CD | GitHub Actions + GHCR + Portainer (webhook) | Lint, typecheck, build, publicação de imagens e deploy |

---

## Contexto acadêmico

O VestGO foi desenvolvido no contexto da faculdade (Facens) como projeto full-stack ativo. A evolução é incremental: cada fase consolida algumas capacidades e deixa outras como pendência explícita. Por isso a documentação prioriza honestidade sobre status, em vez de prometer funcionalidades que ainda não estão prontas no código.

---

## Limitações conhecidas

- Não existe suíte de testes automatizados.
- O fluxo de recuperação de senha ainda depende de rotas backend que não estão implementadas (`/auth/request-password-reset` e `/auth/reset-password`).
- Notificações dependem de polling/refetch — não há WebSocket nem push.
- O rastreio do doador compartilha lógica com a fila operacional; ainda não tem timeline própria.
- Gamificação é estrutural, mas as regras de pontuação são limitadas.
- Não há dashboards de métricas/impacto consolidados.

---

## Pendências

- Implementar `POST /auth/request-password-reset` e `POST /auth/reset-password` em `api/src/modules/auth/auth.ts` e ligar ao template `passwordResetTemplate` que já existe.
- Definir e documentar uma rotina oficial de backup do PostgreSQL e do MinIO.
- Adicionar testes mínimos em backend e frontend.
- Decidir se o provider de geocoding padrão será Mapbox (atual) ou Nominatim em produção e ajustar `.env`.

---

## Como rodar localmente

Pré-requisitos: Docker, Docker Compose e Node.js 20+ (caso queira rodar fora do Docker).

### Caminho recomendado: Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Os serviços iniciam em:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Postgres: porta `5433` no host (5432 dentro do compose)
- MinIO: console em http://localhost:9001

O serviço `vestgo-api` aplica `prisma migrate deploy` automaticamente antes de iniciar.

### Caminho alternativo: Node direto

```bash
cd api
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev

# Em outro terminal
cd web
npm install
npm run dev
```

### Bootstrap admin

Se `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` estiverem definidos no `.env`, a API cria um admin no primeiro start (e ignora se já existir). Use apenas para provisionamento inicial.

---

## Documentação complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md) — visão técnica detalhada
- [CONTEXT.md](./CONTEXT.md) — resumo para alimentar outras IAs
- [docs/PRODUCTION.md](./docs/PRODUCTION.md) — passo a passo para colocar em produção
- [`.env.example`](./.env.example) — modelo das variáveis de ambiente
