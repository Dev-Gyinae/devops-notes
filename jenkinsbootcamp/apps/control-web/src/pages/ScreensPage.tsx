import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Screen, Playlist } from '../types';

type FilterStatus = 'ALL' | 'ONLINE' | 'OFFLINE';
type ViewMode = 'grid' | 'list';

export function ScreensPage() {
  const { showToast } = useToast();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [pairName, setPairName] = useState('');
  const [pairPlaylist, setPairPlaylist] = useState('');
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [editingLocation, setEditingLocation] = useState<Screen | null>(null);
  const [locVenueName, setLocVenueName] = useState('');
  const [locVenueType, setLocVenueType] = useState('');
  const [locCluster, setLocCluster] = useState('');
  const [locArea, setLocArea] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [bulkPlaylistId, setBulkPlaylistId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [showBulkBar, setShowBulkBar] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [screensData, playlistsData] = await Promise.all([api.getScreens(), api.getPlaylists()]);
      setScreens(screensData);
      setPlaylists(playlistsData);
    } catch {
      showToast('Failed to load screens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairing(true); setPairError('');
    try {
      await api.confirmPairing(pairCode.toUpperCase(), pairPlaylist, pairName);
      setShowPairModal(false);
      setPairCode(''); setPairName(''); setPairPlaylist('');
      showToast(`Screen "${pairName}" paired successfully!`, 'success');
      loadData();
    } catch (err: any) {
      setPairError(err.message || 'Pairing failed — check the code and try again');
    } finally {
      setPairing(false);
    }
  };

  const handleAssignPlaylist = async (screenId: string, playlistId: string) => {
    try {
      await api.updateScreen(screenId, { playlistId: playlistId || undefined });
      const playlistName = playlists.find(p => p.id === playlistId)?.name || 'None';
      showToast(`Playlist assigned: ${playlistName}`, 'success');
      loadData();
    } catch {
      showToast('Failed to assign playlist', 'error');
    }
  };

  const toggleSelectScreen = (id: string) => {
    setSelectedScreenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      setShowBulkBar(next.size > 0);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedScreenIds(new Set());
    setShowBulkBar(false);
    setBulkPlaylistId('');
  };

  const selectAll = () => {
    const ids = new Set(filtered.map(s => s.id));
    setSelectedScreenIds(ids);
    setShowBulkBar(ids.size > 0);
  };

  const handleBulkAssign = async () => {
    if (!bulkPlaylistId || selectedScreenIds.size === 0) return;
    setBulkAssigning(true);
    try {
      await Promise.all(
        Array.from(selectedScreenIds).map(id =>
          api.updateScreen(id, { playlistId: bulkPlaylistId })
        )
      );
      const playlistName = playlists.find(p => p.id === bulkPlaylistId)?.name || '';
      showToast(`"${playlistName}" assigned to ${selectedScreenIds.size} screen${selectedScreenIds.size > 1 ? 's' : ''}`, 'success');
      clearSelection();
      loadData();
    } catch {
      showToast('Bulk assign failed — some screens may not have updated', 'error');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleDeleteScreen = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from your network?`)) return;
    try {
      await api.deleteScreen(id);
      showToast(`Screen "${name}" removed`, 'info');
      loadData();
    } catch {
      showToast('Failed to remove screen', 'error');
    }
  };

  const handleSaveName = async (screenId: string) => {
    try {
      await api.updateScreen(screenId, { name: editNameValue });
      showToast('Screen renamed', 'success');
      setEditingName(null);
      loadData();
    } catch {
      showToast('Failed to rename screen', 'error');
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const openLocationModal = (screen: Screen) => {
    setEditingLocation(screen);
    setLocVenueName(screen.venueName || '');
    setLocVenueType(screen.venueType || '');
    setLocCluster(screen.cluster || '');
    setLocArea(screen.area || '');
    setLocationError('');
  };

  const handleSaveLocation = async () => {
    if (!editingLocation) return;
    setSavingLocation(true);
    setLocationError('');
    try {
      const result = await api.updateScreen(editingLocation.id, {
        venueName: locVenueName.trim(),
        venueType: locVenueType.trim(),
        cluster: locCluster,
        area: locArea.trim(),
      });
      console.log('Location save result:', result);
      showToast('Location saved ✓', 'success');
      setEditingLocation(null);
      // Update local state immediately so it shows without waiting for reload
      setScreens(prev => prev.map(s =>
        s.id === editingLocation.id
          ? { ...s, venueName: locVenueName.trim(), venueType: locVenueType.trim(), cluster: locCluster, area: locArea.trim() }
          : s
      ));
      loadData();
    } catch (err: any) {
      console.error('Location save error:', err);
      const msg = err?.message || 'Save failed. Make sure your server is running and the database migration has been applied.';
      setLocationError(msg);
    } finally {
      setSavingLocation(false);
    }
  };

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

  const getNowPlayingItem = (screen: Screen) => {
    const itemId = (screen.deviceInfo as any)?.nowPlaying?.playlistItemId;
    if (!itemId || !screen.playlistId) return null;
    const playlist = playlists.find(p => p.id === screen.playlistId);
    return playlist?.items?.find((i: any) => i.id === itemId) ?? null;
  };

  const getBrowserName = (ua?: string) => {
    if (!ua) return '—';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Browser';
  };

  const filtered = screens
    .filter(s => filterStatus === 'ALL' || s.status === filterStatus)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const onlineCount = screens.filter(s => s.status === 'ONLINE').length;

  const inputStyle: React.CSSProperties = {
    background: '#1a1e2b', border: '1px solid #242838', color: '#e2e4ed',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
    width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#8b91b0' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '12px' }} />
      Loading screens...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .screen-card { transition: all 0.15s ease; }
        .screen-card:hover { border-color: #2e3347 !important; transform: translateY(-1px); }
        .icon-btn:hover { background: #222638 !important; color: #e2e4ed !important; }
        .icon-btn { transition: all 0.15s ease; }
        .filter-btn { transition: all 0.15s ease; }
        .filter-btn:hover { border-color: #7c8fff !important; color: #7c8fff !important; }
        .filter-btn.active { background: rgba(124,143,255,0.12) !important; border-color: #7c8fff !important; color: #7c8fff !important; }
        .modal-input { background: #1a1e2b; border: 1px solid #242838; color: #e2e4ed; border-radius: 8px; padding: 10px 14px; font-size: 14px; width: 100%; box-sizing: border-box; font-family: Inter, sans-serif; }
        .modal-input:focus { outline: none; border-color: #7c8fff; }
        .list-row:hover { background: #1a1e2b !important; }
        .list-row { transition: background 0.15s ease; cursor: pointer; }
        .select-dark { background: #1a1e2b; border: 1px solid #242838; color: #e2e4ed; border-radius: 6px; padding: 7px 10px; font-size: 12px; cursor: pointer; width: 100%; font-family: Inter, sans-serif; }
        .select-dark:focus { outline: none; border-color: #7c8fff; }
        .loc-btn:hover { border-color: #7c8fff !important; }
        .loc-btn { transition: border-color 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e4ed', letterSpacing: '-0.5px' }}>Screens</h1>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginTop: '4px' }}>{onlineCount} of {screens.length} online · Auto-refreshes every 15s</p>
        </div>
        <button onClick={() => setShowPairModal(true)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + Pair Screen
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a5070', fontSize: '13px' }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search screens..."
            style={{ background: '#1a1e2b', border: '1px solid #242838', color: '#e2e4ed', borderRadius: '8px', padding: '9px 14px 9px 36px', fontSize: '13px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#7c8fff'} onBlur={e => e.target.style.borderColor = '#242838'} />
        </div>
        {(['ALL', 'ONLINE', 'OFFLINE'] as FilterStatus[]).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} className={`filter-btn ${filterStatus === f ? 'active' : ''}`}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #242838', background: 'transparent', color: '#8b91b0', fontSize: '13px', cursor: 'pointer' }}>
            {f === 'ALL' ? 'All' : f === 'ONLINE' ? '🟢 Online' : '🔴 Offline'}
          </button>
        ))}
        <div style={{ display: 'flex', border: '1px solid #242838', borderRadius: '8px', overflow: 'hidden' }}>
          {(['grid', 'list'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: '14px', background: viewMode === v ? 'rgba(124,143,255,0.12)' : 'transparent', color: viewMode === v ? '#7c8fff' : '#8b91b0', transition: 'all 0.15s' }}>
              {v === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {showBulkBar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#1a1e2b', border: '1px solid rgba(124,143,255,0.3)', borderRadius: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#7c8fff', flexShrink: 0 }}>
            {selectedScreenIds.size} screen{selectedScreenIds.size > 1 ? 's' : ''} selected
          </span>
          <select
            value={bulkPlaylistId}
            onChange={e => setBulkPlaylistId(e.target.value)}
            className="select-dark"
            style={{ flex: 1, minWidth: '180px', maxWidth: '260px' }}
          >
            <option value="">Choose playlist to assign...</option>
            {playlists.map(p => <option key={p.id} value={p.id}>{p.name} · {p.items?.length ?? 0} items</option>)}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkPlaylistId || bulkAssigning}
            style={{ padding: '8px 18px', background: !bulkPlaylistId || bulkAssigning ? '#242838' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '7px', color: !bulkPlaylistId || bulkAssigning ? '#4a5070' : '#fff', fontSize: '13px', fontWeight: '600', cursor: !bulkPlaylistId || bulkAssigning ? 'not-allowed' : 'pointer', flexShrink: 0 }}
          >
            {bulkAssigning ? 'Assigning...' : '✓ Assign'}
          </button>
          <button onClick={selectAll} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #242838', borderRadius: '7px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
            Select All ({filtered.length})
          </button>
          <button onClick={clearSelection} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #242838', borderRadius: '7px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
            ✕ Clear
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', background: '#13161f', border: '1px solid #242838', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖥</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#e2e4ed', marginBottom: '6px' }}>
            {search || filterStatus !== 'ALL' ? 'No screens match your filter' : 'No screens paired yet'}
          </h3>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '20px' }}>
            {search || filterStatus !== 'ALL' ? 'Try a different search or filter' : 'Open the display app on a screen to get a pairing code'}
          </p>
          {!search && filterStatus === 'ALL' && (
            <button onClick={() => setShowPairModal(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              + Pair First Screen
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(screen => (
            <div key={screen.id} className="screen-card" style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '18px' }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, background: screen.status === 'ONLINE' ? '#34d399' : '#f87171', animation: screen.status === 'ONLINE' ? 'pulse 2s infinite' : 'none' }} />
                  {editingName === screen.id ? (
                    <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                      <input value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="modal-input" style={{ padding: '4px 8px', fontSize: '13px' }} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(screen.id); if (e.key === 'Escape') setEditingName(null); }} />
                      <button onClick={() => handleSaveName(screen.id)} style={{ padding: '4px 8px', background: '#7c8fff', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingName(null)} style={{ padding: '4px 8px', background: '#242838', border: 'none', borderRadius: '4px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e4ed' }}>{screen.name}</div>
                      <div style={{ fontSize: '11px', color: '#4a5070' }}>Last seen: {timeAgo(screen.lastSeenAt)}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                  <button className="icon-btn" onClick={() => { setEditingName(screen.id); setEditNameValue(screen.name); }} style={{ padding: '5px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }} title="Rename">✏️</button>
                  <button className="icon-btn" onClick={() => openLocationModal(screen)} style={{ padding: '5px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }} title="Set location">📍</button>
                  <button className="icon-btn" onClick={() => handleDeleteScreen(screen.id, screen.name)} style={{ padding: '5px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }} title="Remove">🗑</button>
                </div>
              </div>

              {/* Status badge */}
              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', marginBottom: '12px', background: screen.status === 'ONLINE' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: screen.status === 'ONLINE' ? '#34d399' : '#f87171' }}>
                {screen.status}
              </span>

              {/* Now Playing */}
              {(() => {
                const np = getNowPlayingItem(screen);
                const since = (screen.deviceInfo as any)?.nowPlaying?.since;
                const sinceStr = since ? timeAgo(since) : '';
                if (!np) return null;
                const fileName = (() => { try { const p = new URL(np.url).pathname.split('/'); return p[p.length - 1] || np.url; } catch { return np.url.length > 32 ? np.url.slice(0, 32) + '…' : np.url; } })();
                return (
                  <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '7px', padding: '8px 10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Now Playing</div>
                      <div style={{ fontSize: '11px', color: '#e2e4ed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{fileName}</div>
                    </div>
                    <span style={{ fontSize: '9px', color: '#4a5070', flexShrink: 0 }}>{sinceStr}</span>
                  </div>
                );
              })()}

              {/* Device Info */}
              {screen.deviceInfo && (
                <div style={{ background: '#1a1e2b', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {screen.deviceInfo.display && (
                    <>
                      <div>
                        <div style={{ fontSize: '10px', color: '#4a5070' }}>Resolution</div>
                        <div style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500' }}>{screen.deviceInfo.display.width}×{screen.deviceInfo.display.height}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#4a5070' }}>Orientation</div>
                        <div style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500', textTransform: 'capitalize' }}>{screen.deviceInfo.display.orientation?.replace('-primary', '') || '—'}</div>
                      </div>
                    </>
                  )}
                  {screen.deviceInfo.network && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a5070' }}>Network</div>
                      <div style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500' }}>{screen.deviceInfo.network.effectiveType || screen.deviceInfo.network.type}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '10px', color: '#4a5070' }}>Browser</div>
                    <div style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500' }}>{getBrowserName(screen.deviceInfo.browser?.userAgent)}</div>
                  </div>
                </div>
              )}

              {/* Location row — click to set/edit */}
              <div className="loc-btn" onClick={() => openLocationModal(screen)}
                style={{ cursor: 'pointer', background: 'rgba(124,143,255,0.05)', border: '1px dashed #2e3347', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', fontSize: '11px' }}>
                {screen.venueName ? (
                  <div>
                    <div style={{ color: '#e2e4ed', fontWeight: '500' }}>
                      📍 {screen.venueName}
                      {screen.venueType && <span style={{ color: '#8b91b0', fontWeight: '400' }}> · {screen.venueType}</span>}
                    </div>
                    {(screen.area || screen.cluster) && (
                      <div style={{ color: '#8b91b0', marginTop: '2px' }}>
                        {screen.area}{screen.area && screen.cluster ? ' · ' : ''}
                        {screen.cluster && <span style={{ color: '#7c8fff' }}>{screen.cluster}</span>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#4a5070' }}>
                    📍 <span style={{ color: '#7c8fff' }}>Add location</span> — click to set venue, area &amp; cluster
                  </div>
                )}
              </div>

              {/* Screen ID */}
              <div onClick={e => e.stopPropagation()} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: '500', color: '#4a5070', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Screen ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1e2b', border: '1px solid #242838', borderRadius: '6px', padding: '6px 10px' }}>
                  <span style={{ fontSize: '11px', color: '#4a5070', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{screen.id}</span>
                  <button
                    onClick={e => handleCopyId(e, screen.id)}
                    style={{ flexShrink: 0, padding: '2px 8px', background: copiedId === screen.id ? 'rgba(52,211,153,0.15)' : 'transparent', border: `1px solid ${copiedId === screen.id ? '#34d399' : '#2e3347'}`, borderRadius: '4px', color: copiedId === screen.id ? '#34d399' : '#4a5070', fontSize: '10px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                    title="Copy Screen ID for re-pairing">
                    {copiedId === screen.id ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '10px', color: '#2e3347', marginTop: '3px' }}>Use this ID to restore a replaced device</div>
              </div>

              {/* Playlist */}
              <div onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: '10px', fontWeight: '500', color: '#4a5070', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Playlist</div>
                <select value={screen.playlistId || ''} onChange={e => handleAssignPlaylist(screen.id, e.target.value)} className="select-dark">
                  <option value="">— No playlist —</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #242838' }}>
                {['Screen', 'Status', 'Now Playing', 'Location', 'Last Seen', 'Playlist', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#4a5070', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(screen => (
                <tr key={screen.id} className="list-row" style={{ borderBottom: '1px solid #1a1e2b' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={selectedScreenIds.has(screen.id)} onChange={() => toggleSelectScreen(screen.id)} style={{ accentColor: '#7c8fff', width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }} />
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: screen.status === 'ONLINE' ? '#34d399' : '#f87171', animation: screen.status === 'ONLINE' ? 'pulse 2s infinite' : 'none', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e4ed' }}>{screen.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: screen.status === 'ONLINE' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: screen.status === 'ONLINE' ? '#34d399' : '#f87171' }}>
                      {screen.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '160px' }}>
                    {(() => {
                      const np = getNowPlayingItem(screen);
                      if (!np) return <span style={{ fontSize: '11px', color: '#2e3347' }}>—</span>;
                      const fileName = (() => { try { const p = new URL(np.url).pathname.split('/'); return p[p.length - 1] || np.url; } catch { return np.url.length > 28 ? np.url.slice(0, 28) + '…' : np.url; } })();
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#e2e4ed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                    {screen.venueName ? (
                      <div>
                        <div style={{ color: '#e2e4ed', fontWeight: '500' }}>{screen.venueName}</div>
                        {screen.cluster && <div style={{ fontSize: '10px', color: '#7c8fff' }}>{screen.cluster}</div>}
                      </div>
                    ) : <span style={{ color: '#2e3347', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#8b91b0', whiteSpace: 'nowrap' }}>{timeAgo(screen.lastSeenAt)}</td>

                  <td style={{ padding: '12px 16px' }}>
                    <select value={screen.playlistId || ''} onChange={e => handleAssignPlaylist(screen.id, e.target.value)} className="select-dark" style={{ width: '140px' }}>
                      <option value="">— None —</option>
                      {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="icon-btn" onClick={() => openLocationModal(screen)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }} title="Set location">📍</button>
                      <button className="icon-btn" onClick={() => { setEditingName(screen.id); setEditNameValue(screen.name); }} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
                      <button className="icon-btn" onClick={() => handleDeleteScreen(screen.id, screen.name)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #242838', borderRadius: '5px', color: '#8b91b0', fontSize: '11px', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── PAIR MODAL ─── */}
      {showPairModal && (
        <div onClick={() => { setShowPairModal(false); setPairError(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '6px' }}>Pair New Screen</h2>
            <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '24px' }}>Enter the 6-character code shown on your display</p>
            {pairError && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                {pairError}
              </div>
            )}
            <form onSubmit={handlePair}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#8b91b0', marginBottom: '8px' }}>Pairing Code</label>
                <input type="text" value={pairCode} onChange={e => setPairCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="e.g. J3LS8Y" maxLength={6} required className="modal-input"
                  style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '22px', textAlign: 'center', fontWeight: '700' }} autoFocus />
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  {[...Array(6)].map((_, i) => (
                    <span key={i} style={{ display: 'inline-block', width: '10px', height: '3px', borderRadius: '2px', background: i < pairCode.length ? '#7c8fff' : '#242838', margin: '0 2px', transition: 'background 0.15s' }} />
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#8b91b0', marginBottom: '8px' }}>Screen Name</label>
                <input type="text" value={pairName} onChange={e => setPairName(e.target.value)} placeholder="e.g. Lobby Display, Counter 1" required className="modal-input" />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#8b91b0', marginBottom: '8px' }}>Assign Playlist</label>
                <select value={pairPlaylist} onChange={e => setPairPlaylist(e.target.value)} required className="modal-input select-dark">
                  <option value="">Select a playlist...</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {playlists.length === 0 && <p style={{ fontSize: '11px', color: '#fbbf24', marginTop: '6px' }}>⚠️ Create a playlist first before pairing</p>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowPairModal(false); setPairError(''); }} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={pairing || pairCode.length < 6 || !pairName || !pairPlaylist}
                  style={{ flex: 2, padding: '11px', background: pairing || pairCode.length < 6 || !pairName || !pairPlaylist ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: pairing ? 'not-allowed' : 'pointer' }}>
                  {pairing ? 'Pairing...' : pairCode.length < 6 ? `Enter ${6 - pairCode.length} more digits` : 'Pair Screen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LOCATION MODAL ─── */}
      {editingLocation && (
        <div onClick={() => setEditingLocation(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '2px' }}>Screen Location</h2>
            <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '22px' }}>{editingLocation.name}</p>

            {/* Error box - shows prominently if save fails */}
            {locationError && (
              <div style={{ padding: '12px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
                <strong>⚠ Save failed:</strong> {locationError}
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171', opacity: 0.8 }}>
                  If this keeps happening, run: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '3px' }}>npx prisma migrate deploy</code> in the server folder.
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b91b0', marginBottom: '6px', fontWeight: '500' }}>Venue Name</label>
              <input type="text" value={locVenueName} onChange={e => setLocVenueName(e.target.value)} placeholder="e.g. Accra Mall, Trust Hospital"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#7c8fff'} onBlur={e => e.target.style.borderColor = '#242838'} autoFocus />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b91b0', marginBottom: '6px', fontWeight: '500' }}>Venue Type</label>
              <input type="text" value={locVenueType} onChange={e => setLocVenueType(e.target.value)} placeholder="e.g. Shopping Mall, Pharmacy, Gym"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#7c8fff'} onBlur={e => e.target.style.borderColor = '#242838'} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b91b0', marginBottom: '6px', fontWeight: '500' }}>Area / Neighbourhood</label>
              <input type="text" value={locArea} onChange={e => setLocArea(e.target.value)} placeholder="e.g. East Legon, Osu, Tema"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#7c8fff'} onBlur={e => e.target.style.borderColor = '#242838'} />
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b91b0', marginBottom: '8px', fontWeight: '500' }}>Cluster</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'RETAIL', icon: '🛒', label: 'Retail' },
                  { id: 'ENTERTAINMENT', icon: '🎭', label: 'Entertainment' },
                  { id: 'CORPORATE', icon: '🏢', label: 'Corporate' },
                  { id: 'PUBLIC', icon: '🏛', label: 'Public' },
                  { id: 'HEALTHCARE', icon: '🏥', label: 'Healthcare' },
                  { id: 'EDUCATION', icon: '🎓', label: 'Education' },
                ].map(c => (
                  <button key={c.id} type="button" onClick={() => setLocCluster(locCluster === c.id ? '' : c.id)}
                    style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid', borderColor: locCluster === c.id ? '#7c8fff' : '#242838', background: locCluster === c.id ? 'rgba(124,143,255,0.12)' : 'transparent', color: locCluster === c.id ? '#7c8fff' : '#8b91b0', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textAlign: 'left' }}>
                    {c.icon} {c.label}
                    {locCluster === c.id && <span style={{ float: 'right' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditingLocation(null)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveLocation} disabled={savingLocation}
                style={{ flex: 2, padding: '11px', background: savingLocation ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: savingLocation ? 'not-allowed' : 'pointer' }}>
                {savingLocation ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
