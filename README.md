# Watchlist & Stuff

Sorteia filmes da sua watchlist do Letterboxd, sorteia entre os que você viu recentemente e gera um story (1080×1920) com os filmes do mês ou do ano, com notas, curtidos e revistos. Pôsteres e banners vêm do TMDB.

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
| `GET /api/diario?user={u}&ano={a}&mes={m}` | Filmes do mês (sem `mes`: do ano). Retorna `{ filmes, incompleto, desde }` |
| `POST /api/imagens` | Pôsteres para uma lista `[{ titulo, ano }]` (usado com o export) |
| `GET /api/imagem?url=` | Repassa pôsteres do TMDB/Letterboxd, para o canvas do story poder exportar |
| `GET /api/health` | Status, e se a chave do TMDB está configurada |

Resposta de filme: `{ titulo, ano, url, posterUrl, bannerUrl, data, nota, revisto, curtido }`. Erros: `{ "erro": "mensagem" }` com status 400, 404 ou 502.

## Limitações conhecidas

- **Diário de meses antigos / ano inteiro:** o RSS do Letterboxd só traz os ~50 registros mais recentes, e as páginas de histórico ficam atrás do Cloudflare. Para qualquer período, importe o export de dados (letterboxd.com/settings/data → Export your data) na aba Diário. O .zip é lido no navegador e fica salvo só no seu navegador.
- **Watchlist via scraping:** se o Letterboxd mudar o HTML, o sorteio da watchlist pode quebrar. Os seletores ficam em `LetterboxdService.postersDa()`.
- A watchlist precisa ser pública.

## Deploy

- **Backend** (Render, Railway…): use o `backend/Dockerfile` e defina `TMDB_API_KEY`.
- **Frontend** (Vercel, Netlify…): `npm run build` e defina `VITE_API_URL` com a URL do backend, por exemplo `https://meu-backend.onrender.com/api`.
