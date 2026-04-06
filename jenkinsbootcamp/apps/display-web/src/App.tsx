import { useState, useEffect } from 'react';
import { PairingScreen } from './pages/PairingScreen';
import { PlaylistPlayer } from './components/PlaylistPlayer';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [screenId, setScreenId] = useState<string | null>(null);
  const { connected, status, playlist, socket } = useWebSocket(screenId, null);

  useEffect(() => {
    const saved = localStorage.getItem('adhive_screen_id');
    if (saved) setScreenId(saved);
  }, []);

  const handlePaired = (newScreenId: string) => {
    setScreenId(newScreenId);
    localStorage.setItem('adhive_screen_id', newScreenId);
  };

  if (!screenId) {
    return <PairingScreen onPaired={handlePaired} />;
  }

  if (!playlist || !playlist.items || playlist.items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>
          <h1>✅ Screen Paired</h1>
          <p>Waiting for playlist assignment...</p>
          <p style={{ opacity: 0.7, marginTop: '20px', fontSize: '14px' }}>
            Connection: {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
          <p style={{ opacity: 0.5, marginTop: '10px', fontSize: '12px' }}>
            Screen ID: {screenId.substring(0, 8)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PlaylistPlayer
      playlist={playlist}
      screenId={screenId}
      connectionStatus={status}
      socket={socket}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#000',
  },
  message: { textAlign: 'center', color: '#fff' },
};