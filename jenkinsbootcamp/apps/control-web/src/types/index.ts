export interface Screen {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  playlistId?: string;
  playlist?: Playlist;
  lastSeenAt?: string;
  // Location fields (set via the 📍 button in Screens page)
  venueName?: string;
  venueType?: string;
  cluster?: string;
  area?: string;
  address?: string;
  deviceInfo?: {
    battery?: { level: number; charging: boolean };
    network?: { type: string; downlink?: number; rtt?: number; effectiveType?: string };
    display?: { width: number; height: number; pixelRatio: number; orientation: string };
    browser?: { userAgent: string; language: string; platform: string };
    visibility?: string;
    memoryMB?: number;
    lastHeartbeat?: string;
    collectedAt?: string;
  };
  createdAt: string;
}

export interface PlaylistItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'HTML';
  url: string;
  duration: number;
  order: number;
  // Transition stored in metadata JSON field
  metadata?: {
    transition?: 'none' | 'fade' | 'slide';
  };
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  totalScreens: number;
  onlineScreens: number;
  totalPlaylists: number;
  activePlaylists: number;
  totalPlaybackEvents: number;
  recentScreens: Screen[];
  recentPlaylists: Playlist[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  playlistId?: string;
  playlist?: Playlist;
  targetClusters: string[];
  targetScreenIds: string[];
  impressions: number;
  createdAt: string;
}
