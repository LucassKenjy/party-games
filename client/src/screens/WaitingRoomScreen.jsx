import PlayerList from "../components/PlayerList";

const MIN_PLAYERS = 3;

export default function WaitingRoomScreen({ room, selfId, onStartRound }) {
  const isHost = room.hostId === selfId;
  const canStart = room.players.length >= MIN_PLAYERS;

  return (
    <div className="screen screen--waiting">
      <h2>Sala de espera</h2>
      <p className="room-code">
        Código: <strong>{room.code}</strong>
      </p>
      <p className="hint">Compartilhe esse código com seus amigos.</p>

      <PlayerList players={room.players} hostId={room.hostId} selfId={selfId} />

      {isHost ? (
        <>
          <button className="btn btn--primary" onClick={onStartRound} disabled={!canStart}>
            Iniciar partida
          </button>
          {!canStart && <p className="hint">Precisa de pelo menos {MIN_PLAYERS} jogadores.</p>}
        </>
      ) : (
        <p className="hint">Esperando o host iniciar a partida...</p>
      )}
    </div>
  );
}
