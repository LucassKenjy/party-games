import { randomUUID } from "node:crypto";
import { GameError, ErrorCodes } from "./errors.js";
import { pickRandomThemeWord } from "./words.js";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const ROOM_CODE_LENGTH = 5;
const POINTS_FOR_CATCHING_IMPOSTOR = 1;
const POINTS_FOR_IMPOSTOR_ESCAPING = 2;
const MAX_CLUE_LENGTH = 60;

function normalizeNickname(nickname) {
  const trimmed = String(nickname ?? "").trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    throw new GameError(ErrorCodes.INVALID_NICKNAME, "Nickname must be 1-20 characters");
  }
  return trimmed;
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    let code;
    do {
      code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
      ).join("");
    } while (this.rooms.has(code));
    return code;
  }

  getRoomOrThrow(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new GameError(ErrorCodes.ROOM_NOT_FOUND, `Room ${roomCode} not found`);
    }
    return room;
  }

  createRoom(hostNickname) {
    const nickname = normalizeNickname(hostNickname);
    const code = this.generateRoomCode();
    const player = { id: randomUUID(), nickname, connected: true, score: 0 };

    const room = {
      code,
      hostId: player.id,
      players: new Map([[player.id, player]]),
      playerOrder: [player.id],
      status: "waiting",
      round: null,
    };
    this.rooms.set(code, room);
    return { roomCode: code, player };
  }

  joinRoom(roomCode, nickname) {
    const room = this.getRoomOrThrow(roomCode);
    if (room.status !== "waiting") {
      throw new GameError(ErrorCodes.GAME_IN_PROGRESS, "Game already in progress");
    }
    if (room.players.size >= MAX_PLAYERS) {
      throw new GameError(ErrorCodes.ROOM_FULL, "Room is full");
    }
    const player = { id: randomUUID(), nickname: normalizeNickname(nickname), connected: true, score: 0 };
    room.players.set(player.id, player);
    room.playerOrder.push(player.id);
    return player;
  }

  rejoinRoom(roomCode, playerId) {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.get(playerId);
    if (!player) {
      throw new GameError(ErrorCodes.PLAYER_NOT_FOUND, "Player not found in this room");
    }
    player.connected = true;
    return player;
  }

  markDisconnected(roomCode, playerId) {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.get(playerId);
    if (player) player.connected = false;
  }

  /** Removes a player permanently (after reconnect grace period expires). */
  removePlayer(roomCode, playerId) {
    const room = this.getRoomOrThrow(roomCode);
    if (!room.players.has(playerId)) {
      return { roomDeleted: false, newHostId: room.hostId };
    }

    room.players.delete(playerId);
    room.playerOrder = room.playerOrder.filter((id) => id !== playerId);
    if (room.round) {
      room.round.votes.delete(playerId);
    }

    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return { roomDeleted: true, newHostId: null };
    }

    let newHostId = room.hostId;
    if (room.hostId === playerId) {
      newHostId = room.playerOrder[0];
      room.hostId = newHostId;
    }
    return { roomDeleted: false, newHostId };
  }

  startRound(roomCode, requesterId) {
    const room = this.getRoomOrThrow(roomCode);
    if (requesterId !== room.hostId) {
      throw new GameError(ErrorCodes.NOT_HOST, "Only the host can start a round");
    }
    if (room.players.size < MIN_PLAYERS) {
      throw new GameError(ErrorCodes.NOT_ENOUGH_PLAYERS, `Need at least ${MIN_PLAYERS} players`);
    }
    if (room.status !== "waiting" && room.status !== "result") {
      throw new GameError(ErrorCodes.INVALID_STATE, "Round already in progress");
    }

    const { theme, word } = pickRandomThemeWord();
    const impostorId = room.playerOrder[Math.floor(Math.random() * room.playerOrder.length)];

    room.round = {
      theme,
      word,
      impostorId,
      turnOrder: [...room.playerOrder],
      currentTurnIndex: 0,
      clues: [],
      votes: new Map(),
      result: null,
    };
    room.status = "clues";
    return room.round;
  }

  getRoundInfoForPlayer(roomCode, playerId) {
    const room = this.getRoomOrThrow(roomCode);
    if (!room.round) {
      throw new GameError(ErrorCodes.INVALID_STATE, "No round in progress");
    }
    const isImpostor = room.round.impostorId === playerId;
    return {
      role: isImpostor ? "impostor" : "player",
      theme: room.round.theme,
      word: isImpostor ? null : room.round.word,
      turnOrder: [...room.round.turnOrder],
    };
  }

  /** Finds the next player (in turn order) still present in the room, from `fromIndex` onward. */
  findNextTurnIndex(room, fromIndex) {
    for (let i = fromIndex; i < room.round.turnOrder.length; i++) {
      if (room.players.has(room.round.turnOrder[i])) return i;
    }
    return -1;
  }

  getCurrentTurnPlayerId(roomCode) {
    const room = this.getRoomOrThrow(roomCode);
    if (!room.round) return null;
    const index = this.findNextTurnIndex(room, room.round.currentTurnIndex);
    return index === -1 ? null : room.round.turnOrder[index];
  }

  submitClue(roomCode, playerId, clue) {
    const room = this.getRoomOrThrow(roomCode);
    if (!room.round || room.status !== "clues") {
      throw new GameError(ErrorCodes.INVALID_STATE, "Not in the clue-giving phase");
    }
    const turnIndex = this.findNextTurnIndex(room, room.round.currentTurnIndex);
    const currentPlayerId = turnIndex === -1 ? null : room.round.turnOrder[turnIndex];
    if (currentPlayerId !== playerId) {
      throw new GameError(ErrorCodes.NOT_YOUR_TURN, "It is not your turn to give a clue");
    }

    const trimmedClue = String(clue ?? "").trim().slice(0, MAX_CLUE_LENGTH);
    room.round.clues.push({ playerId, clue: trimmedClue });
    room.round.currentTurnIndex = turnIndex + 1;

    const nextIndex = this.findNextTurnIndex(room, room.round.currentTurnIndex);
    const phaseComplete = nextIndex === -1;
    if (phaseComplete) {
      room.status = "voting";
    }
    return {
      clues: [...room.round.clues],
      nextTurnPlayerId: phaseComplete ? null : room.round.turnOrder[nextIndex],
      phaseComplete,
    };
  }

  submitVote(roomCode, voterId, targetId) {
    const room = this.getRoomOrThrow(roomCode);
    if (!room.round || room.status !== "voting") {
      throw new GameError(ErrorCodes.INVALID_STATE, "Not in the voting phase");
    }
    if (room.round.votes.has(voterId)) {
      throw new GameError(ErrorCodes.ALREADY_VOTED, "You already voted this round");
    }
    if (!room.players.has(targetId)) {
      throw new GameError(ErrorCodes.PLAYER_NOT_FOUND, "Vote target is not in this room");
    }

    room.round.votes.set(voterId, targetId);

    if (room.round.votes.size < room.players.size) {
      return { allVoted: false, votesCount: room.round.votes.size, totalPlayers: room.players.size };
    }

    const result = this.computeResult(room);
    room.round.result = result;
    room.status = "result";
    return { allVoted: true, result };
  }

  computeResult(room) {
    const tally = new Map();
    for (const targetId of room.round.votes.values()) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }

    let topTargetId = null;
    let topCount = 0;
    let tied = false;
    for (const [targetId, count] of tally) {
      if (count > topCount) {
        topTargetId = targetId;
        topCount = count;
        tied = false;
      } else if (count === topCount) {
        tied = true;
      }
    }

    // A tie for the most-voted player means the impostor escapes detection.
    const caught = !tied && topTargetId === room.round.impostorId;

    for (const [playerId, player] of room.players) {
      if (caught && playerId !== room.round.impostorId) {
        player.score += POINTS_FOR_CATCHING_IMPOSTOR;
      } else if (!caught && playerId === room.round.impostorId) {
        player.score += POINTS_FOR_IMPOSTOR_ESCAPING;
      }
    }

    return {
      impostorId: room.round.impostorId,
      caught,
      voteTally: Object.fromEntries(tally),
      word: room.round.word,
      theme: room.round.theme,
      scores: this.getScoreboard(room),
    };
  }

  getScoreboard(room) {
    return room.playerOrder.map((id) => {
      const player = room.players.get(id);
      return { id, nickname: player.nickname, score: player.score };
    });
  }

  endGame(roomCode, requesterId) {
    const room = this.getRoomOrThrow(roomCode);
    if (requesterId !== room.hostId) {
      throw new GameError(ErrorCodes.NOT_HOST, "Only the host can end the game");
    }
    const scoreboard = this.getScoreboard(room);
    this.rooms.delete(roomCode);
    return { scoreboard };
  }

  getPublicState(roomCode) {
    const room = this.getRoomOrThrow(roomCode);
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.playerOrder.map((id) => {
        const player = room.players.get(id);
        return { id: player.id, nickname: player.nickname, connected: player.connected, score: player.score };
      }),
      currentTurnPlayerId: room.round ? this.getCurrentTurnPlayerId(roomCode) : null,
      clues: room.round ? [...room.round.clues] : [],
    };
  }
}

export { MIN_PLAYERS, MAX_PLAYERS };
