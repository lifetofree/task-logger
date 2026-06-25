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
      const currentYear = new Date().getFullYear();
      // Fetch from birth year to birth year + 80
      const promises = [];
      for (let y = birthYear; y <= birthYear + 80; y++) {
        promises.push(api.heatmap(y));
      }
      const results = await Promise.all(promises);
      const merged = results.flat();
      setHeatmapData(merged);
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
