import React, { useEffect, useState } from 'react';
import { getToken, getStoredUser, clearSession } from './api/client.js';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { VERSION } from './version.js';
import LoginScreen from './auth/LoginScreen.jsx';
import SignupScreen from './auth/SignupScreen.jsx';
import TodayView from './views/TodayView.jsx';
import InsightsView from './views/InsightsView.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '✓' },
  { id: 'insights', label: 'Insights', icon: '◉' },
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

  const footer = (
    <footer className="app-footer">
      <span>&copy; {new Date().getFullYear()} adduckivity &middot; v{VERSION}</span>
    </footer>
  );

  if (!authed) {
    if (mode === 'signup') {
      return (
        <>
          <SignupScreen
            onSuccess={(u) => { setUser(u); setAuthed(true); }}
            onSwitchToLogin={() => setMode('login')}
          />
          {updateBanner}
          {footer}
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
        {footer}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Task Logger{user?.username ? ` · ${user.username}` : ''}</h1>
        <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
      </header>
      {activeTab === 'today' ? <TodayView /> : <InsightsView />}
      {updateBanner}
      {footer}
      <nav className="tab-bar">
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
      </nav>
    </div>
  );
}
