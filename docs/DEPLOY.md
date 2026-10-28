# Deploy do Oráculo

O app é um Next.js 16 com `output: "standalone"`. Ele funciona em **três modos de operação**, e nenhum deles exige configuração obrigatória:

| Modo | Requisitos | Quando usar |
|---|---|---|
| **Demonstração (local)** | nenhum | portfólio, revisão, demo sem custo |
| **LLM + arquivo** | chave de LLM | uso real, sem banco |
| **LLM + Prisma/SQLite** | chave + `DATABASE_URL` | uso real com histórico durável |

> A página `/api/status` informa em tempo real qual motor e qual armazenamento estão ativos.

---

## 1. Verificação rápida (antes de qualquer deploy)

```bash
npm install
npx tsc --noEmit          # contrato de tipos íntegro
npm run build             # build standalone
npm start                 # sobe em 0.0.0.0:3000
```

Teste os endpoints principais:

```bash
curl -s localhost:3000/api/status | jq
curl -s -X POST localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"input":"Prometeu","depth":"completa"}' | head -c 400
```

Ou rode a bateria automatizada:

```bash
npm run smoke             # scripts/smoke.mjs contra ORACLE_URL (default localhost:3000)
```

---

## 2. Variáveis de ambiente

Copie `.env.example`. Resumo:

```bash
# LLM (opcional)
ORACLE_LLM_PROVIDER=openai          # zai | openai | local
ORACLE_LLM_BASE_URL=https://api.openai.com/v1
ORACLE_LLM_API_KEY=sk-...
ORACLE_LLM_MODEL=gpt-4o-mini

# Persistência (opcional)
ORACULO_STORE=file                  # prisma | file (vazio = auto)
ORACULO_DATA_DIR=./.data            # usado pelo adaptador de arquivo
DATABASE_URL="file:../db/custom.db" # usado pelo adaptador Prisma
```

### Observações por plataforma

- **Vercel / serverless:** o sistema de arquivos é efêmero. Use `ORACULO_STORE=prisma` com um banco externo (Turso/libSQL, Postgres com adaptação do schema) **ou** aceite que cache/histórico são por instância. Análises continuam funcionando.
- **Docker / VPS / Fly.io:** monte um volume em `ORACULO_DATA_DIR` para preservar `.data/oraculo.json`, ou use SQLite com volume.
- **Nenhuma chave configurada:** o app sobe em modo local — isso é intencional e é o modo do preview de demonstração.

---

## 3. Docker

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t oraculo .
docker run -p 3000:3000 -e ORACLE_LLM_PROVIDER=local -v oraculo-data:/app/.data oraculo
```

---

## 4. Self-hosted (systemd/pm2)

```bash
npm ci
npm run build
ORACULO_DATA_DIR=/var/lib/oraculo HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
```

Coloque atrás de um reverse proxy (Caddy/Nginx) com HTTPS. Não há allowlist de hosts no modo produção; o app responde a qualquer `Host`, o que é necessário para previews em domínios proxied.

---

## 5. Checklist de pós-deploy

- [ ] `/api/status` responde `ok: true`
- [ ] `engine` é o esperado (`local` em demo, `openai`/`zai` em produção)
- [ ] `/api/catalog` retorna 24 narrativas
- [ ] uma análise completa emite `start` → `agent_*` → `complete` sem `error`
- [ ] `/api/analysis/[id]` devolve o payload e `cached: true`
- [ ] `/api/compare` devolve score e convergências
- [ ] `/api/artwork` devolve um `dataUrl` (PNG do provedor ou SVG local)
- [ ] feedback grava (verifique `/api/analyses?` ou o arquivo `.data/oraculo.json`)

---

## 6. GitHub Pages (edição estática)

O Pages não executa servidor, então o app publicado usa o **motor local no navegador**: `oracle-client.ts` deixa de chamar `/api` e passa a atender cada operação com `src/lib/client-engine.ts`. Nada muda na interface.

```bash
npm run build:pages     # export em ./out (remove src/app/api do build)
npm run verify:pages    # 30 checagens: contrato do motor + artefato
npx serve out           # teste local (abra /oraculo/ se PAGES_BASE_PATH=/oraculo)
```

### Como o build estático funciona

1. `scripts/build-pages.mjs` move `src/app/api` para `.pages-stash/` (o `output: "export"` recusa route handlers com POST/streaming);
2. roda `next build` com `STATIC_EXPORT=1` e `NEXT_PUBLIC_ORACLE_STATIC=1`;
3. restaura a pasta da API **sempre**, inclusive em caso de falha;
4. grava `out/.nojekyll` para o Jekyll não descartar `_next/`;
5. `PAGES_BASE_PATH` define o subcaminho (`/oraculo` para project pages, vazio para `<user>.github.io`).

### Publicação automática

`.github/workflows/deploy-pages.yml` dispara em push para `main` (ou manualmente):

```
checkout → node 22 → npm ci → typecheck → build:pages → verify:pages
        → configure-pages → upload-pages-artifact → deploy-pages
```

**Passo único manual:** *Settings → Pages → Source = **GitHub Actions***.

### O que muda no modo estático

| | servidor | estático |
|---|---|---|
| Análise | rota `/api/analyze` (SSE) | `streamAnalyzeStatic` no navegador |
| Histórico | Prisma/arquivo | `localStorage` (`oraculo:analyses:v1`) |
| Arte | modelo de imagem (opcional) | sigilo SVG determinístico |
| LLM | z.ai/OpenAI/local | sempre local |

Trade-offs: histórico por dispositivo, sem análise generativa e ~1,2 MB de JS no primeiro acesso. Em troca: zero servidor, zero custo por análise, zero chave exposta e nenhuma requisição de rede depois do load.

---

## 7. Custos e limites

- **Modo local:** zero chamadas externas. Uma análise completa é O(n) sobre 24 narrativas — poucos milissegundos.
- **Modo LLM:** 1 chamada para `facts`, 6 em paralelo (stagger de 350 ms), 1 para `parallels` e 1 para o resumo. O código já trata `429` com backoff (5 s/15 s/30 s) e reduz rajadas.
- Para produção multiusuário, adicione **rate limiting por IP/usuário** e cache agressivo por `normalizedInput` (já implementado no repositório).
