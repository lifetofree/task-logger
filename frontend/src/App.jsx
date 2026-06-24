import React, { useEffect, useState } from 'react';
import { getToken, clearToken } from './api/client.js';
import LoginScreen from './auth/LoginScreen.jsx';
import TodayView from './views/TodayView.jsx';
import InsightsView from './views/InsightsView.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '✓' },
  { id: 'insights', label: 'Insights', icon: '◉' },
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  function handleSignOut() {
    clearToken();
    setAuthed(false);
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Task Logger</h1>
        <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
      </header>
      {activeTab === 'today' ? <TodayView /> : <InsightsView />}
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
