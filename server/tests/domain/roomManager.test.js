import { describe, test, expect, beforeEach } from "@jest/globals";
import { RoomManager } from "../../src/domain/RoomManager.js";
import { ErrorCodes } from "../../src/domain/errors.js";

describe("RoomManager", () => {
  let manager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  function createRoomWithPlayers(count) {
    const { roomCode, player: host } = manager.createRoom("Host");
    const players = [host];
    for (let i = 1; i < count; i++) {
      players.push(manager.joinRoom(roomCode, `Player${i}`));
    }
    return { roomCode, players, host };
  }

  test("createRoom creates a room with the host as the only player", () => {
    const { roomCode, player } = manager.createRoom("Alice");
    const state = manager.getPublicState(roomCode);
    expect(state.hostId).toBe(player.id);
    expect(state.players).toHaveLength(1);
    expect(state.status).toBe("waiting");
  });

  test("joinRoom adds a player to an existing room", () => {
    const { roomCode } = manager.createRoom("Alice");
    const bob = manager.joinRoom(roomCode, "Bob");
    const state = manager.getPublicState(roomCode);
    expect(state.players.map((p) => p.nickname)).toEqual(["Alice", "Bob"]);
    expect(bob.nickname).toBe("Bob");
  });

  test("joinRoom throws ROOM_NOT_FOUND for unknown code", () => {
    expect(() => manager.joinRoom("ZZZZZ", "Bob")).toThrow(
      expect.objectContaining({ code: ErrorCodes.ROOM_NOT_FOUND })
    );
  });

  test("joinRoom throws ROOM_FULL at 11th player", () => {
    const { roomCode } = createRoomWithPlayers(10);
    expect(() => manager.joinRoom(roomCode, "Eleventh")).toThrow(
      expect.objectContaining({ code: ErrorCodes.ROOM_FULL })
    );
  });

  test("startRound throws NOT_ENOUGH_PLAYERS with fewer than 3 players", () => {
    const { roomCode, host } = createRoomWithPlayers(2);
    expect(() => manager.startRound(roomCode, host.id)).toThrow(
      expect.objectContaining({ code: ErrorCodes.NOT_ENOUGH_PLAYERS })
    );
  });

  test("startRound throws NOT_HOST when a non-host starts the round", () => {
    const { roomCode, players } = createRoomWithPlayers(3);
    expect(() => manager.startRound(roomCode, players[1].id)).toThrow(
      expect.objectContaining({ code: ErrorCodes.NOT_HOST })
    );
  });

  test("startRound assigns exactly one impostor among the players", () => {
    const { roomCode, players, host } = createRoomWithPlayers(4);
    manager.startRound(roomCode, host.id);

    const roles = players.map((p) => manager.getRoundInfoForPlayer(roomCode, p.id));
    const impostors = roles.filter((r) => r.role === "impostor");
    expect(impostors).toHaveLength(1);
    expect(impostors[0].word).toBeNull();

    const nonImpostors = roles.filter((r) => r.role === "player");
    expect(nonImpostors).toHaveLength(3);
    for (const info of nonImpostors) {
      expect(typeof info.word).toBe("string");
      expect(info.word.length).toBeGreaterThan(0);
    }
  });

  test("submitClue enforces turn order", () => {
    const { roomCode, players, host } = createRoomWithPlayers(3);
    manager.startRound(roomCode, host.id);
    const state = manager.getPublicState(roomCode);
    const outOfTurnPlayer = players.find((p) => p.id !== state.currentTurnPlayerId);

    expect(() => manager.submitClue(roomCode, outOfTurnPlayer.id, "praia")).toThrow(
      expect.objectContaining({ code: ErrorCodes.NOT_YOUR_TURN })
    );
  });

  test("submitClue cycles through all players and then opens voting", () => {
    const { roomCode, players, host } = createRoomWithPlayers(3);
    manager.startRound(roomCode, host.id);

    let result;
    for (let i = 0; i < players.length; i++) {
      const currentId = manager.getCurrentTurnPlayerId(roomCode);
      result = manager.submitClue(roomCode, currentId, `clue-${i}`);
    }

    expect(result.phaseComplete).toBe(true);
    expect(manager.getPublicState(roomCode).status).toBe("voting");
    expect(manager.getPublicState(roomCode).clues).toHaveLength(players.length);
  });

  test("submitVote throws ALREADY_VOTED on a duplicate vote", () => {
    const { roomCode, players, host } = createRoomWithPlayers(3);
    manager.startRound(roomCode, host.id);
    for (const p of players) manager.submitClue(roomCode, manager.getCurrentTurnPlayerId(roomCode), "x");

    manager.submitVote(roomCode, players[0].id, players[1].id);
    expect(() => manager.submitVote(roomCode, players[0].id, players[1].id)).toThrow(
      expect.objectContaining({ code: ErrorCodes.ALREADY_VOTED })
    );
  });

  test("impostor is caught when the majority votes for them", () => {
    const { roomCode, players, host } = createRoomWithPlayers(4);
    manager.startRound(roomCode, host.id);
    for (const p of players) manager.submitClue(roomCode, manager.getCurrentTurnPlayerId(roomCode), "x");

    const impostorInfo = players
      .map((p) => ({ p, info: manager.getRoundInfoForPlayer(roomCode, p.id) }))
      .find((entry) => entry.info.role === "impostor");
    const impostorId = impostorInfo.p.id;
    const others = players.filter((p) => p.id !== impostorId);

    let lastOutcome;
    for (const voter of players) {
      lastOutcome = manager.submitVote(roomCode, voter.id, impostorId);
    }

    expect(lastOutcome.allVoted).toBe(true);
    expect(lastOutcome.result.caught).toBe(true);
    expect(lastOutcome.result.impostorId).toBe(impostorId);

    const scoreboard = lastOutcome.result.scores;
    for (const other of others) {
      expect(scoreboard.find((s) => s.id === other.id).score).toBe(1);
    }
    expect(scoreboard.find((s) => s.id === impostorId).score).toBe(0);
  });

  test("impostor escapes and scores points on a tied vote", () => {
    const { roomCode, players, host } = createRoomWithPlayers(4);
    manager.startRound(roomCode, host.id);
    for (const p of players) manager.submitClue(roomCode, manager.getCurrentTurnPlayerId(roomCode), "x");

    const impostorInfo = players
      .map((p) => ({ p, info: manager.getRoundInfoForPlayer(roomCode, p.id) }))
      .find((entry) => entry.info.role === "impostor");
    const impostorId = impostorInfo.p.id;

    // Split votes 2-2 between two non-impostor players so nobody has a clear majority.
    const nonImpostors = players.filter((p) => p.id !== impostorId);
    manager.submitVote(roomCode, players[0].id, nonImpostors[0].id);
    manager.submitVote(roomCode, players[1].id, nonImpostors[0].id);
    manager.submitVote(roomCode, players[2].id, nonImpostors[1].id);
    const outcome = manager.submitVote(roomCode, players[3].id, nonImpostors[1].id);

    expect(outcome.result.caught).toBe(false);
    expect(outcome.result.scores.find((s) => s.id === impostorId).score).toBe(2);
  });

  test("removePlayer promotes a new host when the host leaves", () => {
    const { roomCode, players, host } = createRoomWithPlayers(3);
    const { newHostId, roomDeleted } = manager.removePlayer(roomCode, host.id);
    expect(roomDeleted).toBe(false);
    expect(newHostId).toBe(players[1].id);
    expect(manager.getPublicState(roomCode).hostId).toBe(players[1].id);
  });

  test("removePlayer deletes the room once the last player leaves", () => {
    const { roomCode, host } = createRoomWithPlayers(1);
    const { roomDeleted } = manager.removePlayer(roomCode, host.id);
    expect(roomDeleted).toBe(true);
    expect(() => manager.getPublicState(roomCode)).toThrow(
      expect.objectContaining({ code: ErrorCodes.ROOM_NOT_FOUND })
    );
  });
});
