import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Playlist, PlaylistItem } from '../types';

// ─── Smart preview component ──────────────────────────────────────────────────
// Works for IMAGE, VIDEO, and HTML. Shows loading/error states.

function ItemPreview({ url, type, height = 140 }: { url: string; type: 'IMAGE' | 'VIDEO' | 'HTML'; height?: number }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url) { setStatus('idle'); return; }
    setStatus('loading');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setStatus('loading'), 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  if (!url) return null;

  const containerStyle: React.CSSProperties = {
    width: '100%', height, borderRadius: '8px', overflow: 'hidden',
    border: '1px solid #242838', background: '#0d0f14',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', marginBottom: '16px',
  };

  const loadingOverlay = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f14', zIndex: 2 }}>
      <div style={{ textAlign: 'center', color: '#4a5070' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
        <div style={{ fontSize: '11px' }}>Loading preview...</div>
      </div>
    </div>
  );

  if (type === 'IMAGE') return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#4a5070', marginBottom: '6px' }}>Preview</div>
      <div style={containerStyle}>
        {status === 'loading' && loadingOverlay}
        {status === 'error' && (
          <div style={{ textAlign: 'center', color: '#f87171', fontSize: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>⚠️</div>
            Can't load image — check the URL
          </div>
        )}
        <img
          src={url}
          alt="Preview"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: status === 'ok' ? 'block' : 'none' }}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      </div>
    </div>
  );

  if (type === 'VIDEO') return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#4a5070', marginBottom: '6px' }}>Preview</div>
      <div style={containerStyle}>
        {status === 'loading' && loadingOverlay}
        {status === 'error' && (
          <div style={{ textAlign: 'center', color: '#f87171', fontSize: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>⚠️</div>
            Can't load video — check the URL or format
          </div>
        )}
        <video
          src={url}
          controls
          muted
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: status === 'ok' ? 'block' : 'none', background: '#000' }}
          onLoadedMetadata={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      </div>
    </div>
  );

  if (type === 'HTML') return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#4a5070', marginBottom: '6px' }}>Preview <span style={{ color: '#2e3347' }}>· some sites block embedding</span></div>
      <div style={{ ...containerStyle, alignItems: 'stretch' }}>
        {status === 'loading' && loadingOverlay}
        {status === 'error' && (
          <div style={{ textAlign: 'center', color: '#fbbf24', fontSize: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🌐</div>
            This site blocks previewing — it will still display on screen
          </div>
        )}
        <iframe
          src={url}
          title="HTML preview"
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: '100%', border: 'none', display: status === 'ok' ? 'block' : 'none' }}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      </div>
    </div>
  );

  return null;
}

// ─── Thumbnail for item rows ──────────────────────────────────────────────────

function ItemThumbnail({ item }: { item: PlaylistItem }) {
  const [loaded, setLoaded] = useState(false);

  const box: React.CSSProperties = {
    width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden',
    flexShrink: 0, background: '#222638', display: 'flex', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  };

  if (item.type === 'IMAGE') return (
    <div style={box}>
      {!loaded && <span style={{ fontSize: '14px' }}>🖼</span>}
      <img
        src={item.url}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoad={() => setLoaded(true)}
        onError={() => {}}
      />
    </div>
  );

  if (item.type === 'VIDEO') return (
    <div style={box}>
      {!loaded && <span style={{ fontSize: '14px' }}>🎬</span>}
      <video
        src={item.url + '#t=0.5'}
        muted
        preload="metadata"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoadedMetadata={() => setLoaded(true)}
        onError={() => {}}
      />
      {loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: '10px', color: '#fff' }}>▶</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={box}>
      <span style={{ fontSize: '14px' }}>🌐</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlaylistsPage() {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'IMAGE' | 'VIDEO' | 'HTML'>('IMAGE');
  const [itemUrl, setItemUrl] = useState('');
  const [itemDuration, setItemDuration] = useState('10');
  const [saving, setSaving] = useState(false);
  const [itemTransition, setItemTransition] = useState<string>('fade');
  const [previewUrl, setPreviewUrl] = useState(''); // debounced URL for preview

  // Debounce URL input so preview doesn't fire on every keystroke
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUrlChange = (val: string) => {
    setItemUrl(val);
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => setPreviewUrl(val), 600);
  };

  // Reset preview when modal closes
  const closeAddModal = () => {
    setShowAddItemModal(false);
    setItemUrl(''); setPreviewUrl('');
    setItemType('IMAGE'); setItemDuration('10');
  };
  const closeEditModal = () => {
    setShowEditItemModal(false);
    setEditingItem(null);
    setItemUrl(''); setPreviewUrl('');
  };

  useEffect(() => {
    loadPlaylists();
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
    } catch {
      showToast('Failed to load playlists', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPlaylist({ name, description });
      setShowCreateModal(false);
      setName(''); setDescription('');
      showToast(`Playlist "${name}" created!`, 'success');
      loadPlaylists();
    } catch {
      showToast('Failed to create playlist', 'error');
    } finally { setSaving(false); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylistId) return;
    setSaving(true);
    try {
      await api.addPlaylistItem(selectedPlaylistId, {
        type: itemType, url: itemUrl, duration: parseInt(itemDuration),
        metadata: { transition: itemTransition },
      });
      closeAddModal();
      showToast('Item added!', 'success');
      loadPlaylists();
    } catch {
      showToast('Failed to add item', 'error');
    } finally { setSaving(false); }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylistId || !editingItem) return;
    setSaving(true);
    try {
      await api.updatePlaylistItem(selectedPlaylistId, editingItem.id, {
        url: itemUrl, duration: parseInt(itemDuration),
      });
      closeEditModal();
      showToast('Item updated — displays will refresh automatically', 'success');
      loadPlaylists();
    } catch {
      showToast('Failed to update item', 'error');
    } finally { setSaving(false); }
  };

  const handleMoveItem = async (playlist: any, itemId: string, direction: 'up' | 'down') => {
    const items = [...playlist.items];
    const idx = items.findIndex((i: any) => i.id === itemId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === items.length - 1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const [item, swapItem] = [items[idx], items[newIdx]];
    try {
      await Promise.all([
        api.updatePlaylistItem(playlist.id, item.id, { metadata: item.metadata }),
        api.updatePlaylistItem(playlist.id, swapItem.id, { metadata: swapItem.metadata }),
      ]);
      const reordered = [...items];
      [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
      await api.reorderPlaylistItems(playlist.id, reordered.map((i: any) => i.id));
      loadPlaylists();
    } catch { showToast('Failed to reorder items', 'error'); }
  };

  const openEditItem = (playlistId: string, item: PlaylistItem) => {
    setSelectedPlaylistId(playlistId);
    setEditingItem(item);
    setItemUrl(item.url);
    setPreviewUrl(item.url); // show preview immediately for existing items
    setItemDuration(String(item.duration));
    setItemType(item.type);
    setShowEditItemModal(true);
  };

  const handleDeletePlaylist = async (id: string, pname: string) => {
    if (!confirm(`Delete "${pname}"? This cannot be undone.`)) return;
    try {
      await api.deletePlaylist(id);
      showToast('Playlist deleted', 'info');
      loadPlaylists();
    } catch { showToast('Failed to delete playlist', 'error'); }
  };

  const handleDeleteItem = async (playlistId: string, itemId: string) => {
    try {
      await api.deletePlaylistItem(playlistId, itemId);
      showToast('Item removed', 'info');
      loadPlaylists();
    } catch { showToast('Failed to remove item', 'error'); }
  };

  const handleToggleActive = async (playlist: Playlist) => {
    try {
      await api.updatePlaylist(playlist.id, { isActive: !playlist.isActive });
      showToast(`Playlist ${!playlist.isActive ? 'activated' : 'deactivated'}`, 'success');
      loadPlaylists();
    } catch { showToast('Failed to update playlist', 'error'); }
  };

  const handleDuplicatePlaylist = async (playlist: Playlist) => {
    try {
      const newPlaylist = await api.createPlaylist({ name: `${playlist.name} (Copy)`, description: playlist.description });
      for (const item of playlist.items) {
        await api.addPlaylistItem(newPlaylist.id, { type: item.type, url: item.url, duration: item.duration });
      }
      showToast(`Duplicated as "${playlist.name} (Copy)"`, 'success');
      loadPlaylists();
    } catch { showToast('Failed to duplicate', 'error'); }
  };

  const getTypeStyle = (type: string) => {
    if (type === 'IMAGE') return { bg: 'rgba(124,143,255,0.15)', color: '#7c8fff' };
    if (type === 'VIDEO') return { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
    return { bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
  };

  const filtered = playlists.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#8b91b0' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '12px' }} />
      Loading playlists...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const inp: React.CSSProperties = {
    background: '#1a1e2b', border: '1px solid #242838', color: '#e2e4ed',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
    width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };

  const typeHint: Record<'IMAGE' | 'VIDEO' | 'HTML', string> = {
    IMAGE: 'https://drive.google.com/uc?export=view&id=... or any .jpg / .png',
    VIDEO: 'https://example.com/ad.mp4',
    HTML: 'https://example.com/page',
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .playlist-card { transition: border-color 0.15s ease; }
        .playlist-card:hover { border-color: #2e3347 !important; }
        .item-row:hover { background: #222638 !important; }
        .item-row { transition: background 0.15s ease; }
        .dropdown-item:hover { background: #242838 !important; color: #e2e4ed !important; }
        .dropdown-danger:hover { background: rgba(248,113,113,0.1) !important; color: #f87171 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e4ed', letterSpacing: '-0.5px' }}>Playlists</h1>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginTop: '4px' }}>
            {playlists.length} playlists · {playlists.filter(p => p.isActive).length} active
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + Create Playlist
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a5070', fontSize: '13px' }}>🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playlists..."
          style={{ ...inp, paddingLeft: '36px' }}
          onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', background: '#13161f', border: '1px solid #242838', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>▶</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#e2e4ed', marginBottom: '6px' }}>
            {search ? 'No playlists match your search' : 'No playlists yet'}
          </h3>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '20px' }}>
            {search ? 'Try a different search' : 'Create a playlist and add images, videos or web pages'}
          </p>
          {!search && (
            <button onClick={() => setShowCreateModal(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              + Create First Playlist
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filtered.map((playlist) => (
            <div key={playlist.id} className="playlist-card" style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Card Header */}
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #242838' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,143,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>▶</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e4ed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.name}</div>
                      {playlist.description && (
                        <div style={{ fontSize: '11px', color: '#4a5070', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.description}</div>
                      )}
                    </div>
                  </div>

                  {/* 3-dot menu */}
                  <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenMenuId(openMenuId === playlist.id ? null : playlist.id)}
                      style={{ background: 'none', border: 'none', color: '#4a5070', cursor: 'pointer', padding: '4px 8px', borderRadius: '5px', fontSize: '16px' }}>···</button>
                    {openMenuId === playlist.id && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#1a1e2b', border: '1px solid #2e3347', borderRadius: '10px', minWidth: '160px', zIndex: 200, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {[
                          { label: playlist.isActive ? '⏸ Deactivate' : '▶ Activate', action: () => handleToggleActive(playlist) },
                          { label: '⧉ Duplicate', action: () => handleDuplicatePlaylist(playlist) },
                        ].map(item => (
                          <button key={item.label} className="dropdown-item" onClick={() => { item.action(); setOpenMenuId(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px', color: '#8b91b0', cursor: 'pointer', width: '100%', border: 'none', background: 'none', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                            {item.label}
                          </button>
                        ))}
                        <div style={{ height: '1px', background: '#242838', margin: '4px 0' }} />
                        <button className="dropdown-item dropdown-danger" onClick={() => { handleDeletePlaylist(playlist.id, playlist.name); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', cursor: 'pointer', width: '100%', border: 'none', background: 'none', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#4a5070' }}>
                  <span>{playlist.items.length} items</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: playlist.isActive ? '#34d399' : '#4a5070', display: 'inline-block' }} />
                    {playlist.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggleActive(playlist)}
                    style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: playlist.isActive ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', color: playlist.isActive ? '#f87171' : '#34d399' }}>
                    {playlist.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Items */}
              <div style={{ flex: 1, maxHeight: '220px', overflowY: 'auto', padding: '10px 12px' }}>
                {playlist.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#4a5070', fontSize: '12px' }}>No items yet</div>
                ) : playlist.items.map((item) => {
                  const ts = getTypeStyle(item.type);
                  return (
                    <div key={item.id} className="item-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '7px', marginBottom: '4px', background: '#1a1e2b' }}>
                      {/* Reorder buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button onClick={() => handleMoveItem(playlist, item.id, 'up')}
                          style={{ width: '18px', height: '16px', border: 'none', background: 'transparent', color: '#4a5070', cursor: 'pointer', fontSize: '10px', padding: 0, lineHeight: 1 }}>▲</button>
                        <button onClick={() => handleMoveItem(playlist, item.id, 'down')}
                          style={{ width: '18px', height: '16px', border: 'none', background: 'transparent', color: '#4a5070', cursor: 'pointer', fontSize: '10px', padding: 0, lineHeight: 1 }}>▼</button>
                      </div>

                      {/* Thumbnail — now works for video too */}
                      <ItemThumbnail item={item} />

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', background: ts.bg, color: ts.color }}>{item.type}</span>
                          <span style={{ fontSize: '10px', color: '#4a5070' }}>{item.duration}s</span>
                          {(item.metadata as any)?.transition && (item.metadata as any).transition !== 'none' && (
                            <span style={{ fontSize: '9px', color: '#4a5070', background: '#242838', padding: '1px 5px', borderRadius: '3px' }}>
                              {(item.metadata as any).transition}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8b91b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url}</div>
                      </div>
                      <button onClick={() => openEditItem(playlist.id, item)}
                        style={{ width: '22px', height: '22px', border: 'none', background: 'rgba(124,143,255,0.12)', color: '#7c8fff', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>✏</button>
                      <button onClick={() => handleDeleteItem(playlist.id, item.id)}
                        style={{ width: '22px', height: '22px', border: 'none', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Add Item */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #242838' }}>
                <button
                  onClick={() => { setSelectedPlaylistId(playlist.id); setShowAddItemModal(true); }}
                  style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed #2e3347', borderRadius: '7px', color: '#8b91b0', fontSize: '13px', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#7c8fff'; (e.target as HTMLButtonElement).style.color = '#7c8fff'; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#2e3347'; (e.target as HTMLButtonElement).style.color = '#8b91b0'; }}
                >+ Add Item</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE PLAYLIST MODAL ── */}
      {showCreateModal && (
        <div onClick={() => setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '24px' }}>Create Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Promo" required style={inp} autoFocus
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this playlist for?" style={{ ...inp, minHeight: '80px', resize: 'vertical' as const }}
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving || !name} style={{ flex: 2, padding: '11px', background: saving || !name ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD ITEM MODAL ── */}
      {showAddItemModal && (
        <div onClick={closeAddModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '6px' }}>Add Item</h2>
            <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '24px' }}>Paste a URL — preview loads automatically</p>
            <form onSubmit={handleAddItem}>

              {/* Type selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Content Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['IMAGE', 'VIDEO', 'HTML'] as const).map(t => (
                    <button key={t} type="button" onClick={() => { setItemType(t); setPreviewUrl(itemUrl); }}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid', borderColor: itemType === t ? '#7c8fff' : '#242838', background: itemType === t ? 'rgba(124,143,255,0.12)' : 'transparent', color: itemType === t ? '#7c8fff' : '#8b91b0', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                      {t === 'IMAGE' ? '🖼' : t === 'VIDEO' ? '🎬' : '🌐'} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL input */}
              <div style={{ marginBottom: '4px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>
                  {itemType === 'HTML' ? 'Web Page URL' : itemType === 'VIDEO' ? 'Video URL' : 'Image URL'}
                </label>
                <input type="url" value={itemUrl} onChange={e => handleUrlChange(e.target.value)}
                  placeholder={typeHint[itemType]}
                  required style={inp} autoFocus
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>

              {/* Live preview — appears as you type */}
              {previewUrl && <ItemPreview url={previewUrl} type={itemType} height={160} />}

              {/* Transition */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Transition Effect</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'none', label: '✕ None' }, { id: 'fade', label: '✦ Fade' },
                    { id: 'slide-left', label: '→ Slide In' }, { id: 'slide-right', label: '← Slide Out' },
                    { id: 'slide-up', label: '↑ Slide Up' }, { id: 'zoom-in', label: '⊕ Zoom In' },
                    { id: 'zoom-out', label: '⊖ Zoom Out' }, { id: 'blur', label: '◎ Blur' },
                    { id: 'wipe', label: '▷ Wipe' },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => setItemTransition(t.id)}
                      style={{ padding: '7px 4px', borderRadius: '7px', border: '1px solid', fontSize: '11px', fontWeight: '500', cursor: 'pointer', borderColor: itemTransition === t.id ? '#7c8fff' : '#242838', background: itemTransition === t.id ? 'rgba(124,143,255,0.12)' : 'transparent', color: itemTransition === t.id ? '#7c8fff' : '#8b91b0' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Duration (seconds)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {[5, 10, 15, 30, 60].map(d => (
                    <button key={d} type="button" onClick={() => setItemDuration(String(d))}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid', borderColor: itemDuration === String(d) ? '#7c8fff' : '#242838', background: itemDuration === String(d) ? 'rgba(124,143,255,0.12)' : 'transparent', color: itemDuration === String(d) ? '#7c8fff' : '#8b91b0', fontSize: '12px', cursor: 'pointer' }}>
                      {d}s
                    </button>
                  ))}
                </div>
                <input type="number" value={itemDuration} onChange={e => setItemDuration(e.target.value)} min="1" max="3600" required style={inp}
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={closeAddModal} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving || !itemUrl} style={{ flex: 2, padding: '11px', background: saving || !itemUrl ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving || !itemUrl ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ITEM MODAL ── */}
      {showEditItemModal && editingItem && (
        <div onClick={closeEditModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '6px' }}>Edit Item</h2>
            <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '24px' }}>Changes push to all displays automatically</p>
            <form onSubmit={handleEditItem}>

              <div style={{ marginBottom: '4px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>URL</label>
                <input type="url" value={itemUrl} onChange={e => handleUrlChange(e.target.value)} required style={inp} autoFocus
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>

              {/* Preview — pre-loaded with existing item's URL */}
              {previewUrl && <ItemPreview url={previewUrl} type={itemType} height={160} />}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#8b91b0', marginBottom: '8px' }}>Duration (seconds)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {[5, 10, 15, 30, 60].map(d => (
                    <button key={d} type="button" onClick={() => setItemDuration(String(d))}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid', borderColor: itemDuration === String(d) ? '#7c8fff' : '#242838', background: itemDuration === String(d) ? 'rgba(124,143,255,0.12)' : 'transparent', color: itemDuration === String(d) ? '#7c8fff' : '#8b91b0', fontSize: '12px', cursor: 'pointer' }}>
                      {d}s
                    </button>
                  ))}
                </div>
                <input type="number" value={itemDuration} onChange={e => setItemDuration(e.target.value)} min="1" max="3600" required style={inp}
                  onFocus={e => (e.target.style.borderColor = '#7c8fff')} onBlur={e => (e.target.style.borderColor = '#242838')} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={closeEditModal} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', background: saving ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
