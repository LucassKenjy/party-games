import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VotingScreen from "../src/screens/VotingScreen";

const room = {
  players: [
    { id: "p0", nickname: "Alice" },
    { id: "p1", nickname: "Bob" },
    { id: "p2", nickname: "Carol" },
  ],
};

describe("VotingScreen", () => {
  test("lists every player except yourself", () => {
    render(<VotingScreen room={room} selfId="p0" onSubmitVote={() => {}} />);
    expect(screen.queryByRole("button", { name: "Alice" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carol" })).toBeInTheDocument();
  });

  test("voting for a player submits the vote and shows a waiting message", () => {
    const onSubmitVote = vi.fn();
    render(<VotingScreen room={room} selfId="p0" onSubmitVote={onSubmitVote} />);

    fireEvent.click(screen.getByRole("button", { name: "Bob" }));

    expect(onSubmitVote).toHaveBeenCalledWith("p1");
    expect(screen.getByText(/Voto registrado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carol" })).not.toBeInTheDocument();
  });
});
