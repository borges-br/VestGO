# VestGO Production

## 1. Pre-requisitos

- Servidor Linux com Docker e Docker Compose Plugin
- Nginx Proxy Manager rodando no mesmo host Docker
- Rede externa criada para o NPM:

```bash
docker network create rvproxy_npm_backend_network
```

- Conta no GitHub com permissao para publicar imagens no GHCR
- Stack do VestGO criada no Portainer usando [docker-compose.prod.yml](/C:/Users/natha/.codex/worktrees/aba2/VestGO/docker-compose.prod.yml)

## 2. Preencher o `.env`

Copie [\.env.example](/C:/Users/natha/.codex/worktrees/aba2/VestGO/.env.example) para `.env` e ajuste pelo menos:

- `APP_PUBLIC_URL=https://www.mosfet.com.br`
- `API_PUBLIC_URL=https://api.mosfet.com.br`
- `STORAGE_PUBLIC_URL=https://storage.mosfet.com.br`
- `NEXT_PUBLIC_API_URL=https://api.mosfet.com.br`
- `NEXTAUTH_URL=https://www.mosfet.com.br`
- `CORS_ORIGIN=https://www.mosfet.com.br`
- `AUTH_SECRET` e `NEXTAUTH_SECRET`
- `JWT_SECRET` e `JWT_REFRESH_SECRET`
- `POSTGRES_*`
- `DATABASE_URL`
- `REDIS_PASSWORD` e `REDIS_URL`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` e `MINIO_BUCKET`
- `WEB_IMAGE` e `API_IMAGE`
- `NPM_EXTERNAL_NETWORK=rvproxy_npm_backend_network`

Exemplo de imagens publicadas pelo GitHub Actions:

```env
WEB_IMAGE=ghcr.io/seu-usuario-ou-org/vestgo-web:latest
API_IMAGE=ghcr.io/seu-usuario-ou-org/vestgo-api:latest
```

## 3. Subir producao

Com o `.env` preenchido no servidor:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

O `vestgo-api` executa `prisma migrate deploy` antes de iniciar, entao a trilha de banco fica previsivel em producao.

## 4. Migrations e bootstrap

### Produção

Use o caminho padrao:

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npx prisma migrate deploy
```

### Seed

O seed agora e seguro por padrao e nao apaga dados existentes:

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npm run seed
```

Para reset destrutivo, use apenas em ambiente controlado:

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npm run seed:reset
```

## 5. Nginx Proxy Manager

Conecte o container do NPM na rede `rvproxy_npm_backend_network`.

### Host: `www.mosfet.com.br`

- Forward Hostname / IP: `vestgo-web`
- Forward Port: `3000`
- Scheme: `http`
- Docker network: `rvproxy_npm_backend_network`
- Websockets Support: ligado
- Block Common Exploits: ligado
- Cache Assets: opcional
- SSL: emitir certificado Let's Encrypt e forcar HTTPS

### Host: `api.mosfet.com.br`

- Forward Hostname / IP: `vestgo-api`
- Forward Port: `3001`
- Scheme: `http`
- Docker network: `rvproxy_npm_backend_network`
- Websockets Support: desligado ou ligado, tanto faz para o estado atual
- Block Common Exploits: ligado
- SSL: emitir certificado Let's Encrypt e forcar HTTPS

### Host opcional: `storage.mosfet.com.br`

- Forward Hostname / IP: `vestgo-storage`
- Forward Port: `9000`
- Scheme: `http`
- Docker network: `rvproxy_npm_backend_network`
- Use apenas se voce realmente precisar expor o endpoint S3/publico do MinIO

Observacao:

- Nao exponha a console do MinIO (`9001`) publicamente por padrao
- Se precisar da console, prefira um host administrativo separado e restrito

## 6. Portainer

No Portainer:

1. Crie uma stack usando [docker-compose.prod.yml](/C:/Users/natha/.codex/worktrees/aba2/VestGO/docker-compose.prod.yml)
2. Aponte a stack para o arquivo `.env` do servidor
3. Habilite pull das imagens mais recentes em cada redeploy
4. Gere o webhook da stack
5. Salve o webhook em `PORTAINER_WEBHOOK_URL` nos secrets do GitHub

## 7. GitHub Actions / CI-CD

O workflow [deploy.yml](/C:/Users/natha/.codex/worktrees/aba2/VestGO/.github/workflows/deploy.yml) faz:

1. `lint`, `type-check` e `build` do `web`
2. `lint`, `type-check` e `build` da `api`
3. build e push das imagens para GHCR
4. trigger do webhook do Portainer
5. health check de `www.mosfet.com.br` e `api.mosfet.com.br/health`

Secrets e variables recomendados no GitHub:

- Secret: `PORTAINER_WEBHOOK_URL`
- Variable: `WEB_HEALTHCHECK_URL=https://www.mosfet.com.br`
- Variable: `API_HEALTHCHECK_URL=https://api.mosfet.com.br/health`

## 8. Testar saude da stack

Depois do deploy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs vestgo-api --tail=100
docker compose -f docker-compose.prod.yml logs vestgo-web --tail=100
curl -I https://www.mosfet.com.br
curl https://api.mosfet.com.br/health
```

## 9. Redeploy manual

Sem esperar o GitHub Actions:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Se a mudanca envolver banco:

```bash
docker compose -f docker-compose.prod.yml run --rm vestgo-api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```
