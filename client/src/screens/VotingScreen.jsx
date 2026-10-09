import { useState } from "react";

export default function VotingScreen({ room, selfId, onSubmitVote }) {
  const [votedFor, setVotedFor] = useState(null);

  function handleVote(targetId) {
    setVotedFor(targetId);
    onSubmitVote(targetId);
  }

  return (
    <div className="screen screen--voting">
      <h2>Quem é o impostor?</h2>

      {votedFor ? (
        <p className="hint">Voto registrado. Aguardando os outros jogadores...</p>
      ) : (
        <ul className="vote-list">
          {room.players
            .filter((p) => p.id !== selfId)
            .map((player) => (
              <li key={player.id}>
                <button className="btn" onClick={() => handleVote(player.id)}>
                  {player.nickname}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
