import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { RoomManager } from "./domain/RoomManager.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`party-games server listening on port ${PORT}`);
});
