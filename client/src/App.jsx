import { useEffect, useState } from "react";
import { socket, emitAsync } from "./socket/socketClient";
import { saveSession, loadSession, clearSession } from "./socket/session";
import { translateErrorCode } from "./socket/errorMessages";
import HomeScreen from "./screens/HomeScreen";
import WaitingRoomScreen from "./screens/WaitingRoomScreen";
import RoleRevealScreen from "./screens/RoleRevealScreen";
import CluesScreen from "./screens/CluesScreen";
import VotingScreen from "./screens/VotingScreen";
import ResultScreen from "./screens/ResultScreen";
import GameEndedScreen from "./screens/GameEndedScreen";
import ErrorBanner from "./components/ErrorBanner";
import "./App.css";

export default function App() {
  const [selfId, setSelfId] = useState(null);
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState(null);
  const [revealDismissed, setRevealDismissed] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [finalScoreboard, setFinalScoreboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.on("room_updated", setRoom);
    socket.on("role_assigned", (data) => {
      setRole(data);
      setRevealDismissed(false);
    });
    socket.on("round_result", setRoundResult);
    socket.on("game_ended", (data) => {
      setFinalScoreboard(data.scoreboard);
      setRoom(null);
    });
    socket.on("error", (data) => setError(translateErrorCode(data.code)));

    const session = loadSession();
    if (session) {
      emitAsync("rejoin_room", session).then((res) => {
        if (res?.error) clearSession();
        else setSelfId(session.playerId);
      });
    }

    return () => {
      socket.off("room_updated", setRoom);
      socket.off("role_assigned");
      socket.off("round_result", setRoundResult);
      socket.off("game_ended");
      socket.off("error");
    };
  }, []);

  async function handleCreateRoom(nickname) {
    const res = await emitAsync("create_room", { nickname });
    if (res?.error) return setError(translateErrorCode(res.error));
    setSelfId(res.player.id);
    saveSession(res.roomCode, res.player.id);
  }

  async function handleJoinRoom(roomCode, nickname) {
    const res = await emitAsync("join_room", { roomCode, nickname });
    if (res?.error) return setError(translateErrorCode(res.error));
    setSelfId(res.player.id);
    saveSession(res.roomCode, res.player.id);
  }

  async function handleStartRound() {
    const res = await emitAsync("start_round", {});
    if (res?.error) setError(translateErrorCode(res.error));
  }

  async function handleSubmitClue(clue) {
    const res = await emitAsync("submit_clue", { clue });
    if (res?.error) setError(translateErrorCode(res.error));
  }

  async function handleSubmitVote(targetId) {
    const res = await emitAsync("submit_vote", { targetId });
    if (res?.error) setError(translateErrorCode(res.error));
  }

  async function handleEndGame() {
    const res = await emitAsync("end_game", {});
    if (res?.error) setError(translateErrorCode(res.error));
  }

  function handleBackToHome() {
    clearSession();
    setSelfId(null);
    setRoom(null);
    setRole(null);
    setRoundResult(null);
    setFinalScoreboard(null);
  }

  let screen;
  if (finalScoreboard) {
    screen = <GameEndedScreen scoreboard={finalScoreboard} onBackToHome={handleBackToHome} />;
  } else if (!room) {
    screen = <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  } else if (room.status === "waiting") {
    screen = <WaitingRoomScreen room={room} selfId={selfId} onStartRound={handleStartRound} />;
  } else if (room.status === "clues" && role && !revealDismissed) {
    screen = <RoleRevealScreen role={role} onContinue={() => setRevealDismissed(true)} />;
  } else if (room.status === "clues") {
    screen = <CluesScreen room={room} selfId={selfId} onSubmitClue={handleSubmitClue} />;
  } else if (room.status === "voting") {
    screen = <VotingScreen room={room} selfId={selfId} onSubmitVote={handleSubmitVote} />;
  } else if (room.status === "result" && roundResult) {
    screen = (
      <ResultScreen
        result={roundResult}
        room={room}
        selfId={selfId}
        onNextRound={handleStartRound}
        onEndGame={handleEndGame}
      />
    );
  } else {
    screen = <p>Carregando...</p>;
  }

  return (
    <div className="app">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {screen}
    </div>
  );
}
