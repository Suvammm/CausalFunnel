import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock3,
  ExternalLink,
  Flame,
  MousePointerClick,
  RefreshCw,
  Route,
  Search,
  Users
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const api = async (path) => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value))
    : 'Never';

const shortId = (value) => `${value.slice(0, 10)}...${value.slice(-4)}`;

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <section className={`stat ${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </section>
  );
}

function SessionsView({ sessions, selectedSession, events, onSelectSession, loading }) {
  return (
    <div className="sessions-layout">
      <section className="panel session-list">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sessions</p>
            <h2>Visitor Streams</h2>
          </div>
          <Users size={22} />
        </div>

        <div className="rows">
          {sessions.map((session) => (
            <button
              className={`session-row ${selectedSession === session.sessionId ? 'active' : ''}`}
              key={session.sessionId}
              onClick={() => onSelectSession(session.sessionId)}
            >
              <div className="session-main">
                <strong>{shortId(session.sessionId)}</strong>
                <span>{formatDate(session.lastSeen)}</span>
              </div>
              <div className="session-metrics">
                <span>{session.eventCount} events</span>
                <span>{session.clickCount} clicks</span>
                <ChevronRight size={18} />
              </div>
            </button>
          ))}

          {!sessions.length && (
            <div className="empty-state">
              <Activity size={30} />
              <p>Open the demo page and click around to create the first session.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel journey">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Journey</p>
            <h2>Ordered Events</h2>
          </div>
          <Route size={22} />
        </div>

        {loading && <p className="muted">Loading events...</p>}

        {!loading && events.length > 0 && (
          <ol className="timeline">
            {events.map((event) => (
              <li key={event._id}>
                <div className={`event-dot ${event.type}`} />
                <div className="event-body">
                  <div className="event-title">
                    <strong>{event.type.replace('_', ' ')}</strong>
                    <span>{formatDate(event.timestamp)}</span>
                  </div>
                  <p>{event.pageUrl}</p>
                  {event.type === 'click' && event.coordinates && (
                    <small>
                      x {Math.round(event.coordinates.x)}, y {Math.round(event.coordinates.y)}
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {!loading && !events.length && (
          <div className="empty-state large">
            <MousePointerClick size={34} />
            <p>Select a session to inspect the visitor journey.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function HeatmapView({ pages, selectedPage, setSelectedPage, heatmap, loading }) {
  const maxDoc = useMemo(() => {
    const width = Math.max(...heatmap.map((event) => event.document?.width || 0), 1440);
    const height = Math.max(...heatmap.map((event) => event.document?.height || 0), 900);
    return { width, height };
  }, [heatmap]);

  return (
    <div className="heatmap-layout">
      <section className="panel heatmap-controls">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Heatmap</p>
            <h2>Page Clicks</h2>
          </div>
          <Flame size={22} />
        </div>

        <label className="select-label" htmlFor="page-url">
          Page URL
        </label>
        <select
          id="page-url"
          value={selectedPage}
          onChange={(event) => setSelectedPage(event.target.value)}
        >
          <option value="">Select a page</option>
          {pages.map((page) => (
            <option key={page.pageUrl} value={page.pageUrl}>
              {page.pageUrl}
            </option>
          ))}
        </select>

        <div className="page-stats">
          <span>{heatmap.length}</span>
          <p>clicks captured for the selected page</p>
        </div>

        <a className="demo-link" href="http://localhost:4000/demo" target="_blank" rel="noreferrer">
          Open demo page <ExternalLink size={16} />
        </a>
      </section>

      <section className="panel heatmap-stage">
        {loading && <p className="muted">Loading heatmap...</p>}
        {!loading && selectedPage && (
          <div className="browser-frame">
            <div className="browser-bar">
              <span />
              <span />
              <span />
              <p>{selectedPage}</p>
            </div>
            <div className="page-canvas">
              <div className="fold-line">First viewport</div>
              {heatmap.map((event) => {
                const left = Math.min(100, Math.max(0, ((event.coordinates?.x || 0) / maxDoc.width) * 100));
                const top = Math.min(100, Math.max(0, ((event.coordinates?.y || 0) / maxDoc.height) * 100));

                return (
                  <span
                    className="heat-dot"
                    key={event._id}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    title={`${Math.round(event.coordinates?.x || 0)}, ${Math.round(event.coordinates?.y || 0)}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {!loading && !selectedPage && (
          <div className="empty-state large">
            <Search size={34} />
            <p>Select a tracked page to visualize click positions.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function App() {
  const [view, setView] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [events, setEvents] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    try {
      setError('');
      const [sessionData, pageData] = await Promise.all([api('/api/sessions'), api('/api/pages')]);
      setSessions(sessionData);
      setPages(pageData);
      if (!selectedSession && sessionData[0]) setSelectedSession(sessionData[0].sessionId);
      if (!selectedPage && pageData[0]) setSelectedPage(pageData[0].pageUrl);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedSession) return;

    setLoadingEvents(true);
    api(`/api/sessions/${encodeURIComponent(selectedSession)}/events`)
      .then(setEvents)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoadingEvents(false));
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedPage) return;

    setLoadingHeatmap(true);
    api(`/api/heatmap?url=${encodeURIComponent(selectedPage)}`)
      .then(setHeatmap)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoadingHeatmap(false));
  }, [selectedPage]);

  const totalEvents = sessions.reduce((sum, session) => sum + session.eventCount, 0);
  const totalClicks = sessions.reduce((sum, session) => sum + session.clickCount, 0);

  return (
    <main className="app-shell">
      <header className="hero">
        <nav className="topbar">
          <div className="brand-mark">CF</div>
          <div>
            <strong>CausalFunnel Analytics</strong>
            <span>Session tracking dashboard</span>
          </div>
        </nav>

        <section className="hero-grid">
          <div className="hero-copy">
            
            <h1>Understand every click, page view, and visitor journey.</h1>
            <p>
              A lightweight tracker captures sessions in MongoDB while this dashboard turns raw
              interaction data into journeys and heatmap-ready coordinates.
            </p>
            <div className="hero-actions">
              <a href="http://localhost:4000/demo" target="_blank" rel="noreferrer">
                Open demo <ExternalLink size={17} />
              </a>
              <button onClick={loadOverview}>
                <RefreshCw size={17} /> Refresh data
              </button>
            </div>
          </div>

          <div className="metric-grid">
            <Stat icon={Users} label="Sessions" value={sessions.length} tone="mint" />
            <Stat icon={BarChart3} label="Events" value={totalEvents} tone="gold" />
            <Stat icon={MousePointerClick} label="Clicks" value={totalClicks} tone="coral" />
            <Stat icon={Clock3} label="Pages" value={pages.length} tone="blue" />
          </div>
        </section>
      </header>

      <section className="workspace">
        {error && <div className="error-banner">{error}</div>}

        <div className="tabs" role="tablist" aria-label="Dashboard views">
          <button className={view === 'sessions' ? 'active' : ''} onClick={() => setView('sessions')}>
            <Users size={17} /> Sessions
          </button>
          <button className={view === 'heatmap' ? 'active' : ''} onClick={() => setView('heatmap')}>
            <Flame size={17} /> Heatmap
          </button>
        </div>

        {view === 'sessions' ? (
          <SessionsView
            sessions={sessions}
            selectedSession={selectedSession}
            events={events}
            onSelectSession={setSelectedSession}
            loading={loadingEvents}
          />
        ) : (
          <HeatmapView
            pages={pages}
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
            heatmap={heatmap}
            loading={loadingHeatmap}
          />
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
