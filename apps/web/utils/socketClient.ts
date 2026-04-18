'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocketClient() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
    })
  }

  return socket
}
