const STORAGE_KEY = "party-games-session";

export function saveSession(roomCode, playerId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomCode, playerId }));
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
