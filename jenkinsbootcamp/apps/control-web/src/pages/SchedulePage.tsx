import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Screen, Playlist } from '../types';

interface Campaign {
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
  impressions?: number;
}

const CLUSTERS = [
  { id: 'RETAIL',        icon: '🛒', label: 'Retail' },
  { id: 'ENTERTAINMENT', icon: '🎭', label: 'Entertainment' },
  { id: 'CORPORATE',     icon: '🏢', label: 'Corporate' },
  { id: 'PUBLIC',        icon: '🏛',  label: 'Public' },
  { id: 'HEALTHCARE',    icon: '🏥', label: 'Healthcare' },
  { id: 'EDUCATION',     icon: '🎓', label: 'Education' },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  SCHEDULED: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  ACTIVE:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  PAUSED:    { color: '#8b91b0', bg: 'rgba(139,145,176,0.12)' },
  COMPLETED: { color: '#7c8fff', bg: 'rgba(124,143,255,0.12)' },
  CANCELLED: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#8b91b0', marginBottom: '6px', fontWeight: '500',
};

// Extract date and time strings from ISO string for form inputs
function splitDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().slice(0, 5);
    return { date, time };
  } catch {
    return { date: '', time: '08:00' };
  }
}

export function SchedulePage() {
  const { showToast } = useToast();
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [playlists, setPlaylists]   = useState<Playlist[]>([]);
  const [screens,   setScreens]     = useState<Screen[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [saving,    setSaving]      = useState(false);
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null);

  // null = closed, undefined = create mode, Campaign = edit mode
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null | undefined>(undefined);
  const modalOpen = editingCampaign !== undefined;
  const isEditing = editingCampaign !== null && editingCampaign !== undefined;

  // Form fields (shared between create + edit)
  const [name,            setName]            = useState('');
  const [description,     setDescription]     = useState('');
  const [playlistId,      setPlaylistId]      = useState('');
  const [startDate,       setStartDate]       = useState('');
  const [startTime,       setStartTime]       = useState('08:00');
  const [endDate,         setEndDate]         = useState('');
  const [endTime,         setEndTime]         = useState('22:00');
  const [targetClusters,  setTargetClusters]  = useState<string[]>([]);
  const [targetScreenIds, setTargetScreenIds] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, p, s] = await Promise.all([
        api.getCampaigns().catch(() => []),
        api.getPlaylists().catch(() => []),
        api.getScreens().catch(() => []),
      ]);
      setCampaigns(c); setPlaylists(p); setScreens(s);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  // ── Open modal ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setName(''); setDescription(''); setPlaylistId('');
    setStartDate(''); setStartTime('08:00');
    setEndDate(''); setEndTime('22:00');
    setTargetClusters([]); setTargetScreenIds([]);
    setEditingCampaign(null); // null = create mode, modal open
  };

  const openEdit = (c: Campaign) => {
    const start = splitDateTime(c.startDate);
    const end   = splitDateTime(c.endDate);
    setName(c.name);
    setDescription(c.description ?? '');
    setPlaylistId(c.playlistId ?? '');
    setStartDate(start.date);
    setStartTime(start.time);
    setEndDate(end.date);
    setEndTime(end.time);
    setTargetClusters(c.targetClusters ?? []);
    setTargetScreenIds(c.targetScreenIds ?? []);
    setEditingCampaign(c);
  };

  const closeModal = () => setEditingCampaign(undefined);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const toggleCluster = (id: string) =>
    setTargetClusters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const toggleScreen = (id: string) =>
    setTargetScreenIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const resolvedScreenCount = screens.filter(s =>
    targetScreenIds.includes(s.id) ||
    (s.cluster && targetClusters.includes(s.cluster))
  ).length;

  // ── Save (create or update) ─────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) { showToast('Fill in start and end dates', 'error'); return; }
    if (targetClusters.length === 0 && targetScreenIds.length === 0) {
      showToast('Select at least one cluster or screen', 'error'); return;
    }
    const startISO = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endISO   = new Date(`${endDate}T${endTime}:00`).toISOString();
    if (new Date(startISO) >= new Date(endISO)) { showToast('End must be after start', 'error'); return; }

    setSaving(true);
    try {
      if (isEditing && editingCampaign) {
        // ── EDIT ──
        await api.updateCampaign(editingCampaign.id, {
          name, description,
          startDate: startISO, endDate: endISO,
          playlistId: playlistId || undefined,
          targetClusters, targetScreenIds,
        });
        showToast(`Campaign "${name}" updated`, 'success');
      } else {
        // ── CREATE ──
        await api.createCampaign({
          name, description,
          startDate: startISO, endDate: endISO,
          playlistId: playlistId || undefined,
          targetClusters, targetScreenIds,
        });
        showToast(`Campaign "${name}" scheduled!`, 'success');
      }
      closeModal();
      loadData();
    } catch (err: any) {
      showToast(`Failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally { setSaving(false); }
  };

  // ── Other actions ───────────────────────────────────────────────────────────

  const handleDelete = async (id: string, cname: string) => {
    if (!confirm(`Cancel campaign "${cname}"? This cannot be undone.`)) return;
    try { await api.deleteCampaign(id); showToast('Campaign cancelled', 'info'); loadData(); }
    catch (err: any) { showToast(`Failed: ${err?.message || 'error'}`, 'error'); }
  };

  const handleTogglePause = async (campaign: Campaign) => {
    const next = campaign.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    try {
      await api.updateCampaign(campaign.id, { status: next });
      showToast(`Campaign ${next === 'ACTIVE' ? 'resumed' : 'paused'}`, 'success');
      loadData();
    } catch (err: any) { showToast(`Failed: ${err?.message || 'error'}`, 'error'); }
  };

  // ── Formatting ──────────────────────────────────────────────────────────────

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };
  const fmtTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const affectedScreensCount = (c: Campaign) =>
    screens.filter(s =>
      c.targetScreenIds?.includes(s.id) ||
      (s.cluster && c.targetClusters?.includes(s.cluster))
    ).length;

  const canEdit = (c: Campaign) =>
    ['SCHEDULED', 'ACTIVE', 'PAUSED'].includes(c.status);

  const scheduled        = campaigns.filter(c => c.status === 'SCHEDULED').length;
  const active           = campaigns.filter(c => c.status === 'ACTIVE').length;
  const completed        = campaigns.filter(c => c.status === 'COMPLETED').length;
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#8b91b0' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '12px' }} />
      Loading schedule...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Shared modal form ───────────────────────────────────────────────────────

  const isLiveEdit = isEditing && editingCampaign?.status === 'ACTIVE';

  const CampaignModal = () => (
    <div onClick={closeModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e4ed', marginBottom: '4px' }}>
          {isEditing ? `Edit Campaign` : 'New Campaign'}
        </h2>
        <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: isLiveEdit ? '12px' : '24px' }}>
          {isEditing ? `Editing "${editingCampaign?.name}"` : 'Target specific clusters or screens at specific times'}
        </p>

        {/* Warning for live campaigns */}
        {isLiveEdit && (
          <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#fbbf24' }}>
            ⚠️ This campaign is <strong>live right now</strong>. Changes to targets or playlist will take effect immediately on affected screens.
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Campaign Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Drink Up Summer Campaign" className="sched-input" />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Client name, notes..." className="sched-input" />
          </div>

          {/* Playlist */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Playlist *</label>
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)} required className="sched-input">
              <option value="">Select playlist (ad content)...</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name} · {p.items?.length ?? 0} items</option>)}
            </select>
            {playlists.length === 0 && <p style={{ fontSize: '11px', color: '#fbbf24', marginTop: '6px' }}>⚠️ Create a playlist first</p>}
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div>
              <label style={lbl}>Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="sched-input" />
            </div>
            <div>
              <label style={lbl}>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="sched-input" />
            </div>
            <div>
              <label style={lbl}>End Date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="sched-input" />
            </div>
            <div>
              <label style={lbl}>End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="sched-input" />
            </div>
          </div>

          {/* Target by Cluster */}
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Target by Cluster</label>
            <p style={{ fontSize: '11px', color: '#4a5070', marginBottom: '8px' }}>
              All screens in these clusters will receive the campaign playlist
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {CLUSTERS.map(cl => {
                const count = screens.filter(s => s.cluster === cl.id).length;
                const selected = targetClusters.includes(cl.id);
                return (
                  <button key={cl.id} type="button" onClick={() => toggleCluster(cl.id)} className="cluster-chip"
                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', textAlign: 'left', fontSize: '12px', fontWeight: '500', transition: 'all 0.15s', borderColor: selected ? '#a78bfa' : '#242838', background: selected ? 'rgba(167,139,250,0.12)' : 'transparent', color: selected ? '#a78bfa' : '#8b91b0' }}>
                    {cl.icon} {cl.label}
                    <span style={{ float: 'right', fontSize: '10px', opacity: 0.6 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Specific Screens */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Or pick specific screens</label>
            {screens.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#4a5070', fontStyle: 'italic' }}>No screens paired yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto', background: '#0d0f14', borderRadius: '8px', padding: '8px' }}>
                {screens.map(s => {
                  const selected = targetScreenIds.includes(s.id);
                  return (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '6px', cursor: 'pointer', background: selected ? 'rgba(124,143,255,0.08)' : 'transparent' }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleScreen(s.id)}
                        style={{ accentColor: '#7c8fff', width: '14px', height: '14px' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.status === 'ONLINE' ? '#34d399' : '#f87171', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500', flex: 1 }}>{s.name || 'Unnamed'}</span>
                      {s.cluster && <span style={{ fontSize: '10px', color: '#7c8fff', background: 'rgba(124,143,255,0.1)', padding: '1px 6px', borderRadius: '10px' }}>{s.cluster}</span>}
                      {s.venueName && <span style={{ fontSize: '10px', color: '#4a5070' }}>{s.venueName}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reach preview */}
          {(targetClusters.length > 0 || targetScreenIds.length > 0) && (
            <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#34d399' }}>
              📡 This campaign will reach <strong>{resolvedScreenCount} screen{resolvedScreenCount !== 1 ? 's' : ''}</strong>
              {targetClusters.length > 0 && ` across ${targetClusters.length} cluster${targetClusters.length > 1 ? 's' : ''}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={closeModal}
              style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '11px', background: saving ? '#1a1e2b' : 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : isEditing ? '💾 Save Changes' : 'Schedule Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Page ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1200px' }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sched-input { background:#1a1e2b; border:1px solid #242838; color:#e2e4ed; border-radius:8px; padding:10px 14px; font-size:13px; width:100%; box-sizing:border-box; font-family:Inter,sans-serif; }
        .sched-input:focus { outline:none; border-color:#7c8fff; }
        .camp-card { transition: border-color 0.15s ease; }
        .camp-card:hover { border-color: #2e3347 !important; }
        .cluster-chip:hover { border-color: #a78bfa !important; }
        .act-btn { transition: all 0.15s ease; }
        .act-btn:hover { border-color: #7c8fff !important; color: #7c8fff !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e4ed', letterSpacing: '-0.5px' }}>Schedule</h1>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginTop: '4px' }}>
            {active > 0 ? `${active} campaign${active > 1 ? 's' : ''} live · ` : ''}{scheduled} upcoming · {completed} completed
          </p>
        </div>
        <button onClick={openCreate}
          style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + New Campaign
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Live Now',    value: active,           color: '#34d399', icon: '📡' },
          { label: 'Upcoming',    value: scheduled,        color: '#fbbf24', icon: '📅' },
          { label: 'Completed',   value: completed,        color: '#7c8fff', icon: '✓' },
          { label: 'Impressions', value: totalImpressions, color: '#a78bfa', icon: '👁' },
        ].map(card => (
          <div key={card.label} style={{ background: '#13161f', border: '1px solid #242838', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{card.icon}</span>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.color, animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#e2e4ed', letterSpacing: '-1px' }}>{card.value}</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#8b91b0', marginTop: '2px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', background: '#13161f', border: '1px solid #242838', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#e2e4ed', marginBottom: '6px' }}>No campaigns yet</h3>
          <p style={{ fontSize: '13px', color: '#8b91b0', marginBottom: '20px' }}>Create a campaign to push ads to specific screens or clusters</p>
          <button onClick={openCreate}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            + New Campaign
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {campaigns.map(c => {
            const ss = STATUS_STYLE[c.status] ?? STATUS_STYLE.SCHEDULED;
            const affected = affectedScreensCount(c);
            const isLive = c.status === 'ACTIVE';
            return (
              <div key={c.id} className="camp-card"
                style={{ background: '#13161f', border: `1px solid ${isLive ? 'rgba(52,211,153,0.3)' : '#242838'}`, borderRadius: '12px', padding: '20px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>

                  {/* Left */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e4ed' }}>{c.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', background: ss.bg, color: ss.color }}>
                        {c.status}{isLive ? ' 🟢' : ''}
                      </span>
                    </div>

                    {c.description && <p style={{ fontSize: '12px', color: '#8b91b0', marginBottom: '8px' }}>{c.description}</p>}

                    {/* Cluster + screen badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                      {(c.targetClusters ?? []).map(cl => {
                        const info = CLUSTERS.find(x => x.id === cl);
                        return (
                          <span key={cl} style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                            {info?.icon} {info?.label ?? cl}
                          </span>
                        );
                      })}
                      {(c.targetScreenIds ?? []).length > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,143,255,0.12)', color: '#7c8fff', border: '1px solid rgba(124,143,255,0.2)' }}>
                          🖥 {c.targetScreenIds.length} screen{c.targetScreenIds.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {!(c.targetClusters?.length) && !(c.targetScreenIds?.length) && (
                        <span style={{ fontSize: '10px', color: '#4a5070', fontStyle: 'italic' }}>No targets set</span>
                      )}
                    </div>

                    {/* Dates */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8b91b0' }}>
                      <span>📅</span>
                      <span>{fmt(c.startDate)} {fmtTime(c.startDate)}</span>
                      <span style={{ color: '#4a5070' }}>→</span>
                      <span>{fmt(c.endDate)} {fmtTime(c.endDate)}</span>
                    </div>
                  </div>

                  {/* Right — stats + actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#a78bfa' }}>{c.impressions ?? 0}</div>
                        <div style={{ fontSize: '10px', color: '#4a5070' }}>IMPRESSIONS</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#7c8fff' }}>{affected}</div>
                        <div style={{ fontSize: '10px', color: '#4a5070' }}>SCREENS</div>
                      </div>
                      {c.playlist && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>{c.playlist.items?.length ?? 0}</div>
                          <div style={{ fontSize: '10px', color: '#4a5070' }}>AD ITEMS</div>
                        </div>
                      )}
                    </div>

                    {c.playlist && (
                      <span style={{ fontSize: '11px', color: '#8b91b0', background: '#1a1e2b', padding: '3px 8px', borderRadius: '6px' }}>
                        ▶ {c.playlist.name}
                      </span>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setReportCampaign(c)} className="act-btn"
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', color: '#a78bfa', fontSize: '12px', cursor: 'pointer' }}>
                        📊 Report
                      </button>
                      {canEdit(c) && (
                        <button onClick={() => openEdit(c)} className="act-btn"
                          style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #242838', borderRadius: '6px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer' }}>
                          ✏️ Edit
                        </button>
                      )}
                      {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                        <button onClick={() => handleTogglePause(c)} className="act-btn"
                          style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #242838', borderRadius: '6px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer' }}>
                          {c.status === 'ACTIVE' ? '⏸ Pause' : '▶ Resume'}
                        </button>
                      )}
                      {(c.status === 'SCHEDULED' || c.status === 'PAUSED') && (
                        <button onClick={() => handleDelete(c.id, c.name)}
                          style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      )}
                      {(c.status === 'COMPLETED' || c.status === 'CANCELLED') && (
                        <button onClick={() => handleDelete(c.id, c.name)}
                          style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', color: '#4a5070', fontSize: '12px', cursor: 'pointer' }}>
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal (shared for create + edit) */}
      {modalOpen && <CampaignModal />}

      {/* Report modal */}
      {reportCampaign && (
        <ReportModal campaign={reportCampaign} screens={screens} onClose={() => setReportCampaign(null)} />
      )}
    </div>
  );
}


// ─── Self-contained Proof-of-Play Report Modal ───────────────────────────────
// Works entirely from data already loaded in the Schedule page — no API call needed.

export function ReportModal({
  campaign,
  screens,
  onClose,
}: {
  campaign: Campaign;
  screens: Screen[];
  onClose: () => void;
}) {
  // Resolve which screens this campaign actually ran on
  const affectedScreens = screens.filter(s =>
    campaign.targetScreenIds?.includes(s.id) ||
    (s.cluster && campaign.targetClusters?.includes(s.cluster))
  );

  const fmt = (d: string, includeTime = true) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      });
    } catch { return d; }
  };

  const daysRan = () => {
    try {
      const diff = new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime();
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch { return 1; }
  };

  const totalImpressions = campaign.impressions ?? 0;
  const days = daysRan();
  const avgPerDay = days > 0 ? Math.round(totalImpressions / days) : 0;
  const avgPerScreen = affectedScreens.length > 0 ? Math.round(totalImpressions / affectedScreens.length) : 0;

  const statusStyle = STATUS_STYLE[campaign.status] ?? STATUS_STYLE.SCHEDULED;

  // Generate printable HTML for download
  const handleDownload = () => {
    const html = generateReportHTML(campaign, affectedScreens, totalImpressions, days, avgPerDay, avgPerScreen, fmt);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AdHive-Report-${campaign.name.replace(/[^a-z0-9]/gi, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#13161f', border: '1px solid #2e3347', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif' }}
      >
        <div style={{ padding: '28px 32px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#7c8fff', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                📊 Proof-of-Play Report
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#e2e4ed', margin: '0 0 6px' }}>
                {campaign.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#8b91b0' }}>
                  {fmt(campaign.startDate)} → {fmt(campaign.endDate)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', background: statusStyle.bg, color: statusStyle.color }}>
                  {campaign.status}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={handleDownload}
                style={{ padding: '8px 14px', background: 'rgba(124,143,255,0.12)', border: '1px solid rgba(124,143,255,0.3)', borderRadius: '8px', color: '#7c8fff', fontSize: '12px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                ⬇ Download
              </button>
              <button
                onClick={onClose}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer' }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* ── Summary Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', marginBottom: '24px' }}>
            {[
              { icon: '👁', label: 'Impressions', value: totalImpressions, color: '#a78bfa' },
              { icon: '🖥', label: 'Screens',     value: affectedScreens.length, color: '#7c8fff' },
              { icon: '📅', label: 'Days',        value: days,          color: '#34d399' },
              { icon: '📈', label: 'Avg / Day',   value: avgPerDay,     color: '#fbbf24' },
              { icon: '📡', label: 'Avg / Screen',value: avgPerScreen,  color: '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ background: '#1a1e2b', border: '1px solid #242838', borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '15px', marginBottom: '6px' }}>{s.icon}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#4a5070', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Campaign Details ── */}
          <div style={{ background: '#1a1e2b', border: '1px solid #242838', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#4a5070', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Campaign Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {[
                { label: 'Playlist', value: campaign.playlist?.name ?? '—' },
                { label: 'Ad Items', value: `${campaign.playlist?.items?.length ?? 0} items` },
                { label: 'Target Clusters', value: campaign.targetClusters?.length > 0 ? campaign.targetClusters.join(', ') : 'None' },
                { label: 'Specific Screens', value: campaign.targetScreenIds?.length > 0 ? `${campaign.targetScreenIds.length} selected` : 'None' },
                { label: 'Start', value: fmt(campaign.startDate) },
                { label: 'End', value: fmt(campaign.endDate) },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #242838', gridColumn: i === 4 || i === 5 ? 'span 1' : 'span 1' }}>
                  <span style={{ fontSize: '11px', color: '#4a5070' }}>{row.label}</span>
                  <span style={{ fontSize: '12px', color: '#e2e4ed', fontWeight: '500', textAlign: 'right', maxWidth: '55%' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Screen Breakdown ── */}
          {affectedScreens.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e4ed', marginBottom: '10px' }}>Screen Breakdown</div>
              <div style={{ border: '1px solid #242838', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1a1e2b' }}>
                      {['Screen', 'Venue', 'Cluster', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#4a5070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affectedScreens.map((s, i) => (
                      <tr key={s.id} style={{ borderTop: '1px solid #242838', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '500', color: '#e2e4ed' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: s.status === 'ONLINE' ? '#34d399' : '#f87171' }} />
                            {s.name}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#8b91b0' }}>
                          {s.venueName ?? <span style={{ color: '#2e3347' }}>—</span>}
                          {s.area ? <span style={{ fontSize: '11px', color: '#4a5070' }}> · {s.area}</span> : null}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {s.cluster
                            ? <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,143,255,0.12)', color: '#7c8fff' }}>{s.cluster}</span>
                            : <span style={{ color: '#2e3347' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: s.status === 'ONLINE' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: s.status === 'ONLINE' ? '#34d399' : '#f87171' }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', color: '#fbbf24', fontSize: '13px', marginBottom: '20px' }}>
              ⚠️ No screens matched this campaign's targets. Check that your screens have the correct cluster tags set.
            </div>
          )}

          {/* ── Ad Items ── */}
          {(campaign.playlist?.items?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e4ed', marginBottom: '10px' }}>Ad Content</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {campaign.playlist!.items.map((item, i) => {
                  const name = (() => {
                    try {
                      const parts = new URL(item.url).pathname.split('/');
                      return parts[parts.length - 1] || item.url;
                    } catch { return item.url.length > 50 ? item.url.slice(0, 50) + '…' : item.url; }
                  })();
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#1a1e2b', border: '1px solid #242838', borderRadius: '8px', padding: '10px 14px' }}>
                      <span style={{ fontSize: '13px', color: '#4a5070', fontWeight: '600', width: '20px', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', flexShrink: 0 }}>{item.type}</span>
                      <span style={{ fontSize: '12px', color: '#8b91b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <span style={{ fontSize: '11px', color: '#4a5070', flexShrink: 0 }}>{item.duration}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Impressions note ── */}
          {totalImpressions === 0 && campaign.status !== 'SCHEDULED' && (
            <div style={{ padding: '12px 16px', background: 'rgba(139,145,176,0.08)', border: '1px solid #242838', borderRadius: '10px', color: '#8b91b0', fontSize: '12px', marginBottom: '16px' }}>
              💡 Impression counts will appear here once the display tablets start playing this campaign's playlist. Make sure v8 of the display app is deployed.
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #242838', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#4a5070' }}>
            <span>AdHive Network · Proof-of-Play Report</span>
            <span>Generated {fmt(new Date().toISOString())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generate downloadable HTML report ────────────────────────────────────────

function generateReportHTML(
  campaign: Campaign,
  screens: Screen[],
  totalImpressions: number,
  days: number,
  avgPerDay: number,
  avgPerScreen: number,
  fmt: (d: string, t?: boolean) => string,
): string {
  const statusColors: Record<string, string> = {
    SCHEDULED: '#f59e0b', ACTIVE: '#10b981', PAUSED: '#6b7280', COMPLETED: '#6366f1', CANCELLED: '#ef4444',
  };
  const statusColor = statusColors[campaign.status] ?? '#6366f1';

  const screensRows = screens.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.venueName ?? '—'}${s.area ? ` · ${s.area}` : ''}</td>
      <td>${s.cluster ?? '—'}</td>
      <td><span style="color:${s.status === 'ONLINE' ? '#10b981' : '#ef4444'}">${s.status}</span></td>
    </tr>
  `).join('');

  const itemsRows = (campaign.playlist?.items ?? []).map((item, i) => {
    const name = (() => { try { const p = new URL(item.url).pathname.split('/'); return p[p.length - 1] || item.url; } catch { return item.url; } })();
    return `<tr><td>${i + 1}</td><td>${item.type}</td><td>${name}</td><td>${item.duration}s</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AdHive Report — ${campaign.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 13px; }
  .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  h1 { font-size: 26px; font-weight: 800; color: #111; margin-bottom: 6px; }
  .dates { font-size: 12px; color: #6b7280; }
  .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: 20px; background: ${statusColor}22; color: ${statusColor}; margin-left: 10px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
  .stat { background: #f8f8ff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 800; color: #4f46e5; }
  .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
  h2 { font-size: 14px; font-weight: 700; color: #111; margin: 0 0 10px; }
  .section { margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 700; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 28px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="brand">AdHive Network · Proof-of-Play Report</div>
  <h1>${campaign.name} <span class="badge">${campaign.status}</span></h1>
  <div class="dates">${fmt(campaign.startDate)} → ${fmt(campaign.endDate)}</div>
  ${campaign.description ? `<div style="margin-top:6px;color:#6b7280;font-size:12px">${campaign.description}</div>` : ''}
</div>

<div class="stats">
  <div class="stat"><div class="stat-value">${totalImpressions}</div><div class="stat-label">Impressions</div></div>
  <div class="stat"><div class="stat-value">${screens.length}</div><div class="stat-label">Screens</div></div>
  <div class="stat"><div class="stat-value">${days}</div><div class="stat-label">Days</div></div>
  <div class="stat"><div class="stat-value">${avgPerDay}</div><div class="stat-label">Avg/Day</div></div>
  <div class="stat"><div class="stat-value">${avgPerScreen}</div><div class="stat-label">Avg/Screen</div></div>
</div>

<div class="section">
  <h2>Campaign Details</h2>
  <table>
    <tr><td><strong>Playlist</strong></td><td>${campaign.playlist?.name ?? '—'}</td><td><strong>Ad Items</strong></td><td>${campaign.playlist?.items?.length ?? 0}</td></tr>
    <tr><td><strong>Target Clusters</strong></td><td>${campaign.targetClusters?.join(', ') || 'None'}</td><td><strong>Specific Screens</strong></td><td>${campaign.targetScreenIds?.length || 0} selected</td></tr>
  </table>
</div>

${screens.length > 0 ? `
<div class="section">
  <h2>Screen Breakdown</h2>
  <table>
    <thead><tr><th>Screen</th><th>Venue</th><th>Cluster</th><th>Status</th></tr></thead>
    <tbody>${screensRows}</tbody>
  </table>
</div>` : ''}

${itemsRows ? `
<div class="section">
  <h2>Ad Content</h2>
  <table>
    <thead><tr><th>#</th><th>Type</th><th>File</th><th>Duration</th></tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>
</div>` : ''}

<div class="footer">
  <span>AdHive Network · Proof-of-Play Report</span>
  <span>Generated ${fmt(new Date().toISOString())}</span>
</div>
</body>
</html>`;
}
