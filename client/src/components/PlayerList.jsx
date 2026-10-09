export default function PlayerList({ players, hostId, currentTurnPlayerId, selfId }) {
  return (
    <ul className="player-list">
      {players.map((player) => (
        <li
          key={player.id}
          className={[
            "player-list__item",
            player.id === currentTurnPlayerId ? "player-list__item--current-turn" : "",
            player.connected ? "" : "player-list__item--disconnected",
          ].join(" ").trim()}
        >
          <span className="player-list__name">
            {player.nickname}
            {player.id === selfId ? " (você)" : ""}
            {player.id === hostId ? " 👑" : ""}
          </span>
          <span className="player-list__score">{player.score} pts</span>
        </li>
      ))}
    </ul>
  );
}
