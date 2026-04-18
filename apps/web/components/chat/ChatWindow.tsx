"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

export default function ChatWindow({ conversationId }: any) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    socket.emit("join", conversationId);

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [conversationId]);

  const sendMessage = () => {
    const msg = {
      conversationId,
      content: message
    };

    socket.emit("send_message", msg);
    setMessages((prev) => [...prev, msg]);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className="p-2">{m.content}</div>
        ))}
      </div>

      <div className="flex gap-2 p-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 border p-2"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4">
          Send
        </button>
      </div>
    </div>
  );
}