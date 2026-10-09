import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { RoomManager } from "../../src/domain/RoomManager.js";
import { registerSocketHandlers } from "../../src/socket/registerSocketHandlers.js";

function emitAsync(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function waitForEvent(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe("game flow over real sockets", () => {
  let httpServer, io, baseUrl, clients;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    registerSocketHandlers(io, new RoomManager());
    httpServer.listen(() => {
      baseUrl = `http://localhost:${httpServer.address().port}`;
      done();
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  beforeEach(() => {
    clients = [];
  });

  afterEach(() => {
    for (const client of clients) client.close();
  });

  function connectClient() {
    const client = ioClient(baseUrl, { forceNew: true });
    clients.push(client);
    return new Promise((resolve) => client.on("connect", () => resolve(client)));
  }

  test("3 players can join a room and play a full round to a result", async () => {
    const host = await connectClient();
    const p2 = await connectClient();
    const p3 = await connectClient();

    const { roomCode, player: hostPlayer } = await emitAsync(host, "create_room", { nickname: "Host" });
    expect(roomCode).toHaveLength(5);

    const { player: p2Player } = await emitAsync(p2, "join_room", { roomCode, nickname: "P2" });
    const { player: p3Player } = await emitAsync(p3, "join_room", { roomCode, nickname: "P3" });

    const roleEvents = Promise.all([
      waitForEvent(host, "role_assigned"),
      waitForEvent(p2, "role_assigned"),
      waitForEvent(p3, "role_assigned"),
    ]);
    await emitAsync(host, "start_round", {});
    const [hostRole, p2Role, p3Role] = await roleEvents;

    const roles = [hostRole, p2Role, p3Role];
    expect(roles.filter((r) => r.role === "impostor")).toHaveLength(1);

    const sockets = [host, p2, p3];
    const players = [hostPlayer, p2Player, p3Player];
    const socketByPlayerId = new Map(players.map((player, i) => [player.id, sockets[i]]));

    // Submit clues strictly one at a time, in the turn order the server
    // reported, to avoid racing three independent client connections.
    for (const playerId of hostRole.turnOrder) {
      const ack = await emitAsync(socketByPlayerId.get(playerId), "submit_clue", { clue: "dica" });
      expect(ack.ok).toBe(true);
    }

    const resultEvents = Promise.all(sockets.map((s) => waitForEvent(s, "round_result")));
    for (const socket of sockets) {
      const targetId = players[0].id;
      socket.emit("submit_vote", { targetId });
    }
    const results = await resultEvents;

    expect(results[0].impostorId).toBeDefined();
    expect(typeof results[0].caught).toBe("boolean");
  }, 15000);
});
