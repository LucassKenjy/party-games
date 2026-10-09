export class GameError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}

export const ErrorCodes = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  GAME_IN_PROGRESS: "GAME_IN_PROGRESS",
  NOT_HOST: "NOT_HOST",
  NOT_ENOUGH_PLAYERS: "NOT_ENOUGH_PLAYERS",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  ALREADY_VOTED: "ALREADY_VOTED",
  INVALID_STATE: "INVALID_STATE",
  INVALID_NICKNAME: "INVALID_NICKNAME",
};
