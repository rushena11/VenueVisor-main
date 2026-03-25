import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReservationDetailsModal from '../components/ReservationDetailsModal';

const Reservations = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const statusParam = searchParams.get('status') || 'all';
    const [statusFilter, setStatusFilter] = useState(statusParam);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionModal, setActionModal] = useState({ open: false, action: null, reservation: null, reason: '' });

    const formatDatePH = (s) => {
        if (!s) return '';
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            timeZone: 'Asia/Manila'
        }).format(d);
    };

    const formatTime12h = (t) => {
        if (!t) return '';
        const [hStr, mStr] = t.split(':');
        const h = Number(hStr);
        const m = Number(mStr);
        if (Number.isNaN(h)) return t;
        const d = new Date(1970, 0, 1, h || 0, m || 0, 0);
        return new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila'
        }).format(d).replace(' ', '');
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                const res = await axios.get('/api/reservations', { headers });
                setReservations(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        setSearchParams({ status: statusFilter });
    }, [statusFilter, setSearchParams]);

    const addToast = (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(prev => [...prev, { id, message: String(message || ''), type }]);
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const handleStatusUpdate = async (id, status, reason = '', skipConfirm = false) => {
        if (!skipConfirm && !confirm(`Are you sure you want to ${status} this reservation?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/reservations/${id}/status`, { status, reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            const title = reservations.find(r => r.id === id)?.activity_event || `#${id}`;
            addToast(`Reservation ${title} ${status === 'approved' ? 'APPROVED' : 'DENIED'}`, status === 'approved' ? 'success' : 'error');
        } catch (e) {
            console.error(e);
            addToast('Failed to update status', 'error');
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'staff';

    const filtered = reservations
        .filter(r => statusFilter === 'all' ? true : r.status === statusFilter)
        .filter(r => {
            const s = searchTerm.toLowerCase();
            return (
                r.activity_event?.toLowerCase().includes(s) ||
                r.requesting_party?.toLowerCase().includes(s) ||
                r.date_of_use?.includes(s) ||
                String(r.id).includes(s) ||
                String(r.or_number || '').toLowerCase().includes(s)
            );
        });

    const counts = useMemo(() => {
        const list = Array.isArray(reservations) ? reservations : [];
        return {
            all: list.length,
            approved: list.filter(r => r.status === 'approved').length,
            pending: list.filter(r => r.status === 'pending').length,
            rejected: list.filter(r => r.status === 'rejected').length
        };
    }, [reservations]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh] text-gray-600">Loading…</div>;
    }

    return (
        <div>
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[60] w-96 max-w-[calc(100vw-2rem)] space-y-2">
                    {toasts.map(t => {
                        const theme =
                            t.type === 'success' ? 'border-green-500' :
                            t.type === 'error' ? 'border-red-500' :
                            'border-blue-500';
                        const iconColor =
                            t.type === 'success' ? 'text-green-600' :
                            t.type === 'error' ? 'text-red-600' :
                            'text-blue-600';
                        const iconPath =
                            t.type === 'success'
                                ? 'M20 6 9 17l-5-5'
                                : t.type === 'error'
                                    ? 'M6 6l12 12M18 6 6 18'
                                    : 'M12 9v4m0 4h.01';
                        return (
                            <div key={t.id} className={`bg-white border border-gray-200 ${theme} border-l-4 rounded-2xl shadow-sm p-3 flex items-start gap-3`}>
                                <div className={`mt-0.5 ${iconColor}`}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path d={iconPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-sm font-semibold text-gray-900">{t.message}</div>
                                <button
                                    type="button"
                                    onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                    className="text-gray-400 hover:text-gray-600"
                                    aria-label="Close notification"
                                    title="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
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
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Reservations</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="inline-flex rounded-2xl border border-gray-200 bg-white shadow-sm p-1">
                    {[
                        { key: 'all', label: 'All', dot: 'bg-blue-500', count: counts.all },
                        { key: 'approved', label: 'Approved', dot: 'bg-green-500', count: counts.approved },
                        { key: 'pending', label: 'Pending', dot: 'bg-yellow-500', count: counts.pending },
                        { key: 'rejected', label: 'Denied', dot: 'bg-red-500', count: counts.rejected }
                    ].map(t => {
                        const active = statusFilter === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setStatusFilter(t.key)}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${active ? 'bg-white' : t.dot}`} />
                                <span>{t.label}</span>
                                <span className={`ml-1 inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <input
                    type="text"
                    placeholder="Search event, party, date, ID, or OR..."
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OR</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity/Event</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requesting Party</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Use</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inclusive Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filtered.map(res => (
                                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{res.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.or_number || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.activity_event}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.requesting_party}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDatePH(res.date_of_use)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime12h(res.inclusive_time_start)} - {formatTime12h(res.inclusive_time_end)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {res.status === 'pending' ? (
                                            isAdmin ? (
                                                (statusFilter === 'pending' || statusFilter === 'all') ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-1 rounded-full text-xs border border-yellow-200 bg-yellow-50 text-yellow-700">
                                                            Pending
                                                        </span>
                                                        <button
                                                            onClick={() => { setSelectedReservation(res); setIsViewModalOpen(true); }}
                                                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (statusFilter === 'all') {
                                                                    setActionModal({ open: true, action: 'approved', reservation: res });
                                                                } else {
                                                                    handleStatusUpdate(res.id, 'approved');
                                                                }
                                                            }}
                                                            className="px-3 py-1 rounded border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (statusFilter === 'all') {
                                                                    setActionModal({ open: true, action: 'rejected', reservation: res });
                                                                } else {
                                                                    handleStatusUpdate(res.id, 'rejected');
                                                                }
                                                            }}
                                                            className="px-3 py-1 rounded border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                                                        >
                                                            Deny
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedReservation(res); setIsViewModalOpen(true); }}
                                                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded-full text-xs border border-yellow-200 bg-yellow-50 text-yellow-700">
                                                        Pending
                                                    </span>
                                                    <button
                                                        onClick={() => { setSelectedReservation(res); setIsViewModalOpen(true); }}
                                                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            )
                                        ) : res.status === 'approved' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 rounded-full text-xs border border-green-200 bg-green-50 text-green-700">
                                                    Approved
                                                </span>
                                                <button
                                                    onClick={() => { setSelectedReservation(res); setIsViewModalOpen(true); }}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 rounded-full text-xs border border-red-200 bg-red-50 text-red-700">
                                                    Denied
                                                </span>
                                                <button
                                                    onClick={() => { setSelectedReservation(res); setIsViewModalOpen(true); }}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {actionModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {actionModal.action === 'approved' ? 'Approve Request' : 'Deny Request'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            {actionModal.action === 'approved'
                                ? 'Do you want to approve this reservation request?'
                                : 'Do you want to deny this reservation request?'}
                        </p>
                        {actionModal.action === 'rejected' && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason (optional)
                                </label>
                                <textarea
                                    value={actionModal.reason}
                                    onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter a brief reason for denial"
                                />
                            </div>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setActionModal({ open: false, action: null, reservation: null, reason: '' })}
                                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            {actionModal.action === 'approved' ? (
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(actionModal.reservation.id, 'approved', '', true);
                                        setActionModal({ open: false, action: null, reservation: null, reason: '' });
                                    }}
                                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                >
                                    Approve
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(actionModal.reservation.id, 'rejected', actionModal.reason, true);
                                        setActionModal({ open: false, action: null, reservation: null, reason: '' });
                                    }}
                                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                    Deny
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ReservationDetailsModal 
                isOpen={isViewModalOpen} 
                onClose={() => setIsViewModalOpen(false)} 
                reservation={selectedReservation} 
                isAdmin={isAdmin}
                onStatusUpdate={handleStatusUpdate}
                onReservationUpdate={(updated) => {
                    setReservations(prev => prev.map(r => r.id === updated.id ? updated : r));
                    setSelectedReservation(updated);
                }}
                onNotify={(msg, type) => addToast(msg, type)}
            />
        </div>
    );
};

export default Reservations;
