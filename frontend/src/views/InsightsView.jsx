import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import TrendChart from '../components/TrendChart.jsx';
import RollupCard from '../components/RollupCard.jsx';
import Heatmap from '../components/Heatmap.jsx';

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function InsightsView() {
  const [range, setRange] = useState(30);
  const [period, setPeriod] = useState('week');
  const [daily, setDaily] = useState([]);
  const [rollup, setRollup] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = nDaysAgo(range - 1);
      const to = nDaysAgo(0);
      const [dailyRes, rollupRes, heatmapRes] = await Promise.all([
        api.daily(from, to),
        api.rollup(period),
        api.heatmap(new Date().getFullYear()),
      ]);
      setDaily(dailyRes);
      setRollup(rollupRes);
      setHeatmapData(heatmapRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="view">
      <div className="insights-toolbar">
        {RANGES.map((r) => (
          <button
            key={r.label}
            className={`range-pill ${range === r.days ? 'active' : ''}`}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <>
          <div className="card">
            <h3 className="section-title">Happiness & Progress Trend</h3>
            {daily.length === 0 ? (
              <div className="empty-state">No data in this range yet.</div>
            ) : (
              <TrendChart data={daily} />
            )}
          </div>
          <div className="period-selector">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>
              Week
            </button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>
              Month
            </button>
          </div>
          <RollupCard rollup={rollup} />
          <Heatmap data={heatmapData} year={new Date().getFullYear()} />
        </>
      )}
    </div>
  );
}
