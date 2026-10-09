import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// One socket connection for the whole app lifetime.
export const socket = io(SERVER_URL, { autoConnect: true });

export function emitAsync(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}
