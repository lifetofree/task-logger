import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import MementoMori from '../components/MementoMori.jsx';

export default function InsightsView() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const year = new Date().getFullYear();
      const heatmapRes = await api.heatmap(year);
      setHeatmapData(heatmapRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="view">
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <MementoMori heatmapData={heatmapData} />
      )}
    </div>
  );
}
