import { Server as IOServer, Socket } from "socket.io";
import http from "http";

let io: IOServer;

// ✅ Initialize socket
export const initSocket = (server: http.Server) => {
  io = new IOServer(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("✅ User connected:", socket.id);

    // join conversation room
    socket.on("join", (conversationId: string) => {
      socket.join(conversationId);
    });

    // join personal notification room
    socket.on("join_user", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    // send message
    socket.on("send_message", (data: {
      conversationId: string;
      content: string;
      senderId: string;
    }) => {
      io.to(data.conversationId).emit("new_message", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};

// ✅ access io anywhere
export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};