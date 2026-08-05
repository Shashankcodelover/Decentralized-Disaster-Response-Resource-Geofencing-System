import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { API_URL } from '../config';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  return { socket: socketRef.current, connected };
}
