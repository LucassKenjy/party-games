# Design: Plataforma de jogos com amigos — MVP "Impostor"

**Data:** 2026-10-09
**Status:** Aprovado

## Contexto e objetivo

Lucas quer um site onde ele e os amigos joguem jogos de grupo tipo "Jackbox": alguém
cria uma sala, os amigos entram pelo próprio celular/computador usando um código, e
jogam juntos em tempo real — sem precisar de uma tela compartilhada.

A ideia final inclui vários jogos (Impostor, Palpite Certo, Quem Sou Eu, etc), mas
este escopo cobre só o primeiro: a base da plataforma (salas, entrada por código,
tempo real) construída em torno de **um jogo completo, o Impostor**. Os outros jogos
serão módulos adicionados depois, reaproveitando a mesma base de salas.

Serve também como peça de portfólio para processos de estágio em TI — por isso a
stack prioriza tecnologias procuradas no mercado (Node.js, Socket.IO, React,
Postgres/Supabase) e um código organizado o suficiente para ser mostrado em entrevista.

## Fora do escopo (deixado para depois)

- Jogos "Palpite Certo", "Quem Sou Eu" e qualquer outro além do Impostor.
- Login/conta de usuário (Supabase Auth). MVP usa só apelido + código de sala.
- Histórico de estatísticas por usuário entre partidas diferentes (o placar existe
  só durante a partida ativa).
- Tela compartilhada (modo "TV + celular como controle"). Todos jogam pelo próprio
  dispositivo.

## Arquitetura

Monorepo com dois pacotes:

- **`/client`** — React + Vite. Interface do jogador: tela inicial, sala de espera,
  tela de jogo.
- **`/server`** — Node.js + Express + Socket.IO. Dono da lógica do jogo e do estado
  de cada sala.

O estado "vivo" de uma partida (quem está na sala, de quem é a vez, quem é o
impostor, placar da partida atual) fica **em memória no processo do server**, numa
classe `RoomManager`. Isso evita round-trips a banco de dados no meio da partida e
simplifica bastante a lógica de turnos.

**Supabase (Postgres)** é usado só para persistência fora do caminho crítico do jogo:
registro de salas criadas e resultados de partidas finalizadas, grafado de forma
assíncrona (fire-and-forget) depois que uma partida termina. Não guarda contas de
usuário nesta fase.

**Deploy:**
- `client`: Vercel (free tier) — é só um build estático de SPA.
- `server`: Render ou Railway (free tier) — precisa de processo long-running com
  WebSocket, o que não roda bem em função serverless da Vercel.
- `Supabase`: projeto free tier, acessado só pelo server (service role key nunca vai
  pro client).

## Componentes

### Server

- **`RoomManager`** (módulo de domínio, sem Socket.IO): cria sala, adiciona/remove
  jogador, sorteia tema/palavra e impostor, controla ordem de turnos, apura votos,
  calcula placar. Testável isoladamente, sem rede.
- **Socket handlers** (camada fina sobre o `RoomManager`): traduzem eventos de
  socket em chamadas ao `RoomManager` e broadcasts para a sala.
  - `create_room` → cria sala, retorna código.
  - `join_room` → entra na sala, broadcast da lista de jogadores atualizada.
  - `start_round` → sorteia papéis, emite papel **privado** pra cada socket (evento
    direto ao socket do jogador, nunca broadcast pra sala).
  - `submit_clue` → valida que é a vez do jogador, registra dica, broadcast da dica.
  - `submit_vote` → registra voto privado; quando todos votaram, apura e faz
    broadcast do resultado.
- **Camada de persistência**: função `persistMatchResult()` chamada no fim de cada
  partida, grava no Supabase sem bloquear o fluxo do jogo (erros de persistência só
  logam, não afetam a partida).

### Client

- **Tela inicial**: criar sala (define apelido do host) ou entrar em sala existente
  (apelido + código).
- **Sala de espera**: lista de jogadores em tempo real, código da sala visível para
  compartilhar, botão "Iniciar" visível só para o host (habilitado a partir de 3
  jogadores).
- **Tela de jogo**: 3 sub-estados controlados por evento do servidor, não por rota:
  - *Revelação de papel*: mostra a palavra/tema, ou "Você é o Impostor" — some após
    o jogador confirmar que viu.
  - *Dicas*: mostra de quem é a vez e o histórico de dicas da rodada; input de dica
    habilitado só na vez do próprio jogador.
  - *Votação*: lista de jogadores pra votar; some ao votar, mostra "aguardando os
    outros".
- **Tela de resultado**: quem era o impostor, se foi descoberto, placar atualizado,
  botão "Próxima rodada" (host) ou "Encerrar jogo".

## Fluxo do jogo

1. Host cria sala → server gera código (4-5 letras, sem caracteres ambíguos) → sala
   de espera.
2. Amigos entram com código + apelido → server valida (sala existe? tem vaga até
   10? já começou?) → lista de jogadores atualiza em tempo real pra todos.
3. Host aperta "Iniciar" (mín. 3 jogadores) → server sorteia tema/palavra de uma
   lista fixa e sorteia 1 impostor → emite papel privado a cada jogador.
4. Fase de dicas: ordem de turno fixa (ordem de entrada na sala); server só aceita
   `submit_clue` do jogador da vez; cada dica entra no histórico e é transmitida a
   todos. Dura 1 volta completa (cada jogador dá 1 dica).
5. Votação: todos votam simultaneamente (voto não é visível até todos votarem);
   quando o último voto chega, server apura.
6. Resultado: se a maioria votou no impostor real, os não-impostores ganham pontos;
   senão o impostor ganha pontos. Placar acumula entre rodadas da mesma partida.
   Server persiste o resultado da rodada no Supabase (assíncrono).
7. Host decide: nova rodada (volta ao passo 3, mesma sala/jogadores) ou encerrar
   (fecha a sala, persiste resultado final).

## Tratamento de erros

- **Desconexão de jogador durante a partida**: o client guarda `roomCode` +
  `playerId` no `localStorage`; ao reconectar (refresh, queda de rede), tenta
  `rejoin_room` com esse `playerId`. Server mantém a vaga por um período de
  tolerância (ex.: 60s) antes de remover o jogador definitivamente.
- **Código de sala inválido / sala cheia / partida já em andamento**: `join_room`
  retorna erro específico, client mostra mensagem correspondente sem travar a tela.
- **Host desconecta**: server promove o próximo jogador da lista a host
  automaticamente e avisa a sala.
- **Ação fora de ordem** (ex.: dica fora da vez, voto duplicado): server ignora e
  retorna erro ao socket que tentou, sem afetar o resto da sala.

## Testes

- **Server (unitário)**: `RoomManager` testado isoladamente com Jest — sorteio de
  impostor, validação de turno, apuração de votos, cálculo de placar — sem precisar
  de conexão de socket real.
- **Server (integração)**: teste com `socket.io-client` simulando 3+ clientes
  conectando, entrando na mesma sala e completando uma rodada inteira, verificando
  os eventos recebidos por cada um.
- **Client (componente)**: React Testing Library para sala de espera e tela de
  votação (os pontos com mais lógica condicional).
- **Manual**: múltiplas abas do navegador (ou dispositivos diferentes na mesma
  rede) para validar a experiência multiplayer real antes de cada entrega.

## Decisões já validadas com o usuário

- Formato: cada jogador no próprio dispositivo (sem tela compartilhada).
- Primeiro jogo a construir: Impostor.
- Mecânica do Impostor: palavra secreta + dicas em turno + votação.
- Salas de 3 a 10 jogadores, placar acumulado entre rodadas da mesma partida.
- Sem login — só apelido + código de sala.
- Stack: React (client) + Node.js/Socket.IO (server) + Supabase (persistência).
- Uso duplo: jogar com amigos e servir de peça de portfólio para estágio.
