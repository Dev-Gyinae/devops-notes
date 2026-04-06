import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScreensPage } from './pages/ScreensPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ToastProvider } from './components/Toast';

type Page = 'dashboard' | 'screens' | 'playlists' | 'analytics' | 'schedule';

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0d0f14', color: '#7c8fff', fontSize: '16px', gap: '12px',
      }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #242838', borderTop: '2px solid #7c8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <ToastProvider><LoginPage /></ToastProvider>;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'screens', label: 'Screens', icon: '🖥' },
    { id: 'playlists', label: 'Playlists', icon: '▶' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
  ] as const;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{
      width: mobile ? '240px' : (sidebarOpen ? '240px' : '64px'),
      background: '#13161f',
      borderRight: '1px solid #242838',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #242838', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px' }}>
        <img
          src="https://www.adhivenet.org/images/hero-adhive.png"
          alt="AdHive"
          style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {(sidebarOpen || mobile) && (
          <span style={{ fontSize: '18px', fontWeight: '700', background: 'linear-gradient(135deg, #7c8fff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
            AdHive
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentPage(item.id);
              setMobileSidebarOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              marginBottom: '4px',
              borderRadius: '8px',
              border: 'none',
              background: currentPage === item.id ? 'rgba(124, 143, 255, 0.12)' : 'transparent',
              color: currentPage === item.id ? '#7c8fff' : '#8b91b0',
              fontSize: '14px',
              fontWeight: currentPage === item.id ? '600' : '400',
              cursor: 'pointer',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== item.id) {
                (e.currentTarget as HTMLButtonElement).style.background = '#1a1e2b';
                (e.currentTarget as HTMLButtonElement).style.color = '#e2e4ed';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.id) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#8b91b0';
              }
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
            {(sidebarOpen || mobile) && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User & Logout */}
      {(sidebarOpen || mobile) && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #242838' }}>
          <div style={{ fontSize: '12px', color: '#4a5070', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button
            onClick={() => { localStorage.removeItem('adhive_token'); window.location.reload(); }}
            style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #242838', borderRadius: '6px', color: '#8b91b0', fontSize: '12px', cursor: 'pointer', marginTop: '6px', transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { (e.currentTarget).style.borderColor = '#f87171'; (e.currentTarget).style.color = '#f87171'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.borderColor = '#242838'; (e.currentTarget).style.color = '#8b91b0'; }}
          >
            Logout
          </button>
        </div>
      )}

      {/* Collapse toggle - desktop only */}
      {!mobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ margin: '8px', padding: '8px', borderRadius: '6px', border: '1px solid #242838', background: 'transparent', color: '#8b91b0', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s ease' }}
          onMouseEnter={(e) => { (e.currentTarget).style.borderColor = '#7c8fff'; (e.currentTarget).style.color = '#7c8fff'; }}
          onMouseLeave={(e) => { (e.currentTarget).style.borderColor = '#242838'; (e.currentTarget).style.color = '#8b91b0'; }}
        >
          {sidebarOpen ? '◀ Collapse' : '▶'}
        </button>
      )}
    </div>
  );

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', background: '#0d0f14', overflow: 'hidden' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          * { box-sizing: border-box; }
          @media (max-width: 768px) {
            .desktop-sidebar { display: none !important; }
            .mobile-menu-btn { display: flex !important; }
          }
          @media (min-width: 769px) {
            .mobile-sidebar-overlay { display: none !important; }
            .mobile-menu-btn { display: none !important; }
          }
        `}</style>

        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{ display: 'flex' }}>
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="mobile-sidebar-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex' }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ animation: 'slideInLeft 0.2s ease', height: '100%' }}>
              <Sidebar mobile />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Bar */}
          <div style={{
            height: '64px', background: '#13161f', borderBottom: '1px solid #242838',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Mobile hamburger */}
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileSidebarOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', color: '#8b91b0', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ☰
              </button>
              <h1 style={{ fontSize: '16px', fontWeight: '600', color: '#e2e4ed', textTransform: 'capitalize' }}>
                {currentPage}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '13px', color: '#8b91b0', display: 'none' }} className="hide-mobile">
                {user.email}
              </span>
            </div>
          </div>

          {/* Page Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', animation: 'fadeIn 0.2s ease' }}>
            {currentPage === 'dashboard' && <DashboardPage onNavigate={setCurrentPage} />}
            {currentPage === 'screens' && <ScreensPage />}
            {currentPage === 'playlists' && <PlaylistsPage />}
            {currentPage === 'analytics' && <AnalyticsPage />}
            {currentPage === 'schedule' && <SchedulePage />}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}