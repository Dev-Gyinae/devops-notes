const API_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('adhive_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Playlists
  async getPlaylists() {
    return this.request('/playlists');
  }

  async getPlaylist(id: string) {
    return this.request(`/playlists/${id}`);
  }

  async createPlaylist(data: { name: string; description?: string }) {
    return this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlaylist(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return this.request(`/playlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePlaylist(id: string) {
    return this.request(`/playlists/${id}`, { method: 'DELETE' });
  }

  // Playlist Items
  async addPlaylistItem(playlistId: string, data: { type: string; url: string; duration: number; metadata?: Record<string, any> }) {
    return this.request(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePlaylistItem(playlistId: string, itemId: string) {
    return this.request(`/playlists/${playlistId}/items/${itemId}`, { method: 'DELETE' });
  }

  async updatePlaylistItem(playlistId: string, itemId: string, data: { url?: string; duration?: number; metadata?: any }) {
    return this.request(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async reorderPlaylistItems(playlistId: string, itemIds: string[]) {
    return this.request(`/playlists/${playlistId}/items/reorder`, {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  }

  // Campaigns / Scheduling
  async getCampaigns() {
    return this.request('/campaigns');
  }

  async createCampaign(data: { name: string; description?: string; startDate: string; endDate: string; playlistId?: string; targetClusters?: string[]; targetScreenIds?: string[] }) {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: { name?: string; description?: string; status?: string; startDate?: string; endDate?: string; playlistId?: string; targetClusters?: string[]; targetScreenIds?: string[] }) {
    return this.request(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getCampaignReport(id: string) {
    return this.request(`/campaigns/${id}/report`);
  }

  async deleteCampaign(id: string) {
    return this.request(`/campaigns/${id}`, { method: 'DELETE' });
  }

  // Screens
  async getScreens() {
    return this.request('/screens');
  }

  async getScreen(id: string) {
    return this.request(`/screens/${id}`);
  }

  async updateScreen(id: string, data: {
    name?: string;
    playlistId?: string;
    resolution?: string;
    venueName?: string;
    venueType?: string;
    cluster?: string;
    area?: string;
    address?: string;
  }) {
    return this.request(`/screens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteScreen(id: string) {
    return this.request(`/screens/${id}`, { method: 'DELETE' });
  }

  // Pairing
  async confirmPairing(code: string, playlistId: string, screenName?: string) {
    return this.request('/pairing/confirm', {
      method: 'POST',
      body: JSON.stringify({ code, playlistId, screenName }),
    });
  }

  async checkPairingStatus(code: string) {
    return this.request(`/pairing/status/${code}`);
  }

  // Analytics
  async getPlatformAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return this.request(`/playback/analytics${qs ? '?' + qs : ''}`);
  }

  async getScreenAnalytics(screenId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return this.request(`/playback/screens/${screenId}/analytics${qs ? '?' + qs : ''}`);
  }

  async getNetworkUptime(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return this.request(`/playback/uptime${qs ? '?' + qs : ''}`);
  }

  // File Upload
  async uploadFile(file: File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('adhive_token');
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type - browser sets it automatically with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();