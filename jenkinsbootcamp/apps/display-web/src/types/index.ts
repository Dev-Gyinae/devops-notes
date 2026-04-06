export interface PlaylistItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'HTML';
  url: string;
  duration: number;
  order: number;
  metadata?: any;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export interface Screen {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  playlistId: string | null;
}

export interface PairingCode {
  id: string;
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
  expiresAt: string;
  screen?: Screen;
}