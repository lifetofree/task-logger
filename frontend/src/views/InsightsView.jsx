import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import MementoMori from '../components/MementoMori.jsx';

export default function InsightsView({ user }) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const birthday = user?.birthday;

  const load = useCallback(async () => {
    if (!birthday) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const bd = new Date(birthday + 'T00:00:00');
      const birthYear = bd.getFullYear();
      const endYear = birthYear + 80;
      // Fetch each year individually but in batches of 10 to avoid too many parallel requests
      const allData = [];
      for (let start = birthYear; start <= endYear; start += 10) {
        const batch = [];
        for (let y = start; y < start + 10 && y <= endYear; y++) {
          batch.push(api.heatmap(y));
        }
        const results = await Promise.all(batch);
        for (const r of results) {
          allData.push(...r);
        }
      }
      setHeatmapData(allData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [birthday]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="view">
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <MementoMori heatmapData={heatmapData} birthday={birthday} />
      )}
    </div>
  );
}
