# VestGO

Plataforma de doacao e operacao solidaria focada na jornada real da doacao: cadastro, ponto de coleta, ONG parceira, operacao e rastreio.

Projeto publicado em [mosfet.com.br](https://mosfet.com.br) e mantido neste repositorio como uma base full-stack ativa, sem reestruturacao do zero.

## Estado atual

O projeto ja esta funcional e, nesta etapa, consolida:

- Fase 10A e a estabilizacao critica do frontend
- endurecimento das regras de elegibilidade no fluxo doador
- preenchimento inteligente de endereco com autocomplete
- notificacoes in-app reais e persistidas
- solicitacoes de retirada entre ONG e ponto de coleta
- dashboards operacionais dedicados em `/inicio`

Capacidades relevantes ja ativas:

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
- endereco estruturado com `address`, `addressNumber` e `addressComplement`
- autocomplete backend-driven para formularios operacionais
- busca publica com camada adicional de sugestao de endereco/lugar, sem substituir a busca textual de parceiros
- fallback geografico padrao para Sorocaba quando a localizacao atual nao estiver disponivel
- notificacoes reais persistidas no backend, com contador de nao lidas e marcacao como lida
- correcoes de regressao no autocomplete para garantir preenchimento real do logradouro
- correcoes de concorrencia no frontend para manter notificacoes como lidas apos refetch/polling
- solicitacao de retirada com fluxo `NGO -> COLLECTION_POINT`
- dashboards de `COLLECTION_POINT` e `NGO` com contexto operacional e painel de retiradas

## Stack

- frontend: Next.js 14 + TypeScript + App Router
- backend: Fastify + Prisma
- banco: PostgreSQL
- autenticacao: NextAuth no web + JWT/refresh token no backend
- cache/sessoes: Redis
- arquivos: MinIO
- infraestrutura: Docker / Docker Compose
- deploy alvo: VPS Ubuntu + Nginx Proxy Manager

## Papeis do sistema

- `DONOR`: cria doacoes e acompanha rastreio
- `COLLECTION_POINT`: opera recebimento e atualizacao inicial das doacoes
- `NGO`: opera etapas posteriores, distribuicao e resposta de parceria
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

## Geolocalizacao e endereco

Latitude e longitude nao sao mais digitadas manualmente por usuarios operacionais.

### Modelagem atual de endereco

- `address`: logradouro
- `addressNumber`: numero
- `addressComplement`: complemento
- `neighborhood`: bairro
- `city`: cidade
- `state`: estado
- `zipCode`: CEP
- `latitude` / `longitude`: coordenadas persistidas

Os novos campos foram adicionados de forma compativel com registros antigos.

### Fluxo atual

1. usuario informa logradouro, numero, complemento e demais campos do endereco
2. o frontend pode sugerir enderecos a partir do que esta sendo digitado
3. ao selecionar uma sugestao, os campos relevantes sao preenchidos automaticamente
4. backend normaliza os dados e tenta geocoding com consultas estruturadas e fallback textual
5. coordenadas sao persistidas no usuario
6. mapa e busca usam essas coordenadas internamente

### Autocomplete de endereco

O autocomplete e servido pelo backend, sem chamar o provider externo diretamente do navegador.

Comportamento atual:

- debounce no frontend para evitar excesso de requests
- minimo de 3 caracteres para buscar sugestoes
- vies pela localizacao atual quando disponivel
- fallback para o centro de Sorocaba quando a localizacao atual nao estiver disponivel
- cache curto no backend para reduzir carga sobre o provider
- preenchimento automatico de logradouro, numero, complemento, bairro, cidade, estado, CEP e coordenadas quando a sugestao trouxer esses dados

Onde ja esta aplicado:

- formulario operacional de `COLLECTION_POINT`
- formulario operacional de `NGO`
- busca publica de `/mapa` como camada adicional para recentralizar o mapa

### Variaveis de ambiente relacionadas

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

Existe um bootstrap admin provisorio e removivel, controlado por ambiente:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Comportamento:

- a API cria o admin apenas se ainda nao existir um `ADMIN` com esse email
- nao duplica usuarios
- nao depende do seed para funcionar
- foi pensado para provisionamento inicial e deve ser removido depois

## Descoberta publica

A descoberta publica usa dados reais do backend.

### Mapa e busca

- `/mapa` e `/mapa/[id]` exibem perfis publicos aptos
- a busca textual atual de parceiros continua ativa
- o mapa agora soma uma camada de sugestao de endereco/lugar para recentralizar a experiencia
- apenas perfis operacionais `ACTIVE` ou `VERIFIED` com coordenadas validas entram no mapa
- `/pontos` foi alinhado para redirecionar para `/mapa`
- quando a localizacao atual nao estiver disponivel, o centro base passa a ser Sorocaba

### Elegibilidade para doacao

- o mapa geral pode exibir `COLLECTION_POINT` e `NGO`
- no fluxo doador, apenas `COLLECTION_POINT` entra em modo de selecao
- pontos sem ONG parceira ativa continuam visiveis, mas aparecem como `Aguardando ONG`
- esses pontos nao podem ser confirmados no wizard nem no mapa em modo de selecao
- ONGs continuam visiveis em contexto publico, mas nao sao destino direto de doacao

## Wizard de doacao e mapa

O fluxo de doacao tem integracao direta com o mapa:

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

As ultimas fases priorizaram confiabilidade antes de novas features:

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

## Solicitacao de retirada

Com a parceria `ACTIVE` estabelecida, a operacao agora possui uma camada minima de retirada:

1. a `NGO` solicita retirada para um ponto parceiro
2. o `COLLECTION_POINT` aprova ou rejeita
3. o status da solicitacao passa por `PENDING`, `APPROVED` ou `REJECTED`

Detalhes tecnicos:

- a entidade nova e `PickupRequest`
- cada solicitacao referencia uma `OperationalPartnership` `ACTIVE`
- a ONG nao consegue abrir outra retirada pendente para a mesma parceria
- o ponto de coleta responde no proprio dashboard de `/inicio`
- `/operacoes` continua como fila operacional compartilhada para execucao detalhada

## Dashboards operacionais

`/inicio` agora diferencia melhor os papeis operacionais:

- `COLLECTION_POINT`: estado do perfil, parceria ativa, pendencias de retirada e acoes de aprovar/rejeitar
- `NGO`: estado do perfil, parceria ativa, historico de retiradas e acao de solicitar retirada
- `ADMIN`: continua com uma visao sintetica de governanca e operacao, sem duplicar a fila detalhada

## Notificacoes reais

As notificacoes deixaram de ser mock e agora sao persistidas no backend.

Capacidades atuais:

- listagem real por usuario autenticado
- contador real de notificacoes nao lidas
- marcacao individual como lida
- marcacao em lote como lida
- integracao com a UI ja existente, sem redesign amplo

### Eventos que ja disparam notificacao

Para `DONOR`:

- mudanca relevante no status da doacao
- pontuacao atualizada quando ha ganho real de pontos
- badge conquistada quando a condicao atual e detectavel

Para `COLLECTION_POINT`:

- nova doacao criada para o ponto
- mudanca relevante de parceria
- nova solicitacao de retirada recebida

Para `NGO`:

- nova solicitacao de parceria
- solicitacao aprovada
- solicitacao rejeitada
- solicitacao de retirada criada
- solicitacao de retirada aprovada
- solicitacao de retirada rejeitada

### Gamificacao

As estruturas atuais de gamificacao foram preservadas:

- metas
- badges
- comparativo local
- historico de contribuicao

Nesta fase, apenas conectamos notificacoes a eventos reais de pontuacao e badges ja detectaveis.
O backend tambem passou a conter placeholders comentados para futuras regras de badges, sem mudar a UI atual.

### O que fica de fora por enquanto

Ainda nao entram nesta fase:

- push notification
- email transacional
- websocket
- notificacoes de capacidade maxima

Esses itens continuam fora de escopo ate que o dominio tenha dados reais e confiaveis para isso.

## Estrutura principal

```text
VestGO/
|-- api/
|   |-- prisma/
|   `-- src/
|-- web/
|   |-- app/
|   |-- components/
|   |-- hooks/
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
npm run prisma:generate
npm run build

cd ../web
npm install
npm run build
```

Se houver novas migrations pendentes, aplique-as antes de subir a stack para que os campos de endereco estruturado, a tabela de notificacoes e o modelo `PickupRequest` existam no banco real.

Para subir a stack completa, use os arquivos `docker-compose*.yml` do repositorio conforme o ambiente.

## Proxima etapa

A proxima fase pode focar na operacao acima da parceria ja estabilizada:

- sugestao de parceiros por proximidade operacional
- semantica operacional propria no rastreio
- refinamento futuro das regras de badges e notificacoes operacionais quando o dominio tiver mais eventos reais
- fechamento do ciclo logico de retirada com impacto direto em prioridades e timeline operacional

## Documentacao complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [`.env.example`](./.env.example)
