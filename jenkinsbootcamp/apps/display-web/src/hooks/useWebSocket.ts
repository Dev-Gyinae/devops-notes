import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Playlist } from '../types';
import { collectDeviceMetadata } from './useDeviceMetadata';

const WS_URL = import.meta.env.VITE_WS_URL;

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(screenId: string | null, pairingCode: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const hasConnectedOnce = useRef(false);
  const lastUpdateRef = useRef<number>(0); // timestamp of last playlist:update received

  useEffect(() => {
    if (!screenId && !pairingCode) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      hasConnectedOnce.current = true;

      // Joining tells the server to push the current playlist immediately
      socket.emit('screen:join', {
        screenId: screenId || undefined,
        pairingCode: pairingCode || undefined,
      });
    });

    socket.on('disconnect', () => {
      if (!hasConnectedOnce.current) {
        setStatus('disconnected');
      } else {
        // Don't flash "reconnecting" for brief drops — wait 5 seconds first
        const timeout = setTimeout(() => {
          if (!socket.connected) setStatus('disconnected');
        }, 5000);
        socket.once('connect', () => clearTimeout(timeout));
      }
    });

    socket.on('reconnect', () => setStatus('connected'));
    socket.on('screen:joined', () => setStatus('connected'));

    socket.on('playlist:update', (data) => {
      lastUpdateRef.current = Date.now();
      setPlaylist(data);
    });

    // ─── Heartbeat ────────────────────────────────────────────────────────
    // Sends device stats every 30 seconds and keeps lastSeenAt updated
    const sendHeartbeat = async () => {
      if (screenId && socket.connected) {
        try {
          const metadata = await collectDeviceMetadata();
          socket.emit('screen:heartbeat', {
            screenId,
            timestamp: new Date().toISOString(),
            metadata,
          });
        } catch { /* silent */ }
      }
    };

    const initialHeartbeat = setTimeout(sendHeartbeat, 3000);
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    // ─── Polling fallback (via WebSocket, no auth needed) ─────────────────
    // Every 60 seconds, if we haven't received a playlist:update recently,
    // re-emit screen:join — the server responds immediately with playlist:update.
    // This means the display self-heals if it ever misses a push.
    const pollInterval = setInterval(() => {
      if (!screenId || !socket.connected) return;
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceLastUpdate > 55000) {
        socket.emit('screen:join', { screenId });
      }
    }, 60000);

    return () => {
      clearTimeout(initialHeartbeat);
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [screenId, pairingCode]);

  return {
    connected: status === 'connected',
    status,
    playlist,
    socket: socketRef.current,
  };
}
