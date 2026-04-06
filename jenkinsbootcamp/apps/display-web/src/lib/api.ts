const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  async requestPairingCode() {
    const response = await fetch(`${API_URL}/pairing/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return response.json();
  },

  async checkPairingStatus(code: string) {
    const response = await fetch(`${API_URL}/pairing/status/${code}`);
    return response.json();
  },

  async logPlayback(data: {
    screenId: string;
    playlistItemId?: string;
    eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';
    timestamp: string;
  }) {
    const response = await fetch(`${API_URL}/playback/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};