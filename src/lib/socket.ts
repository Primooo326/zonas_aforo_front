'use client';

import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './api';

let socket: Socket | null = null;

export function connectSocket(edificioId: string) {
  if (socket?.connected) return socket;

  socket = io(getSocketUrl(), {
    query: { edificioId },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('Socket conectado'));
  socket.on('disconnect', () => console.log('Socket desconectado'));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
