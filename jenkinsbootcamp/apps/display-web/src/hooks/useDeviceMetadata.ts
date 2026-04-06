export interface DeviceMetadata {
  battery?: {
    level: number;
    charging: boolean;
  };
  network?: {
    type: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
  };
  display?: {
    width: number;
    height: number;
    pixelRatio: number;
    orientation: string;
  };
  browser?: {
    userAgent: string;
    language: string;
    platform: string;
  };
  visibility?: string;
  memoryMB?: number;
  collectedAt: string;
}

export async function collectDeviceMetadata(): Promise<DeviceMetadata> {
  const metadata: DeviceMetadata = {
    collectedAt: new Date().toISOString(),
  };

  // Display info
  metadata.display = {
    width: window.screen.width,
    height: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: screen.orientation?.type || 'unknown',
  };

  // Browser info
  metadata.browser = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
  };

  // Visibility state
  metadata.visibility = document.visibilityState;

  // Memory - Chrome only
  const nav = navigator as any;
  if (nav.deviceMemory) {
    metadata.memoryMB = nav.deviceMemory * 1024;
  }

  // Network info
  if (nav.connection) {
    const conn = nav.connection;
    metadata.network = {
      type: conn.type || 'unknown',
      downlink: conn.downlink,
      rtt: conn.rtt,
      effectiveType: conn.effectiveType,
    };
  } else {
    metadata.network = {
      type: navigator.onLine ? 'online' : 'offline',
    };
  }

  // Battery - Chrome/Android only
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      metadata.battery = {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      };
    }
  } catch {
    // Not supported, skip silently
  }

  return metadata;
}