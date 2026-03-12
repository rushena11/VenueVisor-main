import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BugReports = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = { page, per_page: PER_PAGE };
      if (filter !== 'all') params.status = filter;
      const res = await axios.get('/api/bug-reports', { headers, params });
      const payload = res.data;
      const items = Array.isArray(payload) ? payload : (payload?.data || []);
      setReports(items);
      if (!Array.isArray(payload)) {
        setLastPage(payload?.last_page || 1);
        setTotal(payload?.total || items.length);
      } else {
        setLastPage(1);
        setTotal(items.length);
      }
    } catch (e) {
      console.error('Failed to load bug reports', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, page]);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/bug-reports/${id}/status`, { status }, { headers });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const statuses = ['in_progress', 'resolved'];
  const labelMap = {
    in_progress: 'In Progress',
    resolved: 'Completed',
    // fallback labels for legacy statuses if present in data
    new: 'New',
    triaged: 'Triaged',
    closed: 'Closed'
  };
  const label = (s) => labelMap[s] || s;
  const badgeClass = (s) => {
    if (s === 'in_progress') return 'bg-red-50 text-red-700 border-red-200';
    if (s === 'resolved') return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bug Reports</h1>
          <p className="text-gray-500 text-sm">Triage and track issues reported by users.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            {statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button onClick={load} className="px-3 py-1.5 rounded bg-blue-900 text-white text-sm">Refresh</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Time & Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td className="px-6 py-4 text-gray-500" colSpan={8}>Loading…</td></tr>
              ) : reports.length === 0 ? (
                <tr><td className="px-6 py-4 text-gray-500" colSpan={8}>No reports</td></tr>
              ) : (
                reports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-3 text-gray-900 whitespace-nowrap">#{r.id}</td>
                    <td className="px-6 py-3 text-gray-900">{r.name || 'Anonymous'}</td>
                    <td className="px-6 py-3 text-gray-700">{r.email || ''}</td>
                    <td className="px-6 py-3">
                      <div className="font-semibold text-gray-900">{r.title || 'Untitled'}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-700 whitespace-pre-wrap">{r.description}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${badgeClass(r.status)}`}>{label(r.status)}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <select
                        aria-label="Change status"
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50"
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{label(s)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t text-sm flex items-center justify-between">
          <div className="text-gray-600">
            Page {page} of {lastPage} • {total} total
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className={`px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 ${page >= lastPage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BugReports;
