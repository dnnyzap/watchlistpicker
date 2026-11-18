# 🎬 Watchlist & Stuff

Sorteia filmes da sua watchlist do Letterboxd, sorteia entre os que você viu recentemente e mostra o diário de um mês, com pôster e banner vindos do TMDB.

```
backend/    Spring Boot 4.1 (Java 21) — scraping do Letterboxd + RSS + API do TMDB
frontend/   React 19 + Vite — 3 abas: Watchlist, Recentes, Diário
docker-compose.yml
```

## Configuração

Copie `.env.example` para `.env` na raiz e coloque sua chave do TMDB (https://www.themoviedb.org/settings/api).
Funciona com a "API Key" (v3) ou com o "API Read Access Token" (v4). Sem chave, a app funciona, mas os filmes da watchlist ficam sem pôster.

## Rodando em desenvolvimento

Dois terminais:

```bash
# 1) backend  → http://localhost:8080
cd backend
./mvnw spring-boot:run        # no Windows/PowerShell: .\mvnw.cmd spring-boot:run

# 2) frontend → http://localhost:5173
cd frontend
npm install
npm run dev
```

O backend lê o `.env` da raiz sozinho. O Vite repassa `/api` para `localhost:8080`.

## Rodando com Docker

```bash
docker compose up --build
```

Frontend em http://localhost, API em http://localhost:8080/api. O nginx do frontend repassa `/api` para o backend.

## API

| Rota | O que faz |
|------|-----------|
| `GET /api/sortear?user={u}` | Sorteia um filme da watchlist (todas as páginas) |
| `GET /api/sortear-recente?user={u}` | Sorteia entre os filmes do RSS (os ~50 registros mais recentes) |
| `GET /api/diario?user={u}&ano={a}&mes={m}` | Filmes registrados no diário naquele mês |
| `GET /api/health` | Status, e se a chave do TMDB está configurada |

Resposta de filme: `{ titulo, ano, url, posterUrl, bannerUrl }`. Erros: `{ "erro": "mensagem" }` com status 400, 404 ou 502.

## Limitações conhecidas

- **Diário de meses antigos:** o RSS do Letterboxd só traz os ~50 registros mais recentes, e as páginas do diário (`/diary/for/ANO/MES/`) ficam atrás do Cloudflare, que bloqueia a maioria das requisições. Para meses fora do RSS, a API tenta a página e devolve um erro explicativo quando é bloqueada.
- **Watchlist via scraping:** se o Letterboxd mudar o HTML, o sorteio da watchlist pode quebrar. Os seletores ficam em `LetterboxdService.postersDa()`.
- A watchlist precisa ser pública.

## Deploy

- **Backend** (Render, Railway…): use o `backend/Dockerfile` e defina `TMDB_API_KEY`.
- **Frontend** (Vercel, Netlify…): `npm run build` e defina `VITE_API_URL` com a URL do backend, por exemplo `https://meu-backend.onrender.com/api`.
