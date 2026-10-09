import { supabase } from "./supabaseClient.js";

/**
 * Fire-and-forget: persists a finished round's result for history/stats.
 * Never throws — a persistence failure must not affect the live game.
 */
export async function persistMatchResult(roomCode, result) {
  if (!supabase) {
    console.log(`[persistence] Supabase not configured, skipping save for room ${roomCode}`);
    return;
  }

  const { error } = await supabase.from("rounds").insert({
    room_code: roomCode,
    impostor_player_id: result.impostorId,
    caught: result.caught,
    word: result.word,
    theme: result.theme,
    vote_tally: result.voteTally,
    scores: result.scores,
  });

  if (error) {
    console.error(`[persistence] Failed to save round for room ${roomCode}:`, error.message);
  }
}
