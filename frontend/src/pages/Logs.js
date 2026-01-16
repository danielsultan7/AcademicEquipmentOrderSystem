import React, { useState, useEffect } from 'react';
import { logsApi, usersApi } from '../services/api';
import { formatDate } from '../utils';
import { Activity, Filter, AlertTriangle } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAnomaliesOnly, setFilterAnomaliesOnly] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [logsData, usersData] = await Promise.all([
          logsApi.getAll(),
          usersApi.getAll()
        ]);
        setLogs(logsData);
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getUserName = (userId) => {
    return users.find(u => u.id === userId)?.username || 'Unknown';
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterUser && log.userId !== parseInt(filterUser)) return false;
    if (filterAnomaliesOnly && !log.isAnomaly) return false;
    return true;
  });

  // Count anomalies for display
  const anomalyCount = logs.filter(log => log.isAnomaly).length;

  const actions = [...new Set(logs.map(log => log.action))];

  if (loading) {
    return <div className="loading-screen">Loading logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">System Logs</h1>
            <p className="page-subtitle">View system activity and events</p>
          </div>
          <Activity size={32} className="text-slate-400" />
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <Filter size={20} />
          <div className="filter-controls">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="form-select"
              style={{ width: 'auto' }}
            >
              <option value="">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="form-select"
              style={{ width: 'auto' }}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>

            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterAnomaliesOnly}
                onChange={(e) => setFilterAnomaliesOnly(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                Anomalies Only ({anomalyCount})
              </span>
            </label>

            <button
              onClick={() => {
                setFilterAction('');
                setFilterUser('');
                setFilterAnomaliesOnly(false);
              }}
              className="btn btn-ghost"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>Anomaly</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr 
                    key={log.id}
                    style={log.isAnomaly ? {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderLeft: '4px solid var(--color-danger)'
                    } : {}}
                  >
                    <td className="font-semibold">{log.id}</td>
                    <td className="text-slate-600">{getUserName(log.userId)}</td>
                    <td>
                      <span className="badge badge-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="text-slate-600">{log.description}</td>
                    <td>
                      {log.isAnomaly ? (
                        <span className="flex items-center gap-1" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                          <AlertTriangle size={16} />
                          {(log.anomalyScore * 100).toFixed(0)}%
                        </span>
                      ) : log.anomalyScore !== null ? (
                        <span style={{ color: 'var(--color-success)' }}>
                          {(log.anomalyScore * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-slate-600">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-600">
                    No logs found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
