import { useState } from 'react';
import { LayoutDashboard, Upload, Users, LogOut } from 'lucide-react';
import Login from './Login';
import Dashboard from './Dashboard';
import { getToken, clearToken } from './api';

export default function App() {
  const [user, setUser] = useState(getToken() ? {} : null);

  if (!user) return <Login onSuccess={setUser} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Customer <span>Analytics</span></div>
        <button className="nav-item active"><LayoutDashboard size={17} /> Dashboard</button>
        <button className="nav-item"><Upload size={17} /> Import Transactions</button>
        <button className="nav-item"><Users size={17} /> Customer Analytics</button>
        <div className="spacer" />
        <button className="nav-item" onClick={() => { clearToken(); setUser(null); }}>
          <LogOut size={17} /> Sign out
        </button>
      </aside>
      <div className="main">
        <div className="topbar">
          <h1>Dashboard</h1>
          <div className="meta">Analysis reference date: 30 June 2026</div>
        </div>
        <Dashboard />
      </div>
    </div>
  );
}