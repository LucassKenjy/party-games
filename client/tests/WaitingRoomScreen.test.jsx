import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WaitingRoomScreen from "../src/screens/WaitingRoomScreen";

function makeRoom(playerCount, overrides = {}) {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i}`,
    nickname: `Player${i}`,
    connected: true,
    score: 0,
  }));
  return { code: "ABCDE", hostId: "p0", status: "waiting", players, ...overrides };
}

describe("WaitingRoomScreen", () => {
  test("shows the room code and every player", () => {
    render(<WaitingRoomScreen room={makeRoom(3)} selfId="p0" onStartRound={() => {}} />);
    expect(screen.getByText("ABCDE")).toBeInTheDocument();
    expect(screen.getByText(/Player0/)).toBeInTheDocument();
    expect(screen.getByText(/Player1/)).toBeInTheDocument();
    expect(screen.getByText(/Player2/)).toBeInTheDocument();
  });

  test("host sees a disabled start button with fewer than 3 players", () => {
    render(<WaitingRoomScreen room={makeRoom(2)} selfId="p0" onStartRound={() => {}} />);
    expect(screen.getByRole("button", { name: /Iniciar partida/ })).toBeDisabled();
  });

  test("host can start the round once there are 3+ players", () => {
    const onStartRound = vi.fn();
    render(<WaitingRoomScreen room={makeRoom(3)} selfId="p0" onStartRound={onStartRound} />);
    const button = screen.getByRole("button", { name: /Iniciar partida/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onStartRound).toHaveBeenCalledTimes(1);
  });

  test("non-host players don't see a start button", () => {
    render(<WaitingRoomScreen room={makeRoom(3)} selfId="p1" onStartRound={() => {}} />);
    expect(screen.queryByRole("button", { name: /Iniciar partida/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Esperando o host/)).toBeInTheDocument();
  });
});
