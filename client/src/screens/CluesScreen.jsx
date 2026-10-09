import { useState } from "react";
import PlayerList from "../components/PlayerList";

export default function CluesScreen({ room, selfId, onSubmitClue }) {
  const [clue, setClue] = useState("");
  const isMyTurn = room.currentTurnPlayerId === selfId;
  const nicknameById = new Map(room.players.map((p) => [p.id, p.nickname]));

  function handleSubmit(event) {
    event.preventDefault();
    if (!clue.trim()) return;
    onSubmitClue(clue.trim());
    setClue("");
  }

  return (
    <div className="screen screen--clues">
      <h2>Rodada de dicas</h2>
      <PlayerList
        players={room.players}
        hostId={room.hostId}
        currentTurnPlayerId={room.currentTurnPlayerId}
        selfId={selfId}
      />

      <ul className="clue-list">
        {room.clues.map((entry, i) => (
          <li key={i}>
            <strong>{nicknameById.get(entry.playerId) ?? "?"}:</strong> {entry.clue}
          </li>
        ))}
      </ul>

      {isMyTurn ? (
        <form onSubmit={handleSubmit} className="form">
          <label>
            Sua dica
            <input
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              maxLength={60}
              autoFocus
              required
            />
          </label>
          <button type="submit" className="btn btn--primary">
            Enviar dica
          </button>
        </form>
      ) : (
        <p className="hint">Aguardando a dica de outro jogador...</p>
      )}
    </div>
  );
}
