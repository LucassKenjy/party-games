# party-games

Site de jogos para jogar com amigos em tempo real — cada um no próprio
celular/computador, sem precisar de tela compartilhada. Primeiro jogo: **Impostor**
(palavra secreta + dicas em turno + votação).

Documentação completa:
- [Spec de design](docs/superpowers/specs/2026-10-09-impostor-game-platform-design.md)
- [Plano de implementação](docs/superpowers/plans/2026-10-09-impostor-game-platform-plan.md)

## Estrutura

- `server/` — Node.js + Express + Socket.IO. Lógica do jogo e das salas.
- `client/` — React + Vite. Interface do jogador. *(em construção)*

## Rodando o server localmente

```bash
cd server
npm install
cp .env.example .env   # opcional: preencher SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

O server sobe em `http://localhost:3001` (`GET /health` para checar se está no ar).

## Testes do server

```bash
cd server
npm test
```
