// Client → Server Events
export interface ClientToServerEvents {
  'screen:join': (data: { screenId: string; pairingCode?: string }) => void;
  'screen:heartbeat': (data: { screenId: string; timestamp: string }) => void;
  'screen:playback_log': (data: {
    screenId: string;
    playlistItemId?: string;
    eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';
    timestamp: string;
  }) => void;
}

// Server → Client Events
export interface ServerToClientEvents {
  'screen:joined': (data: { screenId: string; status: string }) => void;
  'playlist:update': (data: {
    playlistId: string;
    items: any[];
  }) => void;
  'playback:play': (data: { playlistId: string }) => void;
  'playback:pause': () => void;
  'playback:override': (data: {
    type: string;
    url: string;
    duration: number;
  }) => void;
  'error': (data: { message: string }) => void;
}
