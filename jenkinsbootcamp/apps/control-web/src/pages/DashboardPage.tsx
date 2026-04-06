import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Screen, Playlist } from '../types';

interface Props {
  onNavigate: (page: any) => void;
}

export function DashboardPage({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playbackEvents, setPlaybackEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [screensData, playlistsData, analyticsData] = await Promise.all([
        api.getScreens(),
        api.getPlaylists(),
        api.getPlatformAnalytics().catch(() => ({ totalPlaybackEvents: 0 })),
      ]);
      setScreens(screensData);
      setPlaylists(playlistsData);
      setPlaybackEvents((analyticsData as any).totalPlaybackEvents ?? 0);
      setLastUpdated(new Date());
      setCountdown(30);
      if (isManual) showToastRef.current('Dashboard refreshed', 'success');
    } catch {
      showToastRef.current('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(() => loadData(), 30000);
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    const countdownTick = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => { clearInterval(dataInterval); clearInterval(clock); clearInterval(countdownTick); };
  }, [loadData]);

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const onlineScreens = screens.filter(s => s.status === 'ONLINE');
  const onlineCount = onlineScreens.length;
  const totalScreens = screens.length;
  const uptimePercent = totalScreens > 0 ? Math.round((onlineCount / totalScreens) * 100) : 0;
  const totalPlaylists = playlists.length;
  const activePlaylists = playlists.filter(p => p.isActive).length;
  const uptimeColor = uptimePercent >= 80 ? '#34d399' : uptimePercent >= 50 ? '#fbbf24' : '#f87171';

  const filteredScreens = screens.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPlaylists = playlists.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#8b91b0' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '12px' }} />
      Loading dashboard...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .stat-card { transition: all 0.2s ease; cursor: pointer; }
        .stat-card:hover { border-color: #2e3347 !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .row-hover:hover { background: #1a1e2b !important; cursor: pointer; }
        .row-hover { transition: background 0.15s ease; }
        .search-input { background: #1a1e2b; border: 1px solid #242838; color: #e2e4ed; border-radius: 8px; padding: 9px 14px 9px 36px; font-size: 13px; width: 100%; box-sizing: border-box; font-family: Inter, sans-serif; transition: border-color 0.15s; }
        .search-input:focus { outline: none; border-color: #7c8fff; }
        .quick-action:hover { background: #1a1e2b !important; border-color: #7c8fff !important; color: #7c8fff !important; }
        .quick-action { transition: all 0.15s ease; }
        .screen-row:hover { background: #1a1e2b !important; }
        .screen-row { transition: background 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e4ed', letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginTop: '4px' }}>{formatDate(currentTime)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(true)} disabled={refreshing}
            style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: refreshing ? '#7c8fff' : '#8b91b0', fontSize: '13px', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = '#7c8fff'; e.currentTarget.style.color = '#7c8fff'; } }}
            onMouseLeave={e => { if (!refreshing) { e.currentTarget.style.borderColor = '#242838'; e.currentTarget.style.color = '#8b91b0'; } }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a5070', fontSize: '13px' }}>🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search screens, playlists..." className="search-input" style={{ width: '220px' }} />
          </div>
          <div style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '10px', padding: '8px 14px', textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e4ed', fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontSize: '10px', color: '#4a5070', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
              {lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : 'Loading...'} · ↻ {countdown}s
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Screens', value: totalScreens, sub: `${onlineCount} online · ${totalScreens - onlineCount} offline`, color: '#7c8fff', icon: '🖥', page: 'screens', bar: totalScreens > 0 ? (onlineCount / totalScreens) * 100 : 0 },
          { label: 'Online Now', value: onlineCount, sub: onlineCount > 0 ? 'Broadcasting live' : 'No screens active', color: '#34d399', icon: '📡', page: 'screens', bar: totalScreens > 0 ? (onlineCount / totalScreens) * 100 : 0 },
          { label: 'Playlists', value: totalPlaylists, sub: `${activePlaylists} active · ${totalPlaylists - activePlaylists} inactive`, color: '#a78bfa', icon: '▶', page: 'playlists', bar: totalPlaylists > 0 ? (activePlaylists / totalPlaylists) * 100 : 0 },
          { label: 'Network Uptime', value: `${uptimePercent}%`, sub: `${onlineCount}/${totalScreens} screens up`, color: uptimeColor, icon: '📊', page: 'analytics', bar: uptimePercent },
          { label: 'Playback Events', value: playbackEvents, sub: 'Total logged events', color: '#fbbf24', icon: '⚡', page: 'analytics', bar: Math.min((playbackEvents / Math.max(playbackEvents, 50)) * 100, 100) },
        ].map(card => (
          <div key={card.label} className="stat-card" onClick={() => onNavigate(card.page as any)} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>{card.icon}</span>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: card.color, animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ fontSize: '30px', fontWeight: '800', color: '#e2e4ed', letterSpacing: '-1px', marginBottom: '3px' }}>{card.value}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#8b91b0', marginBottom: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '11px', color: '#4a5070', marginBottom: '10px' }}>{card.sub}</div>
            <div style={{ height: '3px', background: '#242838', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${card.bar}%`, background: card.color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Screen Health Table */}
      <div style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e4ed' }}>Screen Health</h2>
            <p style={{ fontSize: '12px', color: '#4a5070', marginTop: '2px' }}>{onlineCount} of {totalScreens} broadcasting</p>
          </div>
          <button onClick={() => onNavigate('screens')} style={{ fontSize: '12px', color: '#7c8fff', background: 'transparent', border: 'none', cursor: 'pointer' }}>Manage screens →</button>
        </div>
        {filteredScreens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: '#4a5070', fontSize: '13px' }}>
            {search ? 'No screens match your search' : 'No screens paired yet — go to Screens to pair your first display'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Screen', 'Status', 'Location', 'Last Seen', 'Resolution', 'Playlist'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#4a5070', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #242838', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredScreens.map(screen => {
                  const assignedPlaylist = playlists.find(p => p.id === screen.playlistId);
                  return (
                    <tr key={screen.id} className="screen-row" style={{ borderBottom: '1px solid #1a1e2b', cursor: 'pointer' }} onClick={() => onNavigate('screens')}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: screen.status === 'ONLINE' ? '#34d399' : '#f87171', animation: screen.status === 'ONLINE' ? 'pulse 2s infinite' : 'none' }} />
                          <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e4ed' }}>{screen.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: screen.status === 'ONLINE' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: screen.status === 'ONLINE' ? '#34d399' : '#f87171' }}>
                          {screen.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#8b91b0' }}>
                        {screen.venueName ? (
                          <div>
                            <div style={{ color: '#e2e4ed', fontWeight: '500', fontSize: '12px' }}>{screen.venueName}</div>
                            {screen.cluster && <div style={{ fontSize: '10px', color: '#7c8fff' }}>{screen.cluster}</div>}
                          </div>
                        ) : <span style={{ color: '#2e3347', fontStyle: 'italic', fontSize: '11px' }}>Not set</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#8b91b0', whiteSpace: 'nowrap' }}>{timeAgo(screen.lastSeenAt)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#8b91b0' }}>
                        {screen.deviceInfo?.display ? `${screen.deviceInfo.display.width}×${screen.deviceInfo.display.height}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {assignedPlaylist
                          ? <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '500' }}>{assignedPlaylist.name}</span>
                          : <span style={{ fontSize: '11px', color: '#f87171', fontStyle: 'italic' }}>None assigned</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Playlists */}
        <div style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e4ed' }}>Playlists</h2>
            <button onClick={() => onNavigate('playlists')} style={{ fontSize: '12px', color: '#7c8fff', background: 'transparent', border: 'none', cursor: 'pointer' }}>Manage →</button>
          </div>
          {filteredPlaylists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#4a5070', fontSize: '12px' }}>
              {search ? 'No matches' : 'No playlists created yet'}
            </div>
          ) : filteredPlaylists.slice(0, 6).map(p => (
            <div key={p.id} className="row-hover" onClick={() => onNavigate('playlists')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '7px', marginBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(124,143,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>▶</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e4ed' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#4a5070' }}>{p.items?.length ?? 0} items</div>
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', background: p.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(74,80,112,0.25)', color: p.isActive ? '#34d399' : '#4a5070' }}>
                {p.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e4ed', marginBottom: '14px' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[
              { label: '🖥 Pair Screen', page: 'screens' },
              { label: '▶ New Playlist', page: 'playlists' },
              { label: '📊 Analytics', page: 'analytics' },
              { label: '📅 Schedule', page: 'schedule' },
            ].map(item => (
              <button key={item.label} onClick={() => onNavigate(item.page as any)} className="quick-action"
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #242838', background: 'transparent', color: '#8b91b0', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'left' }}>
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={() => loadData(true)} disabled={refreshing}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #242838', background: 'transparent', color: refreshing ? '#7c8fff' : '#8b91b0', fontSize: '13px', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = '#7c8fff'; e.currentTarget.style.color = '#7c8fff'; } }}
            onMouseLeave={e => { if (!refreshing) { e.currentTarget.style.borderColor = '#242838'; e.currentTarget.style.color = '#8b91b0'; } }}
          >
            <span style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none', display: 'inline-block' }}>↻</span>
            {refreshing ? 'Refreshing...' : `🔄 Refresh Now (auto in ${countdown}s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
