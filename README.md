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
- **Servidores na nuvem:** o Letterboxd fica atrás do Cloudflare, que pode bloquear IPs de datacenter. Se isso acontecer, o botão "Ver com dados de exemplo" continua funcionando (só depende do TMDB).

## Dados de exemplo

Cada aba tem um botão **"Não tem Letterboxd? Ver com dados de exemplo"**, que usa filmes de `frontend/src/demo/dados.js` (filmes reais, notas e datas fictícias, datas relativas a hoje). Os pôsteres vêm do TMDB pelo backend.
Se `VITE_USUARIO_EXEMPLO` estiver definido, aparece também um botão **"Testar com @usuario"**, que busca os dados reais desse perfil.

## Deploy (grátis: Render + Vercel)

**1. Backend na Render**
1. New → Web Service → conecte o repositório.
2. Root Directory: `backend`. Runtime: Docker (usa o `backend/Dockerfile`).
3. Variáveis de ambiente: `TMDB_API_KEY`. A porta vem da variável `PORT` da Render, e o Dockerfile já limita a memória do Java para o plano de 512 MB.
4. Teste: `https://<seu-backend>.onrender.com/api/health` e `/api/sortear?user=<usuario>`.

No plano grátis o serviço dorme após uns 15 min sem uso. A página chama `/api/health` ao abrir e mostra o aviso "Acordando o servidor…" enquanto ele sobe (30–60 s).

**2. Frontend na Vercel**
1. New Project → conecte o repositório. Root Directory: `frontend` (a Vercel detecta Vite sozinha).
2. Variáveis de ambiente:
   - `VITE_API_URL` = `https://<seu-backend>.onrender.com/api`
   - `VITE_USUARIO_EXEMPLO` = seu usuário do Letterboxd (opcional)
3. As variáveis `VITE_*` são lidas no build: se mudar alguma, faça um novo deploy.

## Créditos

Pôsteres e imagens: [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
Projeto pessoal, sem vínculo com o Letterboxd.
