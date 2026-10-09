import { GameError, ErrorCodes } from "../domain/errors.js";
import { persistMatchResult } from "../persistence/persistMatchResult.js";

const RECONNECT_GRACE_PERIOD_MS = 60_000;

/**
 * Wires Socket.IO events to a RoomManager instance. Kept separate from
 * RoomManager so the game logic stays testable without a network layer.
 */
export function registerSocketHandlers(io, roomManager) {
  // socket.id -> { roomCode, playerId }
  const socketSessions = new Map();
  // playerId -> Timeout, used for the reconnect grace period
  const pendingRemovals = new Map();

  function emitError(socket, error) {
    if (error instanceof GameError) {
      socket.emit("error", { code: error.code, message: error.message });
    } else {
      socket.emit("error", { code: ErrorCodes.INVALID_STATE, message: "Unexpected server error" });
      console.error(error);
    }
  }

  function broadcastRoomState(roomCode) {
    io.to(roomCode).emit("room_updated", roomManager.getPublicState(roomCode));
  }

  function clearPendingRemoval(playerId) {
    const timeout = pendingRemovals.get(playerId);
    if (timeout) {
      clearTimeout(timeout);
      pendingRemovals.delete(playerId);
    }
  }

  io.on("connection", (socket) => {
    socket.on("create_room", ({ nickname } = {}, callback) => {
      try {
        const { roomCode, player } = roomManager.createRoom(nickname);
        socket.join(roomCode);
        socketSessions.set(socket.id, { roomCode, playerId: player.id });
        callback?.({ roomCode, player });
        broadcastRoomState(roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("join_room", ({ roomCode, nickname } = {}, callback) => {
      try {
        const player = roomManager.joinRoom(roomCode, nickname);
        socket.join(roomCode);
        socketSessions.set(socket.id, { roomCode, playerId: player.id });
        callback?.({ roomCode, player });
        broadcastRoomState(roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("rejoin_room", ({ roomCode, playerId } = {}, callback) => {
      try {
        const player = roomManager.rejoinRoom(roomCode, playerId);
        socket.join(roomCode);
        socketSessions.set(socket.id, { roomCode, playerId: player.id });
        clearPendingRemoval(playerId);
        callback?.({ roomCode, player });
        broadcastRoomState(roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("start_round", (_payload, callback) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      try {
        roomManager.startRound(session.roomCode, session.playerId);
        const memberSocketIds = io.sockets.adapter.rooms.get(session.roomCode) ?? [];
        for (const socketId of memberSocketIds) {
          const memberSession = socketSessions.get(socketId);
          if (!memberSession) continue;
          const roleInfo = roomManager.getRoundInfoForPlayer(session.roomCode, memberSession.playerId);
          io.to(socketId).emit("role_assigned", roleInfo);
        }
        callback?.({ ok: true });
        broadcastRoomState(session.roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("submit_clue", ({ clue } = {}, callback) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      try {
        const result = roomManager.submitClue(session.roomCode, session.playerId, clue);
        io.to(session.roomCode).emit("clue_submitted", result);
        callback?.({ ok: true });
        broadcastRoomState(session.roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("submit_vote", ({ targetId } = {}, callback) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      try {
        const outcome = roomManager.submitVote(session.roomCode, session.playerId, targetId);
        if (outcome.allVoted) {
          io.to(session.roomCode).emit("round_result", outcome.result);
          persistMatchResult(session.roomCode, outcome.result).catch((error) => console.error(error));
        }
        callback?.({ ok: true });
        broadcastRoomState(session.roomCode);
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("end_game", (_payload, callback) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      try {
        const { scoreboard } = roomManager.endGame(session.roomCode, session.playerId);
        io.to(session.roomCode).emit("game_ended", { scoreboard });
        callback?.({ ok: true });
      } catch (error) {
        emitError(socket, error);
        callback?.({ error: error.code ?? ErrorCodes.INVALID_STATE });
      }
    });

    socket.on("disconnect", () => {
      const session = socketSessions.get(socket.id);
      socketSessions.delete(socket.id);
      if (!session) return;

      try {
        roomManager.markDisconnected(session.roomCode, session.playerId);
        broadcastRoomState(session.roomCode);
      } catch {
        return; // Room no longer exists; nothing to clean up.
      }

      const timeout = setTimeout(() => {
        try {
          const { roomDeleted, newHostId } = roomManager.removePlayer(session.roomCode, session.playerId);
          pendingRemovals.delete(session.playerId);
          if (!roomDeleted) {
            io.to(session.roomCode).emit("host_changed", { hostId: newHostId });
            broadcastRoomState(session.roomCode);
          }
        } catch {
          // Room already gone.
        }
      }, RECONNECT_GRACE_PERIOD_MS);
      timeout.unref?.(); // Don't let a pending reconnect window keep the process (or test runner) alive.
      pendingRemovals.set(session.playerId, timeout);
    });
  });
}
