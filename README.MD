# VestGO

Plataforma de doacao e operacao solidaria focada na jornada real da doacao: cadastro, ponto de coleta, ONG parceira, operacao e rastreio.

Projeto publicado em [mosfet.com.br](https://mosfet.com.br) e mantido neste repositorio como uma base full-stack ativa, sem reestruturacao do zero.

## Estado atual

O projeto ja esta funcional e nesta etapa consolida a Fase 10A:

- permissoes corretas por papel no frontend e no backend
- fluxo de doacao restrito a perfis `DONOR`
- cadastro publico bloqueando criacao de `ADMIN`
- `/inicio` com comportamento minimo por papel
- perfil operacional sem latitude/longitude manual
- geocoding no backend a partir do endereco informado
- mapa e busca usando dados reais
- `/pontos` alinhado com a descoberta real do produto

## Stack

- frontend: Next.js 14 + TypeScript + App Router
- backend: Fastify + Prisma
- banco: PostgreSQL
- autenticacao: NextAuth no web + JWT/refresh token no backend
- cache/sessoes: Redis
- arquivos: MinIO
- infraestrutura: Docker / Docker Compose
- deploy alvo: VPS Ubuntu + Nginx Proxy Manager

## Papéis do sistema

- `DONOR`: cria doacoes e acompanha rastreio
- `COLLECTION_POINT`: opera recebimento e atualizacao inicial das doacoes
- `NGO`: opera etapas posteriores e distribuicao
- `ADMIN`: acompanha a operacao e modera perfis operacionais

### Regras de permissao vigentes

- apenas `DONOR` pode criar doacao
- `COLLECTION_POINT` e `NGO` nao usam o wizard de `/doar`
- `ADMIN` nao pode ser criado via cadastro publico
- a navegacao principal muda conforme o papel da sessao

## Perfil operacional e estados publicos

Perfis de `COLLECTION_POINT` e `NGO` usam os estados:

- `DRAFT`
- `PENDING`
- `ACTIVE`
- `VERIFIED`

O estado depende do checklist operacional e aparece nas areas de perfil e dashboard.

## Geolocalizacao

Latitude e longitude nao sao mais digitadas manualmente por usuarios operacionais.

Fluxo atual:

1. usuario informa endereco no perfil operacional
2. backend resolve coordenadas por geocoding
3. coordenadas sao persistidas no usuario
4. mapa e busca usam essas coordenadas internamente

Variaveis de ambiente relacionadas estao em `.env.example`:

- `GEOCODING_BASE_URL`
- `GEOCODING_USER_AGENT`
- `GEOCODING_ACCEPT_LANGUAGE`
- `GEOCODING_COUNTRY_CODES`
- `GEOCODING_TIMEOUT_MS`

## Descoberta publica

A descoberta publica agora usa dados reais do backend:

- `/mapa` e `/mapa/[id]` exibem perfis publicos aptos
- a busca do mapa consulta o backend com `search`
- apenas perfis operacionais `ACTIVE` ou `VERIFIED` com coordenadas validas entram no mapa
- `/pontos` foi alinhado para redirecionar para `/mapa`

## Estrutura principal

```text
VestGO/
|-- api/
|   |-- prisma/
|   `-- src/
|-- web/
|   |-- app/
|   |-- components/
|   `-- lib/
|-- infra/
|-- docker-compose.yml
|-- docker-compose.dev.yml
|-- docker-compose.prod.yml
|-- README.MD
`-- ARCHITECTURE.md
```

## Execucao local

Exemplos mais comuns:

```bash
cd api
npm install
npm run build

cd ../web
npm install
npm run build
```

Para subir a stack completa, use os arquivos `docker-compose*.yml` do repositorio conforme o ambiente.

## Proxima etapa

A Fase 10B fica concentrada em operacao:

- solicitacao de retirada entre ponto e ONG
- sugestao de parceiros por proximidade operacional
- dashboards dedicados para `COLLECTION_POINT` e `NGO`
- semantica operacional propria no rastreio

## Documentacao complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [`.env.example`](./.env.example)
