export default function ResultScreen({ result, room, selfId, onNextRound, onEndGame }) {
  const isHost = room.hostId === selfId;
  const impostor = room.players.find((p) => p.id === result.impostorId);
  const sortedScores = [...result.scores].sort((a, b) => b.score - a.score);

  return (
    <div className="screen screen--result">
      <h2>{result.caught ? "O impostor foi descoberto!" : "O impostor escapou!"}</h2>
      <p>
        O impostor era <strong>{impostor?.nickname ?? "?"}</strong>.
      </p>
      <p className="hint">
        Tema: {result.theme} — Palavra: {result.word}
      </p>

      <h3>Placar</h3>
      <ol className="scoreboard">
        {sortedScores.map((entry) => (
          <li key={entry.id}>
            {entry.nickname} — {entry.score} pts
          </li>
        ))}
      </ol>

      {isHost ? (
        <div className="actions">
          <button className="btn btn--primary" onClick={onNextRound}>
            Próxima rodada
          </button>
          <button className="btn" onClick={onEndGame}>
            Encerrar jogo
          </button>
        </div>
      ) : (
        <p className="hint">Aguardando o host decidir o próximo passo...</p>
      )}
    </div>
  );
}
