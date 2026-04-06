import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaPlayer } from './MediaPlayer';
import type { Playlist, PlaylistItem } from '../types';
import type { Socket } from 'socket.io-client';

interface Props {
  playlist: Playlist;
  screenId: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  socket: Socket | null;
}

export function PlaylistPlayer({ playlist, screenId, connectionStatus, socket }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetBtn, setShowResetBtn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items: PlaylistItem[] = playlist.items ?? [];

  // ── Playback logging ────────────────────────────────────────────────────────
  const logEvent = useCallback((item: PlaylistItem, eventType: 'START' | 'COMPLETE') => {
    if (!socket?.connected || !screenId) return;
    socket.emit('screen:playback_log', {
      screenId,
      playlistItemId: item.id,
      eventType,
      timestamp: new Date().toISOString(),
    });
  }, [socket, screenId]);

  // ── Item transitions ────────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    const current = items[currentIndex];
    if (current) logEvent(current, 'COMPLETE');
    setCurrentIndex((prev) => (prev + 1) % Math.max(items.length, 1));
  }, [items, currentIndex, logEvent]);

  // Log START whenever the current item changes
  useEffect(() => {
    const current = items[currentIndex];
    if (current) logEvent(current, 'START');
  }, [currentIndex, playlist.id]);

  // Reset to first item when playlist changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [playlist.id]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      await containerRef.current?.requestFullscreen();
    } catch {
      await document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  useEffect(() => { enterFullscreen(); }, []);

  // ── Reset / Re-pair ─────────────────────────────────────────────────────────
  // Triple-tap anywhere on screen to reveal the reset button.
  // This prevents accidental taps during normal operation.
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCornerTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1000);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setShowResetBtn(true);
      // Auto-hide the button after 8 seconds if not used
      if (resetHideTimer.current) clearTimeout(resetHideTimer.current);
      resetHideTimer.current = setTimeout(() => {
        setShowResetBtn(false);
        setShowResetConfirm(false);
      }, 8000);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('adhive_screen_id');
    window.location.reload();
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0d0f14',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#8b91b0', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>▶</div>
        <p style={{ fontSize: '18px', fontWeight: '600' }}>Playlist is empty</p>
        <p style={{ fontSize: '13px', marginTop: '8px', color: '#4a5070' }}>Add items in the control panel</p>
      </div>
    );
  }

  const current = items[currentIndex];

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <MediaPlayer
        key={`${current.id}-${currentIndex}`}
        url={current.url}
        type={current.type}
        duration={current.duration}
        transition={(current.metadata as any)?.transition}
        onComplete={handleComplete}
      />

      {/* Fullscreen button */}
      {!isFullscreen && (
        <button onClick={enterFullscreen} style={{
          position: 'fixed', bottom: '20px', right: '20px',
          padding: '10px 16px', background: 'rgba(0,0,0,0.7)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
          fontSize: '13px', cursor: 'pointer', zIndex: 200,
          backdropFilter: 'blur(4px)',
        }}>
          ⛶ Go Fullscreen
        </button>
      )}

      {/* Connection status banner */}
      <div style={{
        position: 'fixed', top: '12px', left: '12px',
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '20px',
        fontSize: '11px', color: '#fff', zIndex: 100,
        opacity: connectionStatus === 'connected' ? 0 : 1,
        transition: 'opacity 0.5s ease', pointerEvents: 'none',
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: connectionStatus === 'connecting' ? '#fbbf24' : '#f87171',
        }} />
        {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
      </div>

      {/* Item counter */}
      <div style={{
        position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '11px', color: 'rgba(255,255,255,0.25)',
        fontFamily: 'Inter, sans-serif', pointerEvents: 'none', zIndex: 100,
      }}>
        {currentIndex + 1} / {items.length}
      </div>

      {/* ── Triple-tap zone (full screen, invisible) ── */}
      <div
        onClick={handleCornerTap}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 150,
          cursor: 'default',
        }}
      />

      {/* ── Reset button — appears after triple-tap ── */}
      {showResetBtn && !showResetConfirm && (
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{
            position: 'fixed', bottom: '16px', left: '16px',
            padding: '8px 14px', background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px',
            color: '#f87171', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', zIndex: 300, backdropFilter: 'blur(6px)',
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          ⚙ Reset &amp; Re-pair
        </button>
      )}

      {/* ── Confirm reset dialog ── */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 400, fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            background: '#13161f', border: '1px solid #2e3347',
            borderRadius: '16px', padding: '32px', maxWidth: '340px', width: '90%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e4ed', marginBottom: '8px' }}>
              Reset Screen?
            </h2>
            <p style={{ fontSize: '13px', color: '#8b91b0', lineHeight: 1.6, marginBottom: '24px' }}>
              This will disconnect the screen from AdHive and return it to the pairing screen. You'll need to re-pair it from the control panel.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowResetConfirm(false); setShowResetBtn(false); }}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #242838', borderRadius: '8px', color: '#8b91b0', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                style={{ flex: 1, padding: '12px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px', color: '#f87171', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
