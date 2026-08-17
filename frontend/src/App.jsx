import React, { useEffect, useState } from 'react';
import { getToken, getStoredUser, clearSession } from './api/client.js';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { VERSION } from './version.js';
import LoginScreen from './auth/LoginScreen.jsx';
import SignupScreen from './auth/SignupScreen.jsx';
import ForgotPasswordScreen from './auth/ForgotPasswordScreen.jsx';
import ResetPasswordScreen from './auth/ResetPasswordScreen.jsx';
import TodayView from './views/TodayView.jsx';
import InsightsView from './views/InsightsView.jsx';
import HistoryView from './views/HistoryView.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '✓' },
  { id: 'history', label: 'History', icon: '☰' },
  { id: 'insights', label: 'Memento', icon: '◉' },
];

function getResetTokenFromHash() {
  const hash = window.location.hash; // e.g. #/reset?token=abc123
  const match = hash.match(/[?&]token=([^&]+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('today');

  // Check for reset token in URL on first render
  const initialResetToken = getResetTokenFromHash();
  const [mode, setMode] = useState(initialResetToken ? 'reset' : 'login');
  const [resetToken, setResetToken] = useState(initialResetToken);

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

  function handleResetDone() {
    // Clear token from URL hash so a refresh doesn't re-trigger reset mode
    window.location.hash = '';
    setResetToken(null);
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
    if (mode === 'reset') {
      return (
        <>
          <ResetPasswordScreen token={resetToken} onDone={handleResetDone} />
          {updateBanner}
        </>
      );
    }
    if (mode === 'forgot') {
      return (
        <>
          <ForgotPasswordScreen onBackToLogin={() => setMode('login')} />
          {updateBanner}
        </>
      );
    }
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
          onForgotPassword={() => setMode('forgot')}
        />
        {updateBanner}
      </>
    );
  }

  // Show display name: local part of email (before @) for brevity
  const displayName = user?.email ? user.email.split('@')[0] : '';

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Task Logger{displayName ? ` · ${displayName}` : ''}</h1>
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
