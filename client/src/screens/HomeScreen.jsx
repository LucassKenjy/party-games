import { useState } from "react";

export default function HomeScreen({ onCreateRoom, onJoinRoom }) {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("join"); // "join" | "create"

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === "create") {
      onCreateRoom(nickname);
    } else {
      onJoinRoom(roomCode.trim().toUpperCase(), nickname);
    }
  }

  return (
    <div className="screen screen--home">
      <h1>Impostor</h1>
      <p className="subtitle">Jogue com seus amigos, cada um no próprio celular.</p>

      <div className="tabs">
        <button
          type="button"
          className={mode === "join" ? "tab tab--active" : "tab"}
          onClick={() => setMode("join")}
        >
          Entrar numa sala
        </button>
        <button
          type="button"
          className={mode === "create" ? "tab tab--active" : "tab"}
          onClick={() => setMode("create")}
        >
          Criar sala
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Seu apelido
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            required
            placeholder="Ex: Lucas"
          />
        </label>

        {mode === "join" && (
          <label>
            Código da sala
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={5}
              required
              placeholder="Ex: AB3XZ"
              style={{ textTransform: "uppercase" }}
            />
          </label>
        )}

        <button type="submit" className="btn btn--primary">
          {mode === "create" ? "Criar sala" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
