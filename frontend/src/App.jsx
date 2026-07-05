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

  // iOS SafariWebView (PWA) bug: after the soft keyboard opens for form input
  // and then closes, position: fixed elements (the tab-bar) desync from the
  // true viewport on scroll — the bar floats at a stale position. Resetting
  // the scroll position on keyboard dismiss forces a viewport recompute and
  // re-anchors fixed elements. Only triggers on touch devices (iOS).
  useEffect(() => {
    if (!authed) return;
    function onFocusOut(e) {
      if (!e.relatedTarget) {
        // No new target took focus → keyboard dismissed. Defer to let iOS
        // settle, then nudge the viewport to re-anchor fixed elements.
        setTimeout(() => {
          window.scrollTo(window.scrollX, window.scrollY);
        }, 50);
      }
    }
    function onVisualViewportResize() {
      // visualViewport resize fires on keyboard open/close. When the keyboard
      // is dismissed, re-scroll to re-anchor fixed elements.
      if (window.visualViewport && window.visualViewport.height === window.innerHeight) {
        window.scrollTo(window.scrollX, window.scrollY);
      }
    }
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onVisualViewportResize);
    return () => {
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
    };
  }, [authed]);

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
      {/*
        iOS PWA standalone leaves a visible strip below the fixed tab-bar in the
        home-indicator region. On iOS SafariWebView, padding-bottom /
        ::after on the fixed .tab-bar do not paint the bar's background into
        that strip — the .app-shell background shows through. This standalone
        sibling element (its own stacking context, same color as the bar,
        pinned to the true screen bottom) reliably fills it. Pixel-verified.
      */}
      <div className="tab-bar-fill" aria-hidden="true" />
    </div>
  );
}
