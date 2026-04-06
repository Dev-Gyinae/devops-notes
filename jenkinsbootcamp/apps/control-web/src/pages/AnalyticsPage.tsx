import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Screen } from '../types';

interface ScreenAnalytics {
  screenId: string;
  totalEvents: number;
  eventBreakdown: Record<string, number>;
  itemBreakdown: { id: string; url: string; type: string; count: number }[];
  daily: { date: string; count: number }[];
  recentLogs: any[];
}
interface UptimeStat { screenId: string; name: string; uptimePercent: number; onlineHours: number; totalHours: number; }
interface NetworkUptime { screens: UptimeStat[]; avgUptime: number; }

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: -1 },
];

function getPresetDates(days: number) {
  const end = new Date();
  const start = days === -1 ? new Date('2020-01-01') : days === 0 ? new Date(end.toDateString()) : new Date(Date.now() - days * 86400000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const timeAgo = (d?: string) => {
  if (!d) return 'Never';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const shortName = (url: string) => { try { const p = new URL(url).pathname.split('/'); const n = p[p.length-1]||url; return n.length>34?n.slice(0,34)+'…':n; } catch { return url.length>34?url.slice(0,34)+'…':url; } };
const uptimeColor = (p: number) => p >= 90 ? '#34d399' : p >= 70 ? '#fbbf24' : '#f87171';
const getBrowserName = (ua?: string) => { if(!ua) return '—'; if(ua.includes('Firefox')) return 'Firefox'; if(ua.includes('Chrome')) return 'Chrome'; if(ua.includes('Safari')) return 'Safari'; return 'Browser'; };

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  if (!data || data.length < 2) return <span style={{ fontSize: '11px', color: '#4a5070' }}>—</span>;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 140, H = 32;
  const pts = data.map((d, i) => `${(i/(data.length-1))*W},${H-(d.count/max)*(H-4)}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="#7c8fff" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

export function AnalyticsPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [screenAnalytics, setScreenAnalytics] = useState<Record<string, ScreenAnalytics>>({});
  const [networkUptime, setNetworkUptime] = useState<NetworkUptime | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview'|'perscreen'|'uptime'>('overview');
  const [copiedId, setCopiedId] = useState<string|null>(null);
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  const [preset, setPreset] = useState(1);
  const [startDate, setStartDate] = useState(getPresetDates(7).start);
  const [endDate, setEndDate] = useState(getPresetDates(7).end);
  const [customMode, setCustomMode] = useState(false);

  const applyPreset = (idx: number) => {
    setPreset(idx); setCustomMode(false);
    const { start, end } = getPresetDates(PRESETS[idx].days);
    setStartDate(start); setEndDate(end);
    fetchAll(start, end);
  };

  const fetchAll = useCallback(async (start: string, end: string) => {
    try {
      const [screensData, uptimeData] = await Promise.all([
        api.getScreens(),
        api.getNetworkUptime(start, end),
      ]);
      setScreens(screensData);
      setNetworkUptime(uptimeData);

      const map: Record<string, ScreenAnalytics> = {};
      await Promise.all(screensData.map(async (s: Screen) => {
        try { map[s.id] = await api.getScreenAnalytics(s.id, start, end); }
        catch { map[s.id] = { screenId: s.id, totalEvents: 0, eventBreakdown: {}, itemBreakdown: [], daily: [], recentLogs: [] }; }
      }));
      setScreenAnalytics(map);
      if (screensData.length > 0 && !selectedScreen) setSelectedScreen(screensData[0].id);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedScreen]);

  useEffect(() => { fetchAll(startDate, endDate); }, []);

  const handleApply = () => { setRefreshing(true); fetchAll(startDate, endDate); };
  const handleRefresh = () => { setRefreshing(true); fetchAll(startDate, endDate); };

  const totalImpressions = Object.values(screenAnalytics).reduce((s, a) => s + (a.eventBreakdown?.START ?? 0), 0);
  const onlineCount = screens.filter(s => s.status === 'ONLINE').length;
  const livePct = screens.length > 0 ? Math.round((onlineCount / screens.length) * 100) : 0;

  const inp: React.CSSProperties = { background: '#1a1e2b', border: '1px solid #242838', color: '#e2e4ed', borderRadius: '7px', padding: '7px 10px', fontSize: '13px', fontFamily: 'Inter, sans-serif' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#8b91b0' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '12px' }}/>
      Loading analytics...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .atab,.preset-btn,.screen-tab{transition:all 0.15s}
        .atab:hover,.preset-btn:hover,.screen-tab:hover{border-color:#7c8fff!important;color:#7c8fff!important}
        .atab.on,.preset-btn.on,.screen-tab.active{background:rgba(124,143,255,0.12)!important;border-color:#7c8fff!important;color:#7c8fff!important}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}
        tr.hrow:hover td{background:#1a1e2b}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'26px', fontWeight:'700', color:'#e2e4ed', letterSpacing:'-0.5px' }}>Analytics</h1>
          <p style={{ fontSize:'13px', color:'#8b91b0', marginTop:'4px' }}>Network health · playback data · uptime history</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ padding:'9px 16px', background:'transparent', border:'1px solid #242838', borderRadius:'8px', color:'#8b91b0', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ animation: refreshing?'spin 0.8s linear infinite':'none', display:'inline-block' }}>↻</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding:'12px 16px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', color:'#f87171', fontSize:'13px', marginBottom:'16px' }}>
          {error}<button onClick={()=>setError('')} style={{ float:'right', background:'none', border:'none', color:'#f87171', cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Date range bar */}
      <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'center' }}>
        <span style={{ fontSize:'11px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0 }}>Period</span>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={()=>applyPreset(i)}
              className={`preset-btn${!customMode && preset===i?' on':''}`}
              style={{ padding:'5px 12px', borderRadius:'6px', border:'1px solid #242838', background:'transparent', color:'#8b91b0', fontSize:'12px', cursor:'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto', flexWrap:'wrap' }}>
          <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);setCustomMode(true);}} style={{...inp, colorScheme:'dark'}}/>
          <span style={{ color:'#4a5070', fontSize:'12px' }}>→</span>
          <input type="date" value={endDate} onChange={e=>{setEndDate(e.target.value);setCustomMode(true);}} style={{...inp, colorScheme:'dark'}}/>
          <button onClick={handleApply}
            style={{ padding:'7px 16px', background:'linear-gradient(135deg,#7c8fff 0%,#a78bfa 100%)', border:'none', borderRadius:'7px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
            Apply
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {([['overview','Overview'],['perscreen','Per Screen'],['uptime','Uptime History']] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            className={`atab${activeTab===id?' on':''}`}
            style={{ padding:'8px 16px', borderRadius:'8px', border:'1px solid #242838', background:'transparent', color:'#8b91b0', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (<>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }}>
          {[
            { label:'Live Uptime', value:`${livePct}%`, sub:`${onlineCount} of ${screens.length} online`, color:uptimeColor(livePct), icon:'📡' },
            { label:'Historical Uptime', value: networkUptime?`${networkUptime.avgUptime}%`:'—', sub:`${startDate} → ${endDate}`, color:uptimeColor(networkUptime?.avgUptime??0), icon:'📊' },
            { label:'Impressions', value:totalImpressions.toLocaleString(), sub:'START events in range', color:'#7c8fff', icon:'▶' },
            { label:'Online Now', value:onlineCount, sub:'Screens broadcasting', color:'#34d399', icon:'🟢' },
            { label:'Offline Now', value:screens.length-onlineCount, sub:screens.length-onlineCount>0?'Need attention':'All clear', color:screens.length-onlineCount>0?'#f87171':'#34d399', icon:'🔴' },
          ].map(card=>(
            <div key={card.label} style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <span style={{ fontSize:'18px' }}>{card.icon}</span>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:card.color, animation:'pulse 2s infinite' }}/>
              </div>
              <div style={{ fontSize:'28px', fontWeight:'800', color:'#e2e4ed', letterSpacing:'-1px', marginBottom:'3px' }}>{card.value}</div>
              <div style={{ fontSize:'12px', fontWeight:'600', color:'#8b91b0', marginBottom:'2px' }}>{card.label}</div>
              <div style={{ fontSize:'11px', color:'#4a5070' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'20px' }}>
          <h2 style={{ fontSize:'15px', fontWeight:'600', color:'#e2e4ed', marginBottom:'16px' }}>All Screens</h2>
          {screens.length===0 ? <div style={{ textAlign:'center', padding:'32px', color:'#4a5070' }}>No screens yet</div> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['Screen','Status','Venue','Uptime %','Impressions','Last Seen','Battery','Trend'].map(h=>(
                    <th key={h} style={{ fontSize:'11px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'0.5px', padding:'8px 12px', textAlign:'left', borderBottom:'1px solid #242838', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {screens.map(screen=>{
                    const sa = screenAnalytics[screen.id];
                    const ut = networkUptime?.screens.find(s=>s.screenId===screen.id);
                    const di = screen.deviceInfo as any;
                    return (
                      <tr key={screen.id} className="hrow" style={{ cursor:'pointer', borderBottom:'1px solid #1a1e2b' }}
                        onClick={()=>{setSelectedScreen(screen.id);setActiveTab('perscreen');}}>
                        <td style={{ padding:'12px', fontSize:'13px', fontWeight:'500', color:'#e2e4ed', whiteSpace:'nowrap' }}>{screen.name}</td>
                        <td style={{ padding:'12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:screen.status==='ONLINE'?'#34d399':'#f87171', animation:screen.status==='ONLINE'?'pulse 2s infinite':'none' }}/>
                            <span style={{ fontSize:'11px', fontWeight:'600', color:screen.status==='ONLINE'?'#34d399':'#f87171' }}>{screen.status}</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px', fontSize:'12px', color:'#8b91b0' }}>
                          {screen.venueName?<div><div style={{color:'#e2e4ed',fontWeight:'500'}}>{screen.venueName}</div>{screen.area&&<div style={{fontSize:'11px'}}>{screen.area}</div>}</div>:'—'}
                        </td>
                        <td style={{ padding:'12px' }}>
                          {ut?(
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <div style={{ flex:1, height:'5px', background:'#242838', borderRadius:'3px', overflow:'hidden', minWidth:'50px' }}>
                                <div style={{ height:'100%', width:`${ut.uptimePercent}%`, background:uptimeColor(ut.uptimePercent), borderRadius:'3px' }}/>
                              </div>
                              <span style={{ fontSize:'12px', fontWeight:'700', color:uptimeColor(ut.uptimePercent), minWidth:'34px' }}>{ut.uptimePercent}%</span>
                            </div>
                          ):<span style={{ fontSize:'11px', color:'#4a5070' }}>No data</span>}
                        </td>
                        <td style={{ padding:'12px', fontSize:'13px', fontWeight:'700', color:'#7c8fff' }}>{(sa?.eventBreakdown?.START??0).toLocaleString()}</td>
                        <td style={{ padding:'12px', fontSize:'12px', color:'#8b91b0', whiteSpace:'nowrap' }}>{timeAgo(screen.lastSeenAt)}</td>
                        <td style={{ padding:'12px', fontSize:'12px' }}>
                          {di?.battery?<span style={{ color:di.battery.level<20?'#f87171':di.battery.level<50?'#fbbf24':'#34d399', fontWeight:'500' }}>{di.battery.level}% {di.battery.charging?'⚡':''}</span>:<span style={{color:'#4a5070'}}>—</span>}
                        </td>
                        <td style={{ padding:'12px' }}><Sparkline data={sa?.daily??[]}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>)}

      {/* ── PER SCREEN ── */}
      {activeTab==='perscreen' && (
        <div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
            {screens.map(s=>(
              <button key={s.id} onClick={()=>setSelectedScreen(s.id)}
                className={`screen-tab${selectedScreen===s.id?' active':''}`}
                style={{ padding:'7px 14px', borderRadius:'8px', border:'1px solid #242838', background:'transparent', color:'#8b91b0', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.status==='ONLINE'?'#34d399':'#f87171' }}/>
                {s.name}
              </button>
            ))}
          </div>

          {selectedScreen && (()=>{
            const screen = screens.find(s=>s.id===selectedScreen);
            const sa = screenAnalytics[selectedScreen];
            const di = screen?.deviceInfo as any;
            if (!screen || !sa) return <div style={{ color:'#4a5070' }}>Loading...</div>;
            return (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'16px' }}>

                {/* Device */}
                <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
                  <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#8b91b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Device</h3>
                  {/* Screen ID with copy */}
                  <div style={{ marginBottom:'12px', padding:'8px 10px', background:'#222638', borderRadius:'7px', border:'1px solid #242838' }}>
                    <div style={{ fontSize:'10px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Screen ID — for re-pairing a replaced device</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'11px', color:'#8b91b0', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{screen.id}</span>
                      <button onClick={()=>handleCopyId(screen.id)}
                        style={{ flexShrink:0, padding:'3px 10px', background:copiedId===screen.id?'rgba(52,211,153,0.15)':'transparent', border:`1px solid ${copiedId===screen.id?'#34d399':'#2e3347'}`, borderRadius:'5px', color:copiedId===screen.id?'#34d399':'#4a5070', fontSize:'10px', fontWeight:'600', cursor:'pointer', transition:'all 0.15s' }}>
                        {copiedId===screen.id?'✓ Copied':'Copy'}
                      </button>
                    </div>
                  </div>

                  {[
                    ['Status', screen.status, screen.status==='ONLINE'?'#34d399':'#f87171'],
                    ['Last seen', timeAgo(screen.lastSeenAt), null],
                    ['Resolution', di?.display?`${di.display.width}×${di.display.height}`:'—', null],
                    ['Browser', getBrowserName(di?.browser?.userAgent), null],
                    ['Network', di?.network?.effectiveType||'—', null],
                    ['Battery', di?.battery?`${di.battery.level}% ${di.battery.charging?'⚡':''}` : '—', di?.battery?.level<20?'#f87171':null],
                  ].map(([label,value,color])=>(
                    <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', color:'#4a5070' }}>{label}</span>
                      <span style={{ fontSize:'12px', fontWeight:'500', color:(color as string)||'#e2e4ed' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Playback breakdown */}
                <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
                  <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#8b91b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Playback</h3>
                  <div style={{ fontSize:'36px', fontWeight:'800', color:'#7c8fff', marginBottom:'2px' }}>{(sa.eventBreakdown?.START??0).toLocaleString()}</div>
                  <div style={{ fontSize:'12px', color:'#4a5070', marginBottom:'16px' }}>Impressions in range</div>
                  {Object.entries(sa.eventBreakdown||{}).map(([event,count])=>{
                    const colors: Record<string,string>={START:'#7c8fff',COMPLETE:'#34d399',ERROR:'#f87171',SKIP:'#fbbf24'};
                    const pct=Math.round(((count as number)/(sa.totalEvents||1))*100);
                    return (
                      <div key={event} style={{ marginBottom:'10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span style={{ fontSize:'12px', color:colors[event]||'#8b91b0', fontWeight:'500' }}>{event}</span>
                          <span style={{ fontSize:'12px', color:'#8b91b0' }}>{(count as number).toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ height:'4px', background:'#242838', borderRadius:'2px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:colors[event]||'#7c8fff', borderRadius:'2px' }}/>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(sa.eventBreakdown||{}).length===0 && <div style={{ fontSize:'13px', color:'#4a5070' }}>No data in this range</div>}
                </div>

                {/* Daily trend */}
                <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
                  <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#8b91b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Daily Impressions</h3>
                  <div style={{ marginBottom:'12px' }}><Sparkline data={sa.daily??[]}/></div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'160px', overflowY:'auto' }}>
                    {[...( sa.daily??[])].reverse().slice(0,14).map(d=>(
                      <div key={d.date} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}>
                        <span style={{ color:'#8b91b0' }}>{d.date}</span>
                        <span style={{ color:'#7c8fff', fontWeight:'600' }}>{d.count.toLocaleString()}</span>
                      </div>
                    ))}
                    {(sa.daily?.length??0)===0 && <div style={{ fontSize:'12px', color:'#4a5070' }}>No data</div>}
                  </div>
                </div>

                {/* Ad breakdown ← FEATURE 2 */}
                <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
                  <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#8b91b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Ad Breakdown</h3>
                  {sa.itemBreakdown?.length>0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {sa.itemBreakdown.slice(0,10).map((item,i)=>{
                        const maxC=sa.itemBreakdown[0].count||1;
                        const pct=Math.round((item.count/maxC)*100);
                        const tc: Record<string,string>={IMAGE:'#7c8fff',VIDEO:'#a78bfa',HTML:'#34d399'};
                        return (
                          <div key={item.id}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                              <span style={{ fontSize:'9px', fontWeight:'700', padding:'1px 5px', borderRadius:'3px', background:`${tc[item.type]||'#7c8fff'}22`, color:tc[item.type]||'#7c8fff', flexShrink:0 }}>{item.type}</span>
                              <span style={{ fontSize:'12px', color:'#e2e4ed', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName(item.url)}</span>
                              <span style={{ fontSize:'12px', fontWeight:'700', color:'#7c8fff', flexShrink:0 }}>{item.count.toLocaleString()}</span>
                            </div>
                            <div style={{ height:'4px', background:'#242838', borderRadius:'2px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:tc[item.type]||'#7c8fff', borderRadius:'2px' }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div style={{ fontSize:'13px', color:'#4a5070' }}>No ad data in this range</div>}
                </div>

                {/* Recent logs */}
                <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'18px' }}>
                  <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#8b91b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Recent Activity</h3>
                  {sa.recentLogs?.length>0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:'240px', overflowY:'auto' }}>
                      {sa.recentLogs.slice(0,20).map((log: any,i: number)=>{
                        const colors: Record<string,string>={START:'#7c8fff',COMPLETE:'#34d399',ERROR:'#f87171',SKIP:'#fbbf24'};
                        return (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:'6px', background:'#1a1e2b' }}>
                            <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 6px', borderRadius:'4px', background:`${colors[log.eventType]}22`, color:colors[log.eventType]||'#8b91b0' }}>{log.eventType}</span>
                            <span style={{ fontSize:'11px', color:'#4a5070' }}>{timeAgo(log.timestamp)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div style={{ fontSize:'13px', color:'#4a5070' }}>No activity in this range</div>}
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* ── UPTIME HISTORY ← FEATURE 3 ── */}
      {activeTab==='uptime' && (
        <div>
          {networkUptime && (
            <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'20px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'24px', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>Network Average Uptime</div>
                <div style={{ fontSize:'42px', fontWeight:'800', color:uptimeColor(networkUptime.avgUptime), letterSpacing:'-1px' }}>{networkUptime.avgUptime}%</div>
                <div style={{ fontSize:'12px', color:'#8b91b0' }}>{startDate} → {endDate}</div>
              </div>
              <div style={{ flex:1, height:'10px', background:'#242838', borderRadius:'5px', overflow:'hidden', minWidth:'120px' }}>
                <div style={{ height:'100%', width:`${networkUptime.avgUptime}%`, background:uptimeColor(networkUptime.avgUptime), borderRadius:'5px', transition:'width 0.5s ease' }}/>
              </div>
            </div>
          )}

          <div style={{ background:'#13161f', border:'1px solid #242838', borderRadius:'12px', padding:'20px' }}>
            <h2 style={{ fontSize:'15px', fontWeight:'600', color:'#e2e4ed', marginBottom:'16px' }}>Per-Screen Uptime</h2>
            {networkUptime?.screens.length===0 ? (
              <div>
                <div style={{ textAlign:'center', padding:'32px', color:'#4a5070', fontSize:'13px' }}>No uptime history yet</div>
                <div style={{ padding:'12px 16px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'8px', fontSize:'12px', color:'#fbbf24', lineHeight:1.6 }}>
                  💡 Uptime tracking starts collecting from now. The longer screens run, the more accurate the percentages become. Check back after a day or two.
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {(networkUptime?.screens??[]).sort((a,b)=>b.uptimePercent-a.uptimePercent).map(stat=>{
                  const screen=screens.find(s=>s.id===stat.screenId);
                  return (
                    <div key={stat.screenId} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'#1a1e2b', borderRadius:'10px' }}>
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:screen?.status==='ONLINE'?'#34d399':'#f87171', animation:screen?.status==='ONLINE'?'pulse 2s infinite':'none', flexShrink:0 }}/>
                      <div style={{ minWidth:'160px' }}>
                        <div style={{ fontSize:'13px', fontWeight:'600', color:'#e2e4ed' }}>{stat.name}</div>
                        <div style={{ fontSize:'11px', color:'#4a5070' }}>{stat.onlineHours}h online of {stat.totalHours}h</div>
                      </div>
                      <div style={{ flex:1, height:'8px', background:'#242838', borderRadius:'4px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${stat.uptimePercent}%`, background:uptimeColor(stat.uptimePercent), borderRadius:'4px', transition:'width 0.5s ease' }}/>
                      </div>
                      <div style={{ fontSize:'18px', fontWeight:'800', color:uptimeColor(stat.uptimePercent), minWidth:'48px', textAlign:'right' }}>{stat.uptimePercent}%</div>
                      {stat.uptimePercent<70 && <span style={{ fontSize:'10px', fontWeight:'700', padding:'3px 8px', borderRadius:'20px', background:'rgba(248,113,113,0.12)', color:'#f87171', flexShrink:0 }}>⚠ Low</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
