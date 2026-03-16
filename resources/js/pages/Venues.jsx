import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DEFAULT_VENUE_NAMES = [
  'HRDC Hall',
  'AV Studio',
  'Bleacher',
  'Alba Hall',
  'Student Center Mini-Theater',
  'CTE Training Hall',
  'Admin Ballroom 2F',
  'Multi-Purpose Hall 3F',
  'Hum. AV Theater',
  'Dance Studio',
  'CME Gym',
  'Library Grounds',
  'HRDC Quad Stage',
  'ORC Quadrangle/Stage',
];

const normalizeVenueName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const Venues = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState('available');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && (user.role === 'admin' || user.role === 'staff');

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get('/api/venues', { headers });
        setVenues(res.data || []);
      } catch (e) {
        console.error(e);
        setError('Failed to load venues');
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const displayVenues = useMemo(() => {
    const existingByName = new Map();
    (venues || []).forEach(v => {
      const key = normalizeVenueName(v?.name);
      if (key && !existingByName.has(key)) existingByName.set(key, v);
    });

    const merged = DEFAULT_VENUE_NAMES.map(name => {
      const key = normalizeVenueName(name);
      const found = existingByName.get(key);
      if (found) return found;
      return { id: `default:${key}`, name, status: 'available', isVirtual: true };
    });

    const defaultKeys = new Set(DEFAULT_VENUE_NAMES.map(normalizeVenueName));
    (venues || []).forEach(v => {
      const key = normalizeVenueName(v?.name);
      if (!key || defaultKeys.has(key)) return;
      merged.push(v);
    });

    return merged;
  }, [venues]);

  const filtered = displayVenues.filter(v => {
    const q = search.toLowerCase();
    return (
      (v.name || '').toLowerCase().includes(q) ||
      (v.location || '').toLowerCase().includes(q)
    );
  });

  const statuses = [
    { value: 'available', label: 'Available' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'repair', label: 'Under Repair' },
    { value: 'unavailable', label: 'Unavailable' },
  ];

  const statusBadge = (s) => {
    const common = 'px-2.5 py-1 text-xs rounded-full border';
    switch (s) {
      case 'maintenance': return <span className={`${common} bg-blue-50 text-blue-700 border-blue-200`}>Under Maintenance</span>;
      case 'repair': return <span className={`${common} bg-yellow-50 text-yellow-700 border-yellow-200`}>Under Repair</span>;
      case 'unavailable': return <span className={`${common} bg-red-50 text-red-700 border-red-200`}>Unavailable</span>;
      default: return <span className={`${common} bg-green-50 text-green-700 border-green-200`}>Available</span>;
    }
  };

  

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormLocation('');
    setFormStatus('available');
    setIsModalOpen(true);
  };

  const openEdit = (v) => {
    if (v?.isVirtual) {
      setEditing(null);
    } else {
      setEditing(v);
    }
    setFormName(v.name || '');
    setFormLocation(v.location || '');
    setFormStatus(v.status || 'available');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveVenue = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } : undefined;
    const base = { name: formName.trim(), status: formStatus };
    const payload = editing ? base : { ...base, location: formLocation.trim() };
    if (!payload.name) {
      alert('Name is required');
      return;
    }
    try {
      if (editing && editing.id) {
        await axios.put(`/api/venues/${editing.id}`, payload, { headers });
        setVenues(vs => vs.map(v => v.id === editing.id ? { ...v, ...payload } : v));
      } else {
        const res = await axios.post('/api/venues', payload, { headers });
        const created = res?.data || { id: Math.random().toString(36).slice(2), ...payload };
        setVenues(vs => [created, ...vs]);
      }
      setIsModalOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save venue';
      alert(msg);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-600">Loading…</div>;
  }

  if (error) {
    return (
      <div>
        <div className="mb-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
        </div>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search name or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          />
          {isAdmin && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm hover:bg-blue-800"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c.552 0 1 .448 1 1v5h5c.552 0 1 .448 1 1s-.448 1-1 1h-5v5c0 .552-.448 1-1 1s-1-.448-1-1v-5H6c-.552 0-1-.448-1-1s.448-1 1-1h5V6c0-.552.448-1 1-1z"/></svg>
              Add
            </button>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-gray-800">Venues</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name of Venues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {statusBadge(v.status)}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => openEdit(v)}
                        className="px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="px-6 py-8 text-center text-sm text-gray-500">No venues found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">{editing ? 'Edit Venue' : 'Add Venue'}</div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Name</div>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              {!editing && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Location (optional)</div>
                  <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="mt-2">{statusBadge(formStatus)}</div>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={saveVenue} className="px-3 py-1.5 rounded bg-blue-900 text-white hover:bg-blue-800 text-sm">{editing ? 'Save Changes' : 'Add Venue'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Venues;
