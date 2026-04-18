import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

export const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    socket.emit("join", conversationId);

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("new_message");
    };
  }, [conversationId]);

  return { messages };
};