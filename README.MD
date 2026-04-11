# VestGO

Plataforma de doacao e operacao solidaria focada na jornada real da doacao: cadastro, ponto de coleta, ONG parceira, operacao e rastreio.

Projeto publicado em [mosfet.com.br](https://mosfet.com.br) e mantido neste repositorio como uma base full-stack ativa, sem reestruturacao do zero.

## Estado atual

O projeto ja esta funcional e, nesta etapa, consolida a Fase 10A, a estabilizacao critica do frontend e o endurecimento das regras de elegibilidade no fluxo doador:

- permissoes corretas por papel no frontend e no backend
- fluxo de doacao restrito a perfis `DONOR`
- cadastro publico bloqueando criacao de `ADMIN`
- `/inicio` com comportamento minimo por papel
- perfil operacional sem latitude/longitude manual
- geocoding no backend com fallback progressivo a partir do endereco informado
- mapa e busca usando dados reais
- `/pontos` alinhado com a descoberta real do produto
- bootstrap admin temporario controlado por ambiente
- wizard de doacao com retorno real do mapa para a escolha do ponto
- geolocalizacao automatica ao abrir o mapa
- layout responsivo do mapa com area controlada e lista sincronizada
- selecao visual de ponto com confirmacao explicita antes de voltar ao wizard
- mapa estabilizado para evitar loops de tiles, `429` e consumo destrutivo de recursos
- login e cadastro ajustados para entrar corretamente na area autenticada na primeira tentativa
- cadastro com perfil pre-selecionado vindo da tela de login
- fluxo doador blindado para selecionar apenas `COLLECTION_POINT`
- pontos sem ONG ativa continuam visiveis, mas aparecem como indisponiveis para finalizar doacao
- parceria operacional minima com fluxo `COLLECTION_POINT -> NGO` (`PENDING`, `ACTIVE`, `REJECTED`)

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
2. backend normaliza os dados e tenta geocoding com consultas estruturadas e fallback textual
3. coordenadas sao persistidas no usuario
4. mapa e busca usam essas coordenadas internamente

Variaveis de ambiente relacionadas estao em `.env.example`:

- `GEOCODING_BASE_URL`
- `GEOCODING_USER_AGENT`
- `GEOCODING_ACCEPT_LANGUAGE`
- `GEOCODING_COUNTRY_CODES`
- `GEOCODING_TIMEOUT_MS`
- `GEOCODING_EMAIL`

### Erros diferenciados de geolocalizacao

O backend separa tres casos:

- endereco incompleto: perfil pode ser salvo como rascunho sem coordenadas
- endereco nao encontrado: retorna erro de validacao para revisao do endereco
- provider indisponivel: retorna erro temporario de servico

## Bootstrap admin temporario

Existe um bootstrap admin provisório e removivel, controlado por ambiente:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Comportamento:

- a API cria o admin apenas se ainda nao existir um `ADMIN` com esse email
- nao duplica usuarios
- nao depende do seed para funcionar
- foi pensado para provisionamento inicial e deve ser removido depois

## Descoberta publica

A descoberta publica agora usa dados reais do backend:

- `/mapa` e `/mapa/[id]` exibem perfis publicos aptos
- a busca do mapa consulta o backend com `search`
- apenas perfis operacionais `ACTIVE` ou `VERIFIED` com coordenadas validas entram no mapa
- `/pontos` foi alinhado para redirecionar para `/mapa`

### Elegibilidade para doacao

- o mapa geral pode exibir `COLLECTION_POINT` e `NGO`
- no fluxo doador, apenas `COLLECTION_POINT` entra em modo de selecao
- pontos sem ONG parceira ativa continuam visiveis, mas aparecem como `Aguardando ONG`
- esses pontos nao podem ser confirmados no wizard nem no mapa em modo de selecao
- ONGs continuam visiveis em contexto publico, mas nao sao destino direto de doacao

## Wizard de doacao e mapa

O fluxo de doacao agora tem integracao direta com o mapa:

1. o doador abre `/mapa` a partir da etapa de escolha do ponto
2. o mapa entra em modo de selecao
3. o usuario escolhe e confirma um ponto de coleta
4. a aplicacao retorna para `/doar` na etapa 3
5. o ponto escolhido permanece aplicado no wizard

Detalhes importantes:

- o rascunho do wizard e preservado em `sessionStorage`
- o retorno do mapa usa query params apenas para concluir a selecao, sem depender de estado global pesado
- o mapa tenta geolocalizacao automaticamente e usa fallback coerente quando nao ha permissao
- a instancia do Leaflet permanece estavel, com `invalidateSize()` reduzido ao minimo necessario
- a hidratacao do ponto selecionado usa `GET /collection-points/:id?forDonation=true` para impedir ONG como destino no fluxo doador
- a confirmacao final da doacao exige um ponto com parceria operacional `ACTIVE`

## Estabilizacao de frontend

Esta etapa priorizou confiabilidade antes de novas features:

- importacao global correta de `leaflet.css`
- eliminacao de loops entre estado do mapa, selecao e busca
- reducao de recentralizacao e `invalidateSize()` em cascata
- login e cadastro com sessao estabilizada antes do redirect para a area autenticada

## Parceria ponto -> ONG

Fluxo minimo atual:

1. o ponto de coleta solicita parceria a uma ONG
2. a ONG aprova ou rejeita a solicitacao
3. apenas parceria `ACTIVE` torna o ponto elegivel para receber doacoes

Detalhes tecnicos:

- a entidade reutilizada e `OperationalPartnership`
- os estados atuais sao `PENDING`, `ACTIVE` e `REJECTED`
- `isActive` foi mantido por compatibilidade imediata, mas o status passou a ser a referencia principal do fluxo
- a UI minima desta etapa fica concentrada no resumo operacional do perfil

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

A proxima fase pode focar na operacao acima da parceria ja estabilizada:

- solicitacao de retirada entre ponto e ONG
- sugestao de parceiros por proximidade operacional
- dashboards dedicados para `COLLECTION_POINT` e `NGO`
- semantica operacional propria no rastreio

## Documentacao complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [`.env.example`](./.env.example)
