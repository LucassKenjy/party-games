# party-games

Site de jogos para jogar com amigos em tempo real — cada um no próprio
celular/computador, sem precisar de tela compartilhada. Primeiro jogo: **Impostor**
(palavra secreta + dicas em turno + votação).

Documentação completa:
- [Spec de design](docs/superpowers/specs/2026-10-09-impostor-game-platform-design.md)
- [Plano de implementação](docs/superpowers/plans/2026-10-09-impostor-game-platform-plan.md)

## Estrutura

- `server/` — Node.js + Express + Socket.IO. Lógica do jogo e das salas.
- `client/` — React + Vite. Interface do jogador.

## Rodando localmente

Em dois terminais:

```bash
cd server
npm install
cp .env.example .env   # opcional: preencher SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
npm run dev             # http://localhost:3001
```

```bash
cd client
npm install
cp .env.example .env   # aponta para o server local por padrão
npm run dev             # http://localhost:5173
```

Abra `http://localhost:5173` em algumas abas (ou peça pros amigos acessarem
pela mesma rede) para simular vários jogadores.

## Testes

```bash
cd server && npm test   # Jest: lógica do jogo + integração via Socket.IO
cd client && npm test   # Vitest: componentes de tela
```
