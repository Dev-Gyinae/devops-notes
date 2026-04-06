import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

interface PairingStatus {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
  expiresAt: string;
  screen?: { id: string };
}

interface Props {
  onPaired: (screenId: string) => void;
}

export function PairingScreen({ onPaired }: Props) {
  const [code, setCode]           = useState('');
  const [timeLeft, setTimeLeft]   = useState(300);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [status, setStatus]       = useState<'waiting'|'paired'|'expired'>('waiting');
  const [restoreId, setRestoreId] = useState('');
  const pollRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    requestCode();
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const requestCode = async () => {
    setLoading(true); setError(''); setStatus('waiting');
    try {
      const res  = await fetch(`${API_URL}/pairing/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCode(data.code);
      const secs = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
      setTimeLeft(Math.max(0, secs));

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current!); setStatus('expired'); return 0; } return p - 1; });
      }, 1000);

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => checkStatus(data.code), 2000);
    } catch {
      setError('Could not connect to server. Retrying...');
      setTimeout(requestCode, 5000);
    } finally { setLoading(false); }
  };

  const checkStatus = async (pairingCode: string) => {
    try {
      const res  = await fetch(`${API_URL}/pairing/status/${pairingCode}`);
      if (!res.ok) return;
      const data: PairingStatus = await res.json();
      if (data.status === 'CONFIRMED' && data.screen?.id) {
        if (pollRef.current)  clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('paired');
        setTimeout(() => { localStorage.setItem('adhive_screen_id', data.screen!.id); onPaired(data.screen!.id); }, 1500);
      }
      if (data.status === 'EXPIRED') { if (pollRef.current) clearInterval(pollRef.current); setStatus('expired'); }
    } catch {}
  };

  // ── RESTORE: no server call needed — just save the ID and connect.
  // The socket join will succeed if the ID exists, or show an error on the playback screen.
  const handleRestore = () => {
    const id = restoreId.trim();
    if (!id) return;
    localStorage.setItem('adhive_screen_id', id);
    onPaired(id);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const timerColor = timeLeft < 60 ? '#f87171' : timeLeft < 120 ? '#fbbf24' : '#8b91b0';

  return (
    <div style={{ minHeight:'100vh', background:'#0d0f14', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse  {0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes scaleIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .restore-input:focus{outline:none;border-color:#7c8fff!important}
      `}</style>

      {/* bg glow */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 50% 30%, rgba(124,143,255,0.07) 0%, transparent 65%)', pointerEvents:'none' }}/>

      {/* Logo */}
      <img src="https://www.adhivenet.org/images/hero-adhive.png" alt="AdHive"
        style={{ height:'36px', objectFit:'contain', marginBottom:'20px', animation:'float 4s ease-in-out infinite', position:'relative', zIndex:1 }}
        onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />

      {/* ── Two cards side by side ── */}
      <div style={{ display:'flex', gap:'16px', width:'100%', maxWidth:'860px', alignItems:'stretch', position:'relative', zIndex:1, animation:'fadeIn 0.4s ease', flexWrap:'wrap' }}>

        {/* ── LEFT: Pair card ── */}
        <div style={{ flex:'1 1 360px', background:'#13161f', border:'1px solid #242838', borderRadius:'20px', padding:'28px 24px', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>

          {status === 'paired' && (
            <div style={{ animation:'scaleIn 0.3s ease' }}>
              <div style={{ fontSize:'52px', marginBottom:'12px' }}>✅</div>
              <h2 style={{ fontSize:'20px', fontWeight:'700', color:'#34d399', marginBottom:'8px' }}>Screen Connected!</h2>
              <p style={{ fontSize:'13px', color:'#8b91b0' }}>Loading your content...</p>
              <div style={{ width:'26px', height:'26px', border:'3px solid #242838', borderTop:'3px solid #34d399', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'16px auto 0' }}/>
            </div>
          )}

          {status === 'expired' && (
            <div>
              <div style={{ fontSize:'38px', marginBottom:'12px' }}>⏰</div>
              <h2 style={{ fontSize:'18px', fontWeight:'700', color:'#f87171', marginBottom:'16px' }}>Code Expired</h2>
              <button onClick={requestCode} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#7c8fff 0%,#a78bfa 100%)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
                Get New Code
              </button>
            </div>
          )}

          {status === 'waiting' && loading && (
            <div>
              <div style={{ width:'26px', height:'26px', border:'3px solid #242838', borderTop:'3px solid #7c8fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }}/>
              <p style={{ fontSize:'13px', color:'#8b91b0' }}>Connecting to network...</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding:'10px 12px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'8px', color:'#f87171', fontSize:'12px', marginBottom:'12px' }}>{error}</div>
          )}

          {status === 'waiting' && !loading && code && (<>
            <h1 style={{ fontSize:'17px', fontWeight:'700', color:'#e2e4ed', marginBottom:'4px' }}>Pair Your Screen</h1>
            <p style={{ fontSize:'12px', color:'#8b91b0', marginBottom:'20px' }}>Connect this display to your AdHive network</p>

            <div style={{ fontSize:'10px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'8px' }}>Screen Code</div>
            <div style={{ fontSize:'54px', fontWeight:'800', letterSpacing:'10px', background:'linear-gradient(135deg,#7c8fff 0%,#a78bfa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1.15, marginBottom:'8px', userSelect:'none' }}>
              {code}
            </div>

            <div style={{ fontSize:'12px', color:timerColor, marginBottom:'20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
              <span>⏱</span> Expires in <strong style={{ fontVariantNumeric:'tabular-nums', marginLeft:'3px' }}>{fmt(timeLeft)}</strong>
            </div>

            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              {[['1','Open Control Panel'],['2','Click "Pair Screen"'],['3','Enter this code']].map(([step,text]) => (
                <div key={step} style={{ flex:1, background:'#1a1e2b', border:'1px solid #242838', borderRadius:'8px', padding:'10px 6px', textAlign:'left' }}>
                  <div style={{ fontSize:'9px', fontWeight:'700', color:'#7c8fff', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>Step {step}</div>
                  <div style={{ fontSize:'11px', color:'#8b91b0', lineHeight:1.4 }}>{text}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background:'#1a1e2b', border:'1px solid #242838', borderRadius:'8px', padding:'10px 16px' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#34d399', animation:'pulse 2s infinite', flexShrink:0 }}/>
              <span style={{ fontSize:'12px', color:'#8b91b0' }}><strong style={{ color:'#e2e4ed' }}>Waiting for pairing...</strong> Checking every 2s</span>
            </div>
          </>)}
        </div>

        {/* ── RIGHT: Restore card ── */}
        <div style={{ flex:'1 1 340px', background:'#13161f', border:'1px solid #2e3347', borderRadius:'20px', padding:'28px 24px', display:'flex', flexDirection:'column' }}>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'22px', marginBottom:'8px' }}>🔄</div>
            <h2 style={{ fontSize:'16px', fontWeight:'700', color:'#e2e4ed', marginBottom:'6px' }}>Restore a Screen</h2>
            <p style={{ fontSize:'12px', color:'#4a5070', lineHeight:1.6 }}>
              Replacing a tablet or browser was reset? Paste the <strong style={{ color:'#8b91b0' }}>Screen ID</strong> from the control panel to reconnect without re-pairing.
            </p>
            <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(124,143,255,0.06)', border:'1px solid rgba(124,143,255,0.15)', borderRadius:'7px', fontSize:'11px', color:'#7c8fff', lineHeight:1.5 }}>
              📍 Find the ID on the <strong>Screens</strong> page — each card has a "Screen ID" row with a Copy button
            </div>
          </div>

          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'10px' }}>
            <label style={{ fontSize:'11px', fontWeight:'600', color:'#4a5070', textTransform:'uppercase', letterSpacing:'0.5px' }}>Screen ID</label>
            <input
              className="restore-input"
              type="text"
              value={restoreId}
              onChange={e => setRestoreId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && restoreId.trim()) handleRestore(); }}
              placeholder="cmlyxfa4505c7sqe43bhwllng"
              style={{ background:'#1a1e2b', border:'1px solid #242838', color:'#e2e4ed', borderRadius:'8px', padding:'12px 14px', fontSize:'13px', fontFamily:'monospace', width:'100%', boxSizing:'border-box' }}
            />

            <button
              onClick={handleRestore}
              disabled={!restoreId.trim()}
              style={{
                width:'100%', padding:'13px',
                background: restoreId.trim() ? 'linear-gradient(135deg,#7c8fff 0%,#a78bfa 100%)' : '#1a1e2b',
                border: restoreId.trim() ? 'none' : '1px solid #242838',
                borderRadius:'9px', color: restoreId.trim() ? '#fff' : '#4a5070',
                fontSize:'14px', fontWeight:'700', cursor: restoreId.trim() ? 'pointer' : 'not-allowed',
                transition:'all 0.15s', marginTop:'4px',
              }}>
              Restore Screen →
            </button>

            <p style={{ fontSize:'11px', color:'#2e3347', textAlign:'center' }}>Press Enter after pasting the ID</p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ marginTop:'20px', display:'flex', gap:'16px', fontSize:'12px', color:'#2e3347', position:'relative', zIndex:1 }}>
        <span>© 2026 AdHive</span>
        {code && status === 'waiting' && !loading && (
          <a href="#" onClick={e => { e.preventDefault(); requestCode(); }} style={{ color:'#4a5070', textDecoration:'none' }}>↻ New Code</a>
        )}
      </div>
    </div>
  );
}
