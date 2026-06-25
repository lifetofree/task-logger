import React, { useEffect, useState } from 'react';
import { getToken, getStoredUser, clearSession } from './api/client.js';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { VERSION } from './version.js';
import LoginScreen from './auth/LoginScreen.jsx';
import SignupScreen from './auth/SignupScreen.jsx';
import TodayView from './views/TodayView.jsx';
import InsightsView from './views/InsightsView.jsx';
import HistoryView from './views/HistoryView.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '✓' },
  { id: 'history', label: 'History', icon: '☰' },
  { id: 'insights', label: 'Memento', icon: '◉' },
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('today');

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      console.log('SW registered:', url);
    },
  });

  useEffect(() => {
    function onLogout() {
      setAuthed(false);
      setUser(null);
      setMode('login');
    }
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  function handleSignOut() {
    clearSession();
    setAuthed(false);
    setUser(null);
    setMode('login');
  }

  async function handleUpdate() {
    await updateServiceWorker(true);
  }

  function handleDismissUpdate() {
    setNeedRefresh(false);
  }

  const updateBanner = needRefresh ? (
    <div className="update-banner">
      <span>A new version is available.</span>
      <button className="update-banner-btn" onClick={handleUpdate}>Update</button>
      <button className="update-banner-dismiss" onClick={handleDismissUpdate}>Dismiss</button>
    </div>
  ) : null;

  if (!authed) {
    if (mode === 'signup') {
      return (
        <>
          <SignupScreen
            onSuccess={(u) => { setUser(u); setAuthed(true); }}
            onSwitchToLogin={() => setMode('login')}
          />
          {updateBanner}
        </>
      );
    }
    return (
      <>
        <LoginScreen
          onSuccess={(u) => { setUser(u); setAuthed(true); }}
          onSwitchToSignup={() => setMode('signup')}
        />
        {updateBanner}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Task Logger{user?.username ? ` · ${user.username}` : ''}</h1>
        <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
      </header>
      <main className="view">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'insights' && <InsightsView user={user} />}
      </main>
      {updateBanner}
      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="tab-bar-copyright">
          &copy; {new Date().getFullYear()} adduckivity &middot; v{VERSION}
        </div>
      </nav>
    </div>
  );
}
