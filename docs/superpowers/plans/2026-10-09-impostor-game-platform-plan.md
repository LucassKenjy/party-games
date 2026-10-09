# Plano de implementação: Plataforma de jogos — MVP "Impostor"

Spec: [2026-10-09-impostor-game-platform-design.md](../specs/2026-10-09-impostor-game-platform-design.md)

## Estrutura do repositório

```
party-games/
  client/          React + Vite
  server/          Node + Express + Socket.IO
  docs/superpowers/
```

## Etapas

1. **Scaffold do monorepo**
   - `server/`: `npm init`, Express, Socket.IO, Jest, estrutura de pastas
     (`src/domain`, `src/socket`, `src/persistence`).
   - `client/`: Vite + React, estrutura de pastas (`src/screens`,
     `src/socket`, `src/components`).
   - `.gitignore`, `README.md` raiz com instruções de setup.

2. **Domínio do jogo no server (`RoomManager`)** — sem rede, 100% testável.
   - Criar sala (código único), adicionar/remover jogador, promover host.
   - Sortear tema/palavra (lista fixa) e impostor.
   - Controlar ordem de turnos e registrar dicas.
   - Registrar votos, apurar resultado, calcular placar.
   - Testes unitários (Jest) cobrindo cada regra acima.

3. **Camada de Socket.IO**
   - Eventos: `create_room`, `join_room`, `rejoin_room`, `start_round`,
     `submit_clue`, `submit_vote`, `next_round`, `end_game`.
   - Broadcasts correspondentes: `room_updated`, `role_assigned` (privado),
     `clue_submitted`, `round_result`, `host_changed`, `error`.
   - Teste de integração com `socket.io-client` simulando 3+ clientes numa
     rodada completa.

4. **Persistência (Supabase)**
   - Tabelas: `rooms`, `matches`, `rounds` (schema mínimo).
   - `persistMatchResult()` chamado ao fim de cada rodada/partida, assíncrono,
     erros só logados.

5. **Client — telas iniciais**
   - Tela inicial (criar sala / entrar com código).
   - Sala de espera (lista de jogadores em tempo real, código visível,
     botão "Iniciar" para o host).

6. **Client — fluxo de jogo**
   - Revelação de papel (privada).
   - Fase de dicas (input habilitado só na vez do jogador).
   - Fase de votação.
   - Tela de resultado + placar + ações do host (próxima rodada / encerrar).

7. **Reconexão e tratamento de erros**
   - `localStorage` com `roomCode` + `playerId`; `rejoin_room` ao recarregar.
   - Mensagens de erro no client para: sala inválida, sala cheia, partida em
     andamento, ação fora da vez.

8. **Testes de componente no client**
   - React Testing Library para sala de espera e tela de votação.

9. **Teste manual multiplayer**
   - Rodar client + server localmente, abrir 3+ abas/dispositivos na mesma
     rede, jogar uma partida completa de ponta a ponta.

10. **Deploy**
    - `server` no Render/Railway (free tier), variáveis de ambiente do
      Supabase.
    - `client` na Vercel (free tier), apontando para a URL do server.
    - Atualizar README com link de produção.

## Ordem de execução

Etapas 1→4 formam o back-end completo e testável sem UI. Etapas 5→8 constroem
o client por cima dele. Etapa 9 valida o conjunto. Etapa 10 é o fechamento.
Cada etapa termina com um commit próprio.
