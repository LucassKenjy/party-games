export default function GameEndedScreen({ scoreboard, onBackToHome }) {
  const sorted = [...scoreboard].sort((a, b) => b.score - a.score);

  return (
    <div className="screen screen--ended">
      <h2>Fim de jogo!</h2>
      <ol className="scoreboard">
        {sorted.map((entry) => (
          <li key={entry.id}>
            {entry.nickname} — {entry.score} pts
          </li>
        ))}
      </ol>
      <button className="btn btn--primary" onClick={onBackToHome}>
        Voltar ao início
      </button>
    </div>
  );
}
