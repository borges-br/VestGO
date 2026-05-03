# VestGO em produção

Este guia explica, passo a passo, como colocar o VestGO no ar em um servidor real. Foi escrito para que alguém com pouca experiência em deploy consiga seguir, sem precisar adivinhar nada. Toda configuração descrita aqui usa o que já existe no repositório — não há invenção de infraestrutura.

> Antes de começar: produção é diferente de desenvolvimento. Em produção você expõe o sistema na internet, lida com domínio, certificado SSL, banco de dados persistente e segredos reais. Erros aqui afetam o sistema "de verdade". Por isso este guia é detalhado e tem avisos antes de cada comando que pode ser destrutivo.

---

## 1. O que significa "colocar em produção"

- **Rodar localmente** = você executa o sistema na sua máquina, ninguém de fora acessa.
- **Rodar em produção** = o sistema fica em um servidor (VPS) acessível pela internet, com domínio próprio, banco persistente e usuários reais.

Em produção você precisa pensar em:

- segurança (segredos, HTTPS, portas);
- persistência (volumes do Docker e backups);
- domínio e certificado SSL;
- monitoramento (logs e healthcheck).

---

## 2. Pré-requisitos

Antes de seguir o passo a passo, garanta:

- Um **servidor Linux** (Ubuntu 22.04+ recomendado) com acesso SSH como usuário com permissão para rodar Docker.
- **Docker** instalado.
- **Plugin do Docker Compose** (`docker compose ...`).
- **Git**.
- Um **domínio** (ex.: `mosfet.com.br`) apontando para o IP do servidor — necessário para HTTPS.
- **Portas abertas no firewall**: 80 e 443 (proxy reverso). As portas 3000 (web), 3001 (api), 9000/9001 (MinIO) não precisam ficar expostas externamente quando você usa um proxy reverso.
- Conta no **GitHub** com permissão para publicar imagens em GHCR (apenas se você usar o pipeline existente).

> Este projeto **assume** o uso de Docker Compose. Não há scripts alternativos para rodar sem container.

---

## 3. Visão geral da implantação

A stack em produção é composta por cinco containers, definidos em [docker-compose.prod.yml](../docker-compose.prod.yml):

| Container | Função |
| --- | --- |
| `vestgo-web` | Frontend Next.js (porta interna 3000) |
| `vestgo-api` | Backend Fastify (porta interna 3001) |
| `vestgo-db` | PostgreSQL com PostGIS |
| `vestgo-redis` | Redis (rate limit, 2FA, setup TOTP) |
| `vestgo-storage` | MinIO (uploads de avatar, capa e galeria) |

Em produção, esses containers ficam em uma rede interna (`vestgo_internal`) e os que precisam de acesso externo (`vestgo-web`, `vestgo-api`, `vestgo-storage`) também participam da rede do proxy reverso (`vestgo_proxy`, externa).

O proxy reverso recomendado pelo `docker-compose.prod.yml` é o **Nginx Proxy Manager (NPM)** rodando no mesmo host Docker, em uma rede externa chamada `rvproxy_npm_backend_network` (ajustável via `NPM_EXTERNAL_NETWORK`).

> Observação: o repositório só fornece o `docker-compose.prod.yml`. Configurar o NPM, Cloudflare ou outro proxy é passo manual descrito mais adiante.

---

## 4. Passo a passo da implantação inicial

Faça login no servidor via SSH antes de começar.

### 4.1 Clonar o repositório

```bash
git clone https://github.com/borges-br/VestGO.git
cd VestGO
```

### 4.2 Criar a rede externa do proxy reverso

Se você for usar Nginx Proxy Manager:

```bash
docker network create rvproxy_npm_backend_network
```

Se a rede já existir (porque o NPM já está rodando), pule esse comando.

### 4.3 Preparar o `.env`

```bash
cp .env.example .env
```

> Aviso: o `.env` é onde ficam os segredos. **Nunca** versione esse arquivo. Já está no `.gitignore`.

Edite o `.env` com cuidado. As variáveis obrigatórias para produção estão na seção 5.

### 4.4 Subir a stack

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

> O `vestgo-api` executa `npx prisma migrate deploy` automaticamente antes de iniciar. Isso aplica as migrations versionadas ao banco.

### 4.5 Validar logs e saúde

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs vestgo-api --tail=200
docker compose -f docker-compose.prod.yml logs vestgo-web --tail=200
```

Saúde básica:

- `vestgo-api` precisa responder em `http://127.0.0.1:3001/health` (acessível dentro da rede Docker).
- `vestgo-web` precisa responder em `http://127.0.0.1:3000/`.
- `vestgo-db` precisa estar `healthy` (ver `pg_isready`).

### 4.6 Configurar o proxy reverso e o domínio

Veja a seção 8.

### 4.7 Testar fluxo principal

- Abra o domínio do frontend e faça cadastro de teste.
- Verifique se o login funciona.
- Tente o wizard de doação.

---

## 5. Variáveis de ambiente

Lista derivada de `.env.example`, `docker-compose.prod.yml` e do código. Em produção você **deve revisar todas**.

> Aviso: nunca cole segredos reais em chats, prints ou Pull Requests. Os exemplos abaixo são placeholders.

### URLs e domínios

| Variável | Para que serve |
| --- | --- |
| `APP_PUBLIC_URL` | URL pública do frontend (ex.: `https://www.seu-dominio.com.br`). |
| `WEB_PUBLIC_URL` | Usada por templates de e-mail para gerar links. Pode ser igual a `APP_PUBLIC_URL`. |
| `API_PUBLIC_URL` | URL pública da API (ex.: `https://api.seu-dominio.com.br`). |
| `STORAGE_PUBLIC_URL` | URL pública do MinIO se for expor (`https://storage.seu-dominio.com.br`). |
| `NEXT_PUBLIC_API_URL` | URL da API exposta ao navegador. Em produção, costuma ser igual a `API_PUBLIC_URL`. |
| `INTERNAL_API_URL` | URL interna usada por SSR. Padrão `http://vestgo-api:3001`. |
| `NEXTAUTH_URL` | Mesma URL do frontend público. |
| `AUTH_TRUST_HOST` | `true` se houver proxy reverso (sempre o caso em produção). |

### Autenticação

| Variável | Observação |
| --- | --- |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Strings longas e aleatórias. |
| `JWT_SECRET` | Aleatório, longo. |
| `JWT_REFRESH_SECRET` | Diferente do `JWT_SECRET`. |
| `JWT_EXPIRES_IN` | Recomendado `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | Recomendado `7d`. |
| `TWO_FACTOR_ENCRYPTION_KEY` | **32 bytes em hex** (64 caracteres). Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

### CORS / proxy

| Variável | Observação |
| --- | --- |
| `CORS_ORIGIN` | Lista de origens (`https://www.seu-dominio.com.br`). Sem espaço entre vírgulas. |
| `TRUST_PROXY` | `true` em produção (atrás de NPM/Cloudflare). |

### Banco

| Variável | Observação |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Definir senha forte. |
| `DATABASE_URL` | `postgresql://USER:PASS@vestgo-db:5432/DB`. |

### Redis

| Variável | Observação |
| --- | --- |
| `REDIS_PASSWORD` | Senha forte. |
| `REDIS_URL` | `redis://:PASSWORD@vestgo-redis:6379`. |

### Storage (MinIO)

| Variável | Observação |
| --- | --- |
| `MINIO_ENDPOINT` | `vestgo-storage` (alias da rede). |
| `MINIO_PORT` | `9000`. |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Trocar dos valores de exemplo. |
| `MINIO_BUCKET` | `vestgo-uploads` (cria automaticamente conforme uso, ou crie manualmente no console). |
| `STORAGE_PUBLIC_URL` | Necessário se você for servir os arquivos publicamente. |

### E-mail

| Variável | Observação |
| --- | --- |
| `EMAIL_ENABLED` | `true` para ligar o envio. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Conforme provedor SMTP. |
| `SMTP_FROM_NAME`, `SMTP_FROM_ADDRESS` | Nome e e-mail do remetente. |
| `EMAIL_VERIFICATION_EXPIRES_MINUTES` | TTL do token de verificação de e-mail. Default 1440 (24h). Já consumido pelas rotas `/auth/request-email-verification` e `/auth/verify-email`. |
| `ACCOUNT_DELETION_EXPIRES_MINUTES` | TTL do token de encerramento de conta. Default 60. Já consumido pelas rotas `/auth/account-deletion/request` e `/auth/account-deletion/confirm`. |
| `PASSWORD_RESET_EXPIRES_MINUTES` | Default 60. Hoje **não** é consumido — as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram implementadas (ver `ARCHITECTURE.md`, seção 9.11). Manter definida é seguro. |

### Geocoding

| Variável | Observação |
| --- | --- |
| `GEOCODING_PROVIDER` | `mapbox` (padrão) ou `nominatim`. |
| `MAPBOX_PUBLIC_TOKEN` / `MAPBOX_SECRET_TOKEN` | Apenas se usar Mapbox. |
| `GEOCODING_BASE_URL`, `GEOCODING_USER_AGENT`, `GEOCODING_ACCEPT_LANGUAGE`, `GEOCODING_COUNTRY_CODES`, `GEOCODING_TIMEOUT_MS`, `GEOCODING_EMAIL` | Defaults razoáveis em `.env.example`. |

### Bootstrap admin (provisório)

| Variável | Observação |
| --- | --- |
| `BOOTSTRAP_ADMIN_EMAIL` | E-mail do admin inicial. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Senha forte. **Remova depois do provisionamento inicial.** |

### Deploy / produção

| Variável | Observação |
| --- | --- |
| `WEB_IMAGE`, `API_IMAGE` | Tags GHCR (ex.: `ghcr.io/seu-usuario/vestgo-web:latest`). |
| `NPM_EXTERNAL_NETWORK` | Nome da rede externa do NPM. |

### CI/CD (GitHub Actions)

| Variável | Onde | Observação |
| --- | --- | --- |
| `PORTAINER_WEBHOOK_URL` | secret | Disparado após publicar imagens. |
| `WEB_HEALTHCHECK_URL` | variable | Default `https://www.mosfet.com.br`. |
| `API_HEALTHCHECK_URL` | variable | Default `https://api.mosfet.com.br/health`. |

---

## 6. Banco de dados

### 6.1 Como o banco sobe

- `vestgo-db` usa a imagem `postgis/postgis:16-3.4-alpine`.
- No primeiro start, ele executa `infra/postgres/init.sql`, que ativa as extensões `uuid-ossp` e `postgis`.
- Os dados ficam no volume Docker `vestgo_db_data`. **Esse volume é persistente** — sobrevive a `docker compose up -d`/`down`. Cuidado ao usar `down -v` (remove volumes).

### 6.2 Migrations

O `vestgo-api` aplica `npx prisma migrate deploy` no startup. Isso é seguro: aplica apenas migrations novas e nunca apaga dados existentes em fluxo normal.

Para rodar manualmente (se precisar conferir):

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npx prisma migrate deploy
```

### 6.3 Seed

```bash
# Seed seguro (não apaga dados existentes)
docker compose -f docker-compose.prod.yml run --rm vestgo-api npm run seed
```

> Aviso: o comando abaixo **apaga** dados antes de popular. Só use em ambiente controlado.

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npm run seed:reset
```

### 6.4 Comandos destrutivos a evitar

- `docker compose down -v` em produção (remove volumes — perde dados).
- `prisma migrate reset` (apaga e recria — proibido em produção).
- `DROP TABLE`, `TRUNCATE`, `DELETE` sem cláusula em sessões SQL diretas.

Antes de qualquer comando destrutivo, faça backup (seção 10).

---

## 7. Storage e arquivos (MinIO)

- `vestgo-storage` (alias do container `vestgo-minio` em compose) é um servidor compatível com S3.
- Bucket padrão: `vestgo-uploads` (variável `MINIO_BUCKET`).
- Volume persistente: `vestgo_minio_data`.
- Console administrativo: porta `9001` dentro do container.

### Recomendações

- **Não exponha o console (9001) publicamente** sem autenticação adicional. Se precisar, crie um host administrativo restrito por IP.
- O endpoint S3 (porta 9000) só precisa ser exposto se você quiser servir uploads diretamente do MinIO ao público.
- Os arquivos enviados pelo backend são gravados nesse bucket. Backup deve incluir o volume `vestgo_minio_data`.

---

## 8. Proxy reverso e domínio

### 8.1 Em linguagem simples

Um **proxy reverso** é um serviço que recebe as requisições HTTPS no seu domínio e redireciona para o container interno certo (frontend ou backend). Sem proxy reverso, você teria que expor portas direto e gerenciar HTTPS em cada container — o que é ruim.

### 8.2 O que o repositório fornece

- `docker-compose.prod.yml` já está preparado para se conectar à rede do proxy reverso (`vestgo_proxy`, externa, configurável via `NPM_EXTERNAL_NETWORK`).
- **Nenhuma configuração do proxy em si está versionada** (não há arquivo de Nginx, NPM ou Caddy). Você precisa configurá-lo manualmente.

### 8.3 Configuração recomendada com Nginx Proxy Manager

Pré-requisito: NPM rodando no mesmo host Docker, conectado em `rvproxy_npm_backend_network`.

#### Host: `www.seu-dominio.com.br` (frontend)

- Forward Hostname / IP: `vestgo-web`
- Forward Port: `3000`
- Scheme: `http`
- Docker network: `rvproxy_npm_backend_network`
- Websockets Support: ligado
- Block Common Exploits: ligado
- SSL: emitir certificado Let's Encrypt e forçar HTTPS

#### Host: `api.seu-dominio.com.br` (backend)

- Forward Hostname / IP: `vestgo-api`
- Forward Port: `3001`
- Scheme: `http`
- Docker network: `rvproxy_npm_backend_network`
- Block Common Exploits: ligado
- SSL: Let's Encrypt + Force HTTPS

#### Host opcional: `storage.seu-dominio.com.br` (MinIO)

Use apenas se realmente precisar expor o endpoint S3 público.

- Forward Hostname / IP: `vestgo-storage`
- Forward Port: `9000`
- Scheme: `http`

### 8.4 Alternativas (não documentadas oficialmente no repo)

Você pode trocar o NPM por Caddy, Traefik ou Nginx puro. **Não há configuração pronta para essas alternativas neste repositório.** Documente sua escolha no `.env` e mantenha o domínio apontando para o servidor.

### 8.5 HTTPS

- Em produção, **sempre** use HTTPS. O Auth.js depende disso para cookies seguros (`NEXTAUTH_URL` deve ser `https://...`).
- Geração de certificado Let's Encrypt é o caminho padrão via NPM.

---

## 9. Segurança mínima para produção

Checklist obrigatório antes de abrir o sistema ao público:

- [ ] **Trocar todos os segredos** (`AUTH_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, senha do Postgres, senha do Redis, credenciais MinIO).
- [ ] **`.env` não versionado** (já está no `.gitignore`).
- [ ] **HTTPS obrigatório** com Let's Encrypt ou equivalente.
- [ ] **Portas fechadas no firewall**: somente 80, 443 e SSH abertos publicamente.
- [ ] **CORS revisado**: `CORS_ORIGIN` lista apenas os domínios reais do projeto.
- [ ] **`TRUST_PROXY=true`** quando atrás de proxy.
- [ ] **Console do MinIO não exposto** publicamente sem proteção.
- [ ] **Bootstrap admin removido** após a primeira criação (`BOOTSTRAP_ADMIN_*` em branco ou comentado).
- [ ] **Backups configurados** (seção 10).
- [ ] **Logs revisados regularmente** (seção 11).
- [ ] **Atualizações**: revisar dependências e imagens base periodicamente.

---

## 10. Backups

> Aviso: backup é responsabilidade operacional. O repositório **não fornece** scripts ou cron de backup automático. Implementar isso é uma pendência (ver `ARCHITECTURE.md`, seção 12).

### 10.1 O que precisa ser salvo

- **Banco PostgreSQL** (volume `vestgo_db_data`).
- **Arquivos enviados** (volume `vestgo_minio_data`).
- **Arquivo `.env`** do servidor (em local seguro, fora do servidor).

### 10.2 Backup do Postgres (manual)

```bash
docker compose -f docker-compose.prod.yml exec vestgo-db \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%F).sql
```

Recomendações:

- Rodar diariamente no início.
- Armazenar fora do servidor (S3/Backblaze/Wasabi/etc.).
- Testar a restauração ao menos uma vez em ambiente separado.

### 10.3 Backup do MinIO (manual)

Opção simples: copiar o volume Docker.

```bash
docker run --rm \
  -v vestgo_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-$(date +%F).tar.gz /data
```

Opção mais limpa: usar `mc` (cliente MinIO) com replicação ou `mc mirror` para um bucket remoto.

### 10.4 Frequência recomendada

- Postgres: diário, retenção mínima de 7 dias.
- MinIO: diário, retenção mínima de 7 dias.
- `.env`: após cada alteração relevante, manter cópia segura fora do servidor.

### 10.5 Restauração (em alto nível)

- Postgres: subir o backup com `psql` em uma instância nova/limpa.
- MinIO: extrair o tar para um volume novo e apontar `vestgo-storage` para ele.
- Validar antes de virar tráfego: rodar a stack em outra porta/domínio temporário e testar.

---

## 11. Comandos úteis no dia a dia

| Ação | Comando |
| --- | --- |
| Subir stack | `docker compose -f docker-compose.prod.yml up -d` |
| Atualizar imagens e reiniciar | `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d` |
| Parar stack | `docker compose -f docker-compose.prod.yml stop` |
| Reiniciar um serviço | `docker compose -f docker-compose.prod.yml restart vestgo-api` |
| Ver logs (últimas 100) | `docker compose -f docker-compose.prod.yml logs vestgo-api --tail=100` |
| Logs ao vivo | `docker compose -f docker-compose.prod.yml logs vestgo-api -f` |
| Listar containers | `docker compose -f docker-compose.prod.yml ps` |
| Acessar shell de um container | `docker compose -f docker-compose.prod.yml exec vestgo-api sh` |
| Aplicar migrations manualmente | `docker compose -f docker-compose.prod.yml run --rm vestgo-api npx prisma migrate deploy` |
| Verificar healthcheck do backend | `curl https://api.seu-dominio.com.br/health` |

> Aviso: `docker compose down` (sem `-v`) para a stack mas mantém volumes. **Nunca** rode `down -v` em produção sem ter backup atual e ter certeza do que está fazendo.

---

## 12. Checklist de produção

Antes de considerar o ambiente "no ar":

- [ ] Domínio aponta para o servidor.
- [ ] Certificado HTTPS ativo nos hosts `www` e `api`.
- [ ] Variáveis de ambiente revisadas e únicas (sem reuso dos exemplos).
- [ ] Banco persistente (volume montado, healthcheck OK).
- [ ] Storage persistente (volume MinIO).
- [ ] Backups configurados ou pelo menos com plano manual definido.
- [ ] `CORS_ORIGIN` apenas com os domínios reais.
- [ ] Logs revisados (sem stack traces no startup).
- [ ] Frontend acessível e renderiza a landing.
- [ ] Backend responde em `/health`.
- [ ] Cadastro, login e wizard de doação testados ponta a ponta.
- [ ] Bootstrap admin já usado e env removida.

---

## 13. Troubleshooting (problemas comuns)

### Container não sobe

- Veja os logs: `docker compose -f docker-compose.prod.yml logs <serviço> --tail=200`.
- Erro mais comum: variável de ambiente faltando.

### Erro de porta ocupada

- Verifique se outro container/serviço já usa a porta. `docker ps`, `lsof -i:3000`.

### Erro de conexão com banco

- Verifique se `vestgo-db` está `healthy`.
- `DATABASE_URL` precisa apontar para `vestgo-db:5432` (e não `localhost`).

### Erro de variável ausente

- `.env` no diretório certo do compose? Por padrão o Docker Compose lê o `.env` no mesmo diretório do `docker-compose.prod.yml`.

### Frontend não chama backend

- Sintoma: `/api/backend/...` retorna 503 ou erros de CORS.
- Causas: `INTERNAL_API_URL` apontando para nome errado, `vestgo-api` ainda iniciando, ou `NEXT_PUBLIC_API_URL` errado.

### Erro de CORS

- Confira `CORS_ORIGIN` (sem espaços, com protocolo `https://`).
- Confirme que `AUTH_TRUST_HOST=true` e `TRUST_PROXY=true` quando atrás de proxy.

### Upload não funciona

- MinIO `vestgo-storage` precisa estar saudável e o `MINIO_BUCKET` precisa existir. Crie pelo console na porta 9001 (acessível por túnel SSH se não exposto).
- Verifique `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` no backend.

### Erro 500 no backend

- Logs: `docker compose -f docker-compose.prod.yml logs vestgo-api --tail=200`.
- Problemas comuns: env mal formatada, banco indisponível, segredo JWT ausente.

### Erro 404 em fluxos de redefinição de senha

- Esperado hoje: as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram implementadas no backend (ver `ARCHITECTURE.md`, seção 9.11). Verificação de e-mail e encerramento de conta já funcionam.

### Domínio não aponta

- `dig A seu-dominio.com.br` deve retornar o IP do servidor. Se não, ajuste DNS.

### Certificado SSL não funciona

- Verifique se as portas 80 e 443 estão abertas no firewall do servidor e se o domínio resolve corretamente antes de pedir o certificado.
- Logs do NPM costumam dizer exatamente o motivo da falha.

---

## 14. Limitações atuais da produção

- **Backups não automatizados** — política precisa ser implementada.
- **Sem CI/CD para staging separado** — só há deploy direto para produção via Portainer.
- **Sem monitoramento centralizado** — apenas logs de container.
- **Sem WAF/IDS** dedicado — depende do que estiver na frente do NPM.
- **Fluxo de redefinição de senha não funciona por completo** — UI e cliente HTTP existem, mas as rotas `/auth/request-password-reset` e `/auth/reset-password` ainda não foram criadas no backend.

---

## 15. Recomendações futuras (não aplicadas ainda)

- CI/CD para ambiente de staging separado.
- Backups automatizados de Postgres e MinIO com retenção configurável.
- Monitoramento centralizado (Grafana, Loki, Datadog ou similar).
- Healthchecks adicionais por endpoint funcional, não só `/health`.
- Política de rotação de segredos (especialmente `TWO_FACTOR_ENCRYPTION_KEY`).
- Separar imagens de runtime para staging e production no GHCR.
- Política de alertas para falhas de envio de e-mail.

---

## 16. Pipeline existente (referência)

`.github/workflows/deploy.yml` faz:

1. `web-quality`: `lint`, `type-check`, `build` em `web/`.
2. `api-quality`: idem em `api/`.
3. `publish-images`: build e push para `ghcr.io/<owner>/vestgo-web` e `vestgo-api` com tags `:latest` e `:sha-<commit>`.
4. `deploy-production`: dispara webhook do Portainer (segredo `PORTAINER_WEBHOOK_URL`).
5. `post-deploy-healthcheck`: faz `curl` em `WEB_HEALTHCHECK_URL` e `API_HEALTHCHECK_URL` com retry.

Os jobs de publicação e deploy só rodam em `push`/`workflow_dispatch`, não em pull request.
