const MESSAGES = {
  ROOM_NOT_FOUND: "Sala não encontrada. Confira o código e tente de novo.",
  ROOM_FULL: "Essa sala já está cheia (máximo 10 jogadores).",
  GAME_IN_PROGRESS: "Essa sala já começou a jogar.",
  NOT_HOST: "Só o host da sala pode fazer isso.",
  NOT_ENOUGH_PLAYERS: "Precisa de pelo menos 3 jogadores para iniciar.",
  PLAYER_NOT_FOUND: "Jogador não encontrado nessa sala.",
  NOT_YOUR_TURN: "Ainda não é a sua vez.",
  ALREADY_VOTED: "Você já votou nessa rodada.",
  INVALID_STATE: "Essa ação não é válida agora.",
  INVALID_NICKNAME: "Digite um apelido válido (1 a 20 caracteres).",
};

export function translateErrorCode(code) {
  return MESSAGES[code] || "Algo deu errado. Tente novamente.";
}
