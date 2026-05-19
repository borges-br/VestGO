# Implantação e Operação em Produção — VestGO

Este manual detalha o passo a passo para implantar, configurar e operar a plataforma **VestGO** em ambientes de produção reais. As instruções aqui contidas baseiam-se na infraestrutura e nos arquivos de orquestração reais do monorepo — sem inventar ferramentas ou configurações fictícias.

> [!IMPORTANT]  
> O ambiente de produção exige cuidados extras com persistência de dados, certificados de criptografia HTTPS de borda, isolamento de rede dos containers e rotação segura de segredos de ambiente. Leia atentamente os avisos antes de executar comandos que possam causar perda de dados.

---

## 1. Visão Geral da Arquitetura de Rede e Isolamento

No ecossistema de produção configurado em [docker-compose.prod.yml](../docker-compose.prod.yml), a segurança é garantida por meio do **isolamento estrito de portas físicas no servidor host**.

### Como funciona o isolamento:
- Os serviços de armazenamento de dados relacional (`vestgo-db`) e cache temporário/sessão (`vestgo-redis`) **não expõem nenhuma porta pública para o host Linux**. Eles comunicam-se de forma estritamente privada dentro da rede interna isolada do Docker (`vestgo_internal`).
- Os containers que necessitam de tráfego externo para o correto funcionamento do ecossistema (`vestgo-web`, `vestgo-api` e `vestgo-storage`) são acoplados tanto à rede interna quanto à rede externa de proxy reverso (`NPM_EXTERNAL_NETWORK`), cujo padrão de nomenclatura configurado é `rvproxy_npm_backend_network`.
- Um **Nginx Proxy Manager (NPM)** rodando no mesmo host Docker atua como a única borda de entrada pública. Ele recebe conexões externas em HTTPS nas portas padrão `80` e `443`, valida e decodifica o SSL e encaminha o tráfego via HTTP pura internamente na rede Docker diretamente para os containers corretos:
  - `www.seu-dominio.com.br` $\rightarrow$ Repassado para `vestgo-web:3000`
  - `api.seu-dominio.com.br` $\rightarrow$ Repassado para `vestgo-api:3001`
  - `storage.seu-dominio.com.br` $\rightarrow$ Repassado para `vestgo-storage:9000` (S3)

---

## 2. Pré-requisitos para Implantação

Antes de iniciar os procedimentos, certifique-se de possuir:
1. Um **servidor VPS Linux** (Ubuntu 22.04 LTS ou superior recomendado) com acesso root/sudo via SSH.
2. **Docker Engine** e o plugin do **Docker Compose v2** devidamente instalados no servidor.
3. Um **nome de domínio** registrado com duas entradas DNS do tipo `A` apontando diretamente para o endereço de IP público do seu servidor VPS:
   - Uma entrada para o frontend (ex.: `vestgo.seu-dominio.com.br` ou `www.seu-dominio.com.br`).
   - Uma entrada para a API backend (ex.: `api.seu-dominio.com.br`).
4. **Portas liberadas no Firewall**: Somente as portas `22` (SSH), `80` (HTTP) e `443` (HTTPS) devem estar expostas publicamente no servidor VPS. Todas as demais portas devem permanecer bloqueadas.

---

## 3. Passo a Passo da Instalação Inicial

Siga rigorosamente a sequência de comandos abaixo para clonar e subir a stack no servidor de produção:

### 3.1 Clonar o Repositório
```bash
git clone https://github.com/borges-br/VestGO.git
cd VestGO
```

### 3.2 Criar a Rede Externa do Proxy
Caso o Nginx Proxy Manager já esteja rodando no servidor sob uma rede compartilhada com o nome padrão, pule este passo. Caso contrário, crie a rede externa no Docker manualmente:
```bash
docker network create rvproxy_npm_backend_network
```

### 3.3 Provisionar o Arquivo de Configurações (`.env`)
Gere o arquivo de produção a partir do modelo de exemplo:
```bash
cp .env.example .env
```

> [!WARNING]  
> O arquivo `.env` gerado no servidor contém segredos criptográficos reais e credenciais confidenciais de banco de dados. **Nunca versione este arquivo** ou anexe-o em Pull Requests. Ele já está devidamente configurado no arquivo `.gitignore` do projeto.

Abra o arquivo `.env` com um editor de sua preferência (como `nano .env`) e edite minuciosamente cada variável com base na tabela da seção 4 deste guia.

### 3.4 Iniciar a Stack de Containers
Execute o pull das imagens geradas na nuvem e suba a infraestrutura em segundo plano:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

> [!NOTE]  
> O container `vestgo-api` possui uma rotina em seu script de inicialização que executa de forma automática o comando `npx prisma migrate deploy` antes de subir o servidor HTTP. Isso garante que qualquer nova tabela ou campo mapeado seja provisionado com segurança no banco PostgreSQL sem risco de apagar dados.

### 3.5 Validar a Integridade dos Serviços
Monitore a inicialização dos serviços com os comandos de inspeção de logs:
```bash
# Verificar se todos os containers estão com status "Up" ou "Healthy"
docker compose -f docker-compose.prod.yml ps

# Analisar os logs de inicialização da API
docker compose -f docker-compose.prod.yml logs vestgo-api --tail=150 -f
```

---

## 4. Tabela de Variáveis de Ambiente para Produção

Edite as seguintes configurações do seu arquivo `.env` para garantir a conformidade e a segurança do ecossistema:

### 🌐 Endereços Públicos & Roteamento
| Variável | Valor Recomendado / Comportamento |
| --- | --- |
| `APP_PUBLIC_URL` | A URL pública oficial do seu frontend (ex.: `https://vestgo.seu-dominio.com.br`). |
| `WEB_PUBLIC_URL` | Utilizado por templates de e-mail do sistema para gerar links absolutos de redirecionamento. Geralmente idêntico ao `APP_PUBLIC_URL`. |
| `API_PUBLIC_URL` | A URL pública oficial da sua API (ex.: `https://api.seu-dominio.com.br`). |
| `STORAGE_PUBLIC_URL` | URL pública de leitura do MinIO, se optar por servir arquivos diretamente. |
| `NEXT_PUBLIC_API_URL` | Exposto diretamente ao cliente/navegador. Deve apontar para a URL pública da sua API (`API_PUBLIC_URL`). |
| `INTERNAL_API_URL` | Endpoint interno de comunicação rápida na rede Docker (utilizado por SSR). Padrão: `http://vestgo-api:3001`. |
| `NEXTAUTH_URL` | Deve apontar exatamente para o seu domínio público de frontend (`APP_PUBLIC_URL`). |
| `AUTH_TRUST_HOST` | Definir estritamente como `true` para sinalizar ao Auth.js a presença do proxy reverso SSL. |
| `TRUST_PROXY` | Definir como `true` no backend para confiar nas requisições reencaminhadas pelo Nginx Proxy Manager. |
| `CORS_ORIGIN` | Lista de origens permitidas sem espaços (ex.: `https://vestgo.seu-dominio.com.br`). |

### 🔐 Segurança & Criptografia
| Variável | Geração / Observações |
| --- | --- |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Chave de criptografia de cookies do Auth.js. Gere uma string longa e aleatória no terminal usando: `openssl rand -base64 33`. |
| `JWT_SECRET` | Assinatura segura de tokens de acesso de curta duração. Use um hash longo e aleatório. |
| `JWT_REFRESH_SECRET` | Assinatura segura dos tokens de refresh. **Deve ser diferente** de `JWT_SECRET`. |
| `TWO_FACTOR_ENCRYPTION_KEY` | **CRÍTICO**: Chave hexadecimal de exatamente 32 bytes (64 caracteres hex) utilizada para criptografar os segredos TOTP no banco de dados. **Gere com o comando no servidor**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

### 🗄️ Bancos de Dados & Cache
| Variável | Observações |
| --- | --- |
| `POSTGRES_DB` | Nome do banco físico a ser criado (ex.: `vestgo`). |
| `POSTGRES_USER` | Usuário proprietário do banco. Evite utilizar `postgres`. |
| `POSTGRES_PASSWORD` | Senha de alta complexidade contendo caracteres especiais. |
| `DATABASE_URL` | String de conexão relacional utilizada pelo Prisma. Padrão: `postgresql://USER:PASSWORD@vestgo-db:5432/DB?schema=public`. |
| `REDIS_PASSWORD` | Senha forte exclusiva do container Redis. |
| `REDIS_URL` | String de conexão do cache. Padrão: `redis://:REDIS_PASSWORD@vestgo-redis:6379`. |

### 📦 MinIO (Object Storage)
| Variável | Observações |
| --- | --- |
| `MINIO_ENDPOINT` | O alias de rede interna configurado no Compose. Padrão: `vestgo-storage`. |
| `MINIO_PORT` | Porta padrão de barramento do S3. Padrão: `9000`. |
| `MINIO_ACCESS_KEY` | Nome do usuário administrador de mídia. |
| `MINIO_SECRET_KEY` | Senha forte de acesso às mídias. |
| `MINIO_BUCKET` | Nome do bucket para gravação física das imagens (ex.: `vestgo-uploads`). |

### 📧 Disparador SMTP
| Variável | Observações |
| --- | --- |
| `EMAIL_ENABLED` | Definir como `true` para ativar o fluxo real de disparo de e-mails transacionais. |
| `SMTP_HOST` | Endereço do servidor SMTP do seu provedor (ex.: `smtp.sendgrid.net`, `smtp.gmail.com`). |
| `SMTP_PORT` | Porta segura do SMTP. Geralmente `465` ou `587`. |
| `SMTP_SECURE` | Definir como `true` para SSL (porta 465) ou `false` para TLS/STARTTLS (porta 587). |
| `SMTP_USER` / `SMTP_PASSWORD` | Credenciais reais de login da sua conta de SMTP. |

---

## 5. Boas Práticas do Banco de Dados e Prevenção de Desastres

A persistência do banco de dados relacional ocorre no volume Docker mapeado `vestgo_db_data`. Este volume sobrevive a rotinas de parada de containers como `docker compose stop` e `docker compose down`. No entanto, cuidados de operação devem ser seguidos à risca:

> [!CAUTION]  
> **Comandos altamente destrutivos a serem evitados em produção:**
> 1. **`docker compose down -v`**: A flag `-v` remove fisicamente todos os volumes anônimos e nomeados atrelados à stack. Executar este comando em produção resultará na **exclusão definitiva de todo o histórico do banco de dados e arquivos do MinIO**.
> 2. **`npx prisma migrate reset`**: Este comando deleta o schema do banco de dados relacional e recria as tabelas do zero. **Nunca execute este comando em ambientes de produção**.
> 3. **`npm run seed:reset`**: Esta rotina limpa todos os dados de doações e usuários antes de popular a massa de testes acadêmica. Deve ser evitada a qualquer custo em servidores públicos ativos.

---

## 6. Procedimento Manual Recomendado de Backup

> [!IMPORTANT]  
> **Aviso Operacional**: Não há rotina automatizada de backup versionada no repositório. Esta seção descreve um procedimento manual recomendado para PostgreSQL e MinIO que o operador do sistema deve executar periodicamente ou integrar a agendadores de tarefas locais do sistema operacional (como o Cron do Linux).

### 6.1 Backup Manual do Banco PostgreSQL
Para extrair um dump de dados estruturado do banco relacional de forma totalmente atômica e segura (sem necessidade de parar a API ou tirar o sistema do ar):

```bash
# Executa o dump do banco de dados para um arquivo local estruturado com data
docker compose -f docker-compose.prod.yml exec vestgo-db \
  pg_dump -U vestgo vestgo > backup-db-$(date +%F).sql
```
*(Nota: Ajuste os valores de usuário e nome de banco conforme suas definições no arquivo `.env`)*

### 6.2 Backup Manual do MinIO (Object Storage)
Os arquivos enviados pelos doadores e perfis operacionais (fotos de capas, avatares e galeria pública) residem no volume Docker nomeado `vestgo_minio_data`. Para realizar um empacotamento completo deste volume de mídias:

```bash
# Cria um container temporário baseado em alpine para empacotar o volume MinIO como tar.gz
docker run --rm \
  -v vestgo_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-minio-$(date +%F).tar.gz /data
```

### 6.3 Salvaguarda das Variáveis de Ambiente
Sempre que editar ou rotacionar chaves críticas no `.env`, faça uma cópia do arquivo `.env` para uma máquina local segura de contingência ou gerenciador de segredos encriptado. O servidor de produção nunca deve ser o único local de armazenamento dessas chaves.

---

## 7. Instruções para o Nginx Proxy Manager (Interface Gráfica)

Ao configurar a terminação SSL no painel administrativo web do Nginx Proxy Manager (porta `81`), adicione duas regras de Proxy Host conforme abaixo:

### Regra 1: Frontend Web
- **Domain Names**: `seu-dominio.com.br` e `www.seu-dominio.com.br`
- **Scheme**: `http`
- **Forward Hostname / IP**: `vestgo-web`
- **Forward Port**: `3000`
- **Websockets Support**: Ativado (`true`)
- **Block Common Exploits**: Ativado (`true`)
- **Aba SSL**: Selecione "Request a new SSL Certificate" (Let's Encrypt), marque "Force SSL" e concorde com os Termos de Serviço.

### Regra 2: API Backend
- **Domain Names**: `api.seu-dominio.com.br`
- **Scheme**: `http`
- **Forward Hostname / IP**: `vestgo-api`
- **Forward Port**: `3001`
- **Block Common Exploits**: Ativado (`true`)
- **Aba SSL**: Selecione "Request a new SSL Certificate" (Let's Encrypt), marque "Force SSL" e concorde com os Termos de Serviço.

---

## 8. Troubleshooting (Solução de Problemas Comuns)

### 8.1 API retornando erro `RefreshAccessTokenError` no navegador
- **Causa**: Geralmente indica que o backend perdeu a conexão com o Redis, ou a chave `TWO_FACTOR_ENCRYPTION_KEY` informada no `.env` foi alterada após a criação inicial da conta do usuário, impedindo a correta descriptografia do segredo.
- **Solução**: Verifique a saúde do Redis com `docker compose -f docker-compose.prod.yml ps`. Se as chaves foram perdidas por alteração das variáveis, será necessário recriar as sessões ou redefinir a chave no `.env`.

### 8.2 Falha ao subir imagem com erro de permissão no MinIO
- **Causa**: O bucket configurado na variável `MINIO_BUCKET` não foi criado automaticamente ou os dados do volume possuem problemas de propriedade de escrita do usuário do container.
- **Solução**: Acesse o console administrativo do MinIO (porta 9001, acessível localmente ou via túnel SSH) usando as credenciais do seu `.env` e certifique-se de que o bucket com o nome exato declarado esteja provisionado.

### 8.3 Retorno 404 em Fluxos de Redefinição de Senha
- **Causa**: As rotas backend `/auth/request-password-reset` e `/auth/reset-password` são estruturalmente ausentes na API Fastify na versão corrente, embora as interfaces de formulários existam no frontend.
- **Solução**: Este é um comportamento esperado e listado como limitação técnica. Para alteração de senhas ativas, use a rota autenticada `/auth/change-password` por meio do painel logado de configurações de conta.
