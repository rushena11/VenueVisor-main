import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
const BookingFormModal = React.lazy(() => import('../components/BookingFormModal'));
import FaqsModal from '../components/FaqsModal';
import UserManualModal from '../components/UserManualModal';
import BugReportModal from '../components/BugReportModal';
const ReservationDetailsModal = React.lazy(() => import('../components/ReservationDetailsModal'));

const PublicDashboard = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [venues, setVenues] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedVenueForBooking, setSelectedVenueForBooking] = useState(null);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isOpeningLogin, setIsOpeningLogin] = useState(false);
    const [toasts, setToasts] = useState([]);
    const statusMapRef = useRef(new Map());
    const pollingRef = useRef(null);
    const [isFaqsModalOpen, setIsFaqsModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isBugModalOpen, setIsBugModalOpen] = useState(false);
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
    const [isReservationDetailsOpen, setIsReservationDetailsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedReservationForDetails, setSelectedReservationForDetails] = useState(null);
    const [bookingDate, setBookingDate] = useState(null);
    const [reservationToEdit, setReservationToEdit] = useState(null);
    const [unreadApprovedCount, setUnreadApprovedCount] = useState(0);
    const unreadApprovedIdsRef = useRef(new Set());
    const dateOnly = (v) => {
        if (!v) return '';
        try {
            if (typeof v === 'string') {
                const t = v.split('T')[0];
                return t || v;
            }
            const d = new Date(v);
            return d.toLocaleDateString('en-CA');
        } catch { return typeof v === 'string' ? v : ''; }
    };
    const normalizeReservations = (arr) => Array.isArray(arr) ? arr.map(r => ({ ...r, date_of_use: dateOnly(r?.date_of_use) })) : [];

    const storageKey = (userId, name) => `vv:${name}:${userId}`;
    const safeJsonParse = (value, fallback) => {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'undefined' || parsed === null ? fallback : parsed;
        } catch {
            return fallback;
        }
    };
    const getUserId = (u) => (u && typeof u.id !== 'undefined' && u.id !== null) ? String(u.id) : null;
    const loadUnreadApprovedIds = (userId) => {
        if (!userId) return new Set();
        const raw = localStorage.getItem(storageKey(userId, 'unreadApprovedIds'));
        const ids = safeJsonParse(raw, []);
        return new Set(Array.isArray(ids) ? ids : []);
    };
    const persistUnreadApprovedIds = (userId) => {
        if (!userId) return;
        localStorage.setItem(
            storageKey(userId, 'unreadApprovedIds'),
            JSON.stringify(Array.from(unreadApprovedIdsRef.current || []))
        );
    };
    const loadStatusByIdMap = (userId) => {
        if (!userId) return new Map();
        const raw = localStorage.getItem(storageKey(userId, 'reservationStatusById'));
        const obj = safeJsonParse(raw, {});
        const map = new Map();
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.entries(obj).forEach(([id, status]) => {
                if (!id) return;
                map.set(Number(id), (status || '').toLowerCase());
            });
        }
        return map;
    };
    const persistStatusByIdMap = (userId) => {
        if (!userId) return;
        const obj = {};
        statusMapRef.current.forEach((status, id) => {
            obj[String(id)] = (status || '').toLowerCase();
        });
        localStorage.setItem(storageKey(userId, 'reservationStatusById'), JSON.stringify(obj));
    };
    const hydrateNotificationState = (activeUser) => {
        const uid = getUserId(activeUser);
        if (!uid) return;
        unreadApprovedIdsRef.current = loadUnreadApprovedIds(uid);
        setUnreadApprovedCount(unreadApprovedIdsRef.current.size);
        statusMapRef.current = loadStatusByIdMap(uid);
    };
    const clearNotificationState = (activeUser) => {
        const uid = getUserId(activeUser);
        if (!uid) return;
        try {
            localStorage.removeItem(storageKey(uid, 'unreadApprovedIds'));
            localStorage.removeItem(storageKey(uid, 'reservationStatusById'));
        } catch {}
    };
    const reservationBelongsToUser = (r, activeUser) => {
        const uid = getUserId(activeUser);
        if (!uid) return true;
        if (typeof r?.user_id !== 'undefined' && r.user_id !== null) return String(r.user_id) === uid;
        if (typeof r?.user?.id !== 'undefined' && r.user?.id !== null) return String(r.user.id) === uid;
        return true;
    };
    const applyReservationUpdates = (latest, activeUser) => {
        const uid = getUserId(activeUser);
        const shouldTrackUnread = !!uid && activeUser?.role === 'requester';
        const prevMap = statusMapRef.current;
        latest.forEach(r => {
            const prev = prevMap.get(r.id);
            const nextStatus = (r?.status || '').toLowerCase();
            const changed = prev && prev !== nextStatus;
            if (changed) {
                const isMine = reservationBelongsToUser(r, activeUser);
                if (
                    shouldTrackUnread &&
                    isMine &&
                    !isRequestsModalOpen &&
                    nextStatus === 'approved' &&
                    prev !== 'approved' &&
                    !unreadApprovedIdsRef.current.has(r.id)
                ) {
                    unreadApprovedIdsRef.current.add(r.id);
                    setUnreadApprovedCount(c => c + 1);
                    persistUnreadApprovedIds(uid);
                }
                const type = nextStatus === 'approved' ? 'success' : nextStatus === 'rejected' ? 'error' : 'info';
                const venue = Object.keys(venueNames).find(k => r[k]);
                const venueLabel = venue ? venueNames[venue] : 'Venue';
                const message = `Request ${r.activity_event || ''} on ${r.date_of_use} at ${venueLabel} ${nextStatus.toUpperCase()}`;
                setToasts(t => [...t, { id: `${r.id}-${Date.now()}`, message, type }]);
            }
            prevMap.set(r.id, nextStatus);
        });
        if (uid) {
            persistStatusByIdMap(uid);
        }
        setReservations(latest);
    };
    const upsertReservationInCaches = (reservation, activeUser) => {
        if (!reservation?.id) return;
        statusMapRef.current.set(reservation.id, (reservation?.status || '').toLowerCase());
        const uid = getUserId(activeUser);
        if (uid) {
            persistStatusByIdMap(uid);
        }
    };
    const removeReservationFromCaches = (reservationId, activeUser) => {
        if (!reservationId) return;
        statusMapRef.current.delete(reservationId);
        if (unreadApprovedIdsRef.current.has(reservationId)) {
            unreadApprovedIdsRef.current.delete(reservationId);
            setUnreadApprovedCount(unreadApprovedIdsRef.current.size);
        }
        const uid = getUserId(activeUser);
        if (uid) {
            persistStatusByIdMap(uid);
            persistUnreadApprovedIds(uid);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const currentToken = localStorage.getItem('token');
        const userBeforeLogout = user;
        try {
            if (currentToken) {
                await axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${currentToken}` }, timeout: 3000 });
            }
        } catch {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearNotificationState(userBeforeLogout);
        setUser(null);
        setToken(null);
        setIsRequestsModalOpen(false);
        setIsReservationDetailsOpen(false);
        setSelectedReservationForDetails(null);
        setSelectedDay(null);
        setUnreadApprovedCount(0);
        unreadApprovedIdsRef.current = new Set();
        fetchData(null, null);
        setIsLoggingOut(false);
    };

    // Modal Handlers
    const openLogin = () => {
        setIsOpeningLogin(true);
        setIsSignupModalOpen(false);
        setIsLoginModalOpen(true);
        setTimeout(() => setIsOpeningLogin(false), 300);
    };

    const openSignup = () => {
        setIsLoginModalOpen(false);
        setIsSignupModalOpen(true);
    };

    const closeModals = () => {
        setIsLoginModalOpen(false);
        setIsSignupModalOpen(false);
        setIsBookingModalOpen(false);
        setBookingDate(null);
        setReservationToEdit(null);
    };

    const handleVenueClick = (key) => {
        if (!token) {
            openLogin();
            return;
        }
        setSelectedVenueForBooking(key);
        setBookingDate(selectedDay);
        setReservationToEdit(null);
        setIsBookingModalOpen(true);
    };

    const formatTime12h = (t) => {
        if (!t) return '';
        const [h, m] = (t + '').split(':').map(Number);
        const dateTmp = new Date();
        dateTmp.setHours(h || 0, m || 0);
        const hours = dateTmp.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hh = hours % 12 || 12;
        const mm = (m ?? 0).toString().padStart(2, '0');
        return `${hh}:${mm}${ampm}`;
    };

    const openRequests = () => {
        if (!token) {
            openLogin();
            return;
        }
        unreadApprovedIdsRef.current = new Set();
        setUnreadApprovedCount(0);
        const uid = getUserId(user);
        if (uid) {
            try { localStorage.removeItem(storageKey(uid, 'unreadApprovedIds')); } catch {}
            persistStatusByIdMap(uid);
        }
        setIsRequestsModalOpen(true);
    };

    const openReservationDetails = (reservation) => {
        setSelectedReservationForDetails(reservation);
        setIsReservationDetailsOpen(true);
    };

    // Venue Name Mapping
    // Order matters for display
    const venueNames = {
        'hrdc_hall': 'HRDC Hall',
        'av_studio': 'AV Studio',
        'bleacher': 'Bleacher',
        'alba_hall': 'Alba Hall',
        'student_center_mini_theater': 'Student Center Mini-Theater',
        'cte_training_hall_2_or_3': 'CTE Training Hall',
        'admin_building_2nd_floor': 'Admin Ballroom 2F',
        'multi_purpose_hall_3f': 'Multi-Purpose Hall 3F',
        'hum_av_theater': 'Hum. AV Theater',
        'dance_studio_hall_3f': 'Dance Studio',
        'cme_gym': 'CME Gym',
        'classroom_specify': 'Classroom',
        'laboratory_room_specify': 'Laboratory Room',
        'library_grounds': 'Library Grounds',
        'hrdc_quadrangle_stage': 'ORC Quadrangle/Stage',
        'others_venue_specify': 'Others'
    };

    const venueKeys = Object.keys(venueNames);
    const inferVenueKey = (r) => venueKeys.find(k => !!r?.[k]) || null;

    const fetchData = async (tokenOverride, userOverride) => {
        setLoading(true);
        try {
            const activeToken = typeof tokenOverride !== 'undefined' ? tokenOverride : token;
            const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined;
            const reservationsEndpoint = activeToken ? '/api/reservations' : '/api/public/reservations';
            const [venuesRes, resRes] = await Promise.all([
                axios.get('/api/venues').catch(() => ({ data: [] })),
                axios.get(reservationsEndpoint, { headers }).catch(() => ({ data: [] }))
            ]);

            setVenues(venuesRes.data);
            const latest = normalizeReservations(resRes.data);
            if (activeToken) {
                applyReservationUpdates(latest, userOverride || user);
            } else {
                setReservations(latest);
            }
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    // Check for logged in user
    useEffect(() => {
        let parsedUser = null;
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) parsedUser = JSON.parse(storedUser);
        } catch {}
        if (parsedUser) {
            setUser(parsedUser);
            hydrateNotificationState(parsedUser);
        }
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
        fetchData(storedToken, parsedUser);
    }, []);

    // Realtime venue status via Server-Sent Events (instant, no polling on client)
    useEffect(() => {
        let es;
        try {
            es = new EventSource('/api/venues/stream');
            const handler = (evt) => {
                try {
                    const payload = JSON.parse(evt.data || '{}');
                    if (Array.isArray(payload?.venues)) {
                        setVenues(payload.venues);
                    }
                } catch {}
            };
            es.addEventListener('venues', handler);
        } catch {}
        return () => {
            try { if (es) es.close(); } catch {}
        };
    }, []);

    const tokenize = (s) => (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const containsAll = (small, big) => small.every(t => big.includes(t));
    const getVenueStatusForLabel = (label) => {
        const lt = tokenize(label);
        // Try exact and inclusive normalized string matching first
        const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const n = norm(label);
        let candidate = venues.find(x => {
            const xn = norm(x?.name);
            return xn && (xn === n || xn.includes(n) || n.includes(xn));
        });
        if (candidate) return candidate.status || 'available';
        // Token-based fallback to handle variations like "HRDC Multipurpose Hall" vs "HRDC Hall"
        for (const v of venues) {
            const xt = tokenize(v?.name);
            if (containsAll(lt, xt) || containsAll(xt, lt)) {
                return v.status || 'available';
            }
            // Special handling for HRDC Hall-like names
            if (lt.includes('hrdc') && lt.includes('hall') && xt.includes('hrdc') && xt.includes('hall')) {
                return v.status || 'available';
            }
        }
        return 'available';
    };

    const nonAvailableVenues = venues.filter(v => v.status && v.status !== 'available');

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const generateCalendarDays = () => {
        const year = selectedYear;
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const dateKey = (d) => d ? d.toLocaleDateString('en-CA') : '';

    const getBookedVenuesForDate = (date) => {
        if (!date) return new Set();
        const dateStr = dateKey(date);
        
        const dayReservations = reservations.filter(
            r => r.date_of_use === dateStr && (r.status === 'approved' || r.status === 'pending')
        );
        
        const bookedVenues = new Set();
        dayReservations.forEach(r => {
            venueKeys.forEach(key => {
                if (r[key]) bookedVenues.add(key);
            });
        });
        return bookedVenues;
    };

    const getAvailability = (date) => {
        if (!date) return { total: 0, available: 0, events: [] };
        
        const bookedVenuesForDay = getBookedVenuesForDate(date);
        const totalVenues = venueKeys.length; 
        const available = totalVenues - bookedVenuesForDay.size;

        // Events tags (count of reservations)
        const dateStr = dateKey(date);
        
        const dayReservations = reservations.filter(
            r => r.date_of_use === dateStr
        );

        const events = dayReservations.map(r => ({
            id: r.id,
            name: r.activity_event,
            type: 'Event' 
        }));

        return {
            total: totalVenues,
            available: available,
            events: events
        };
    };

    const getVenueStatusCountsForDate = (date) => {
        if (!date) return { approved: 0, pending: 0, rejected: 0, available: venueKeys.length, total: venueKeys.length };
        const dateStr = dateKey(date);
        const dayReservations = reservations.filter(r => r.date_of_use === dateStr);
        const statusByVenue = new Map();
        dayReservations.forEach(r => {
            venueKeys.forEach(key => {
                if (r[key]) {
                    const prev = statusByVenue.get(key);
                    if (r.status === 'approved') {
                        statusByVenue.set(key, 'approved');
                    } else if (r.status === 'pending') {
                        if (prev !== 'approved') statusByVenue.set(key, 'pending');
                    } else if (r.status === 'rejected') {
                        if (prev !== 'approved' && prev !== 'pending') statusByVenue.set(key, 'rejected');
                    }
                }
            });
        });
        let approved = 0, pending = 0, rejected = 0;
        venueKeys.forEach(key => {
            const v = statusByVenue.get(key);
            if (v === 'approved') approved++;
            else if (v === 'pending') pending++;
            else if (v === 'rejected') rejected++;
        });
        const total = venueKeys.length;
        const available = total - (approved + pending + rejected);
        return { approved, pending, rejected, available, total };
    };

    const handleMonthClick = (index) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(index);
        setCurrentDate(newDate);
    };

    const handleDayClick = (date) => {
        if (date) {
            setSelectedDay(date);
        }
    };

    useEffect(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const poll = async () => {
            try {
                const res = await axios.get('/api/reservations', { headers }).catch(() => ({ data: [] }));
                const latest = normalizeReservations(res.data);
                applyReservationUpdates(latest, user);
            } catch {}
        };
        pollingRef.current = setInterval(poll, 15000);
        poll();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [token, user, isRequestsModalOpen]);

    const removeToast = (id) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    };
    const addToast = (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(ts => [...ts, { id, message, type }]);
        setTimeout(() => {
            setToasts(ts => ts.filter(t => t.id !== id));
        }, 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[1000] space-y-2">
                    {toasts.map(t => (
                        <div key={t.id} className="flex items-center w-full max-w-sm p-4 text-body bg-neutral-primary-soft rounded-base shadow-xs border border-default" role="alert">
                            <div className={`inline-flex items-center justify-center shrink-0 w-7 h-7 rounded ${t.type === 'success' ? 'text-fg-success bg-success-soft' : t.type === 'error' ? 'text-fg-danger bg-danger-soft' : 'text-fg-warning bg-warning-soft'}`}>
                                {t.type === 'success' ? (
                                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11.917 9.724 16.5 19 7.5" />
                                    </svg>
                                ) : t.type === 'error' ? (
                                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                )}
                                <span className="sr-only">{t.type === 'success' ? 'Check icon' : t.type === 'error' ? 'Error icon' : 'Warning icon'}</span>
                            </div>
                            <div className="ms-3 ml-3 text-sm font-normal">{t.message}</div>
                            <button
                                type="button"
                                className="ms-auto ml-auto flex items-center justify-center text-body hover:text-heading bg-transparent box-border border border-transparent hover:bg-neutral-secondary-medium focus:ring-4 focus:ring-neutral-tertiary font-medium leading-5 rounded text-sm h-8 w-8 focus:outline-none"
                                aria-label="Close"
                                onClick={() => removeToast(t.id)}
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <React.Suspense fallback={<div className="fixed inset-0 z-40 flex items-center justify-center"><div className="loader"><span></span><span></span><span></span><span></span><span></span><span></span></div></div>}>
            <ReservationDetailsModal
                isOpen={isReservationDetailsOpen}
                onClose={() => setIsReservationDetailsOpen(false)}
                reservation={selectedReservationForDetails}
                isAdmin={false}
                onStatusUpdate={() => {}}
                onReservationUpdate={(updated) => {
                    if (!updated?.id) return;
                    setReservations(prev => prev.map(r => {
                        if (r?.id !== updated.id) return r;
                        const merged = { ...r, ...updated };
                        upsertReservationInCaches(merged, user);
                        return merged;
                    }));
                }}
                onEdit={(r) => {
                    setIsReservationDetailsOpen(false);
                    setIsRequestsModalOpen(false);
                    const k = inferVenueKey(r);
                    setSelectedVenueForBooking(k);
                    setBookingDate(r?.date_of_use || null);
                    setReservationToEdit(r);
                    setIsBookingModalOpen(true);
                }}
                onDeleted={(id) => {
                    removeReservationFromCaches(id, user);
                    setReservations(prev => prev.filter(r => r?.id !== id));
                    setSelectedReservationForDetails(null);
                    setIsReservationDetailsOpen(false);
                    addToast('Request cancelled', 'success');
                }}
                onNotify={(msg, type) => addToast(msg, type)}
            />
            </React.Suspense>
            {isRequestsModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsRequestsModalOpen(false)}
                    ></div>
                    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900">Requests</h3>
                                {unreadApprovedCount > 0 && (
                                    <div className="relative">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
                                        </svg>
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadApprovedCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {reservations.length === 0 ? (
                                <div className="text-sm text-gray-600">No requests found.</div>
                            ) : (
                                <div className="space-y-3">
                                    {[...reservations]
                                        .sort((a, b) => (b?.date_of_use || '').localeCompare(a?.date_of_use || ''))
                                        .map((r) => {
                                            const venueLabels = venueKeys.filter(k => r?.[k]).map(k => venueNames[k]);
                                            const venueText = venueLabels.length > 0 ? venueLabels.join(', ') : '—';
                                            const dateText = r?.date_of_use || '—';
                                            const timeText = r?.inclusive_time_start && r?.inclusive_time_end
                                                ? `${formatTime12h(r.inclusive_time_start)} - ${formatTime12h(r.inclusive_time_end)}`
                                                : 'Whole day';
                                            const status = (r?.status || '').toLowerCase();
                                            const badgeClass =
                                                status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                                status === 'rejected' ? 'bg-red-50 text-red-800 border-red-200' :
                                                'bg-gray-50 text-gray-800 border-gray-200';
                                            const badgeText =
                                                status === 'approved' ? 'APPROVED' :
                                                status === 'pending' ? 'PENDING' :
                                                status === 'rejected' ? 'REJECTED' :
                                                (r?.status || 'UNKNOWN');

                                            return (
                                                <button
                                                    key={r?.id || `${r?.date_of_use}-${r?.activity_event}`}
                                                    type="button"
                                                    onClick={() => openReservationDetails(r)}
                                                    className="w-full text-left border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-gray-900 truncate">
                                                                {r?.activity_event || 'Request'}
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-600">
                                                                {dateText} • {timeText}
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-600 truncate">
                                                                {venueText}
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${badgeClass}`}>
                                                            {badgeText}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsRequestsModalOpen(false)}
                                className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Top Header */}
            <header className="bg-blue-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src="/assets/LNULogo.png"
                            alt="LNU Logo"
                            className="h-10 sm:h-12 w-auto shrink-0"
                        />
                        <div className="flex flex-col">
                            <span className="text-lg sm:text-xl font-bold leading-none truncate">VenueVisor</span>
                            <span className="hidden sm:inline text-xs font-semibold text-yellow-500 tracking-wider">LNU BLUEBOOK</span>
                        </div>
                    </div>

                    {/* Centered Navigation */}
                    <div className="flex-1 flex justify-center">
                        <nav className="hidden md:flex space-x-6 text-sm text-blue-100">
                            <button onClick={() => setIsFaqsModalOpen(true)} className="hover:text-white">
                                FAQs
                            </button>
                            <button onClick={() => setIsManualModalOpen(true)} className="hover:text-white flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                User Manual
                            </button>
                            <button onClick={() => setIsBugModalOpen(true)} className="hover:text-white flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                See a bug? Report
                            </button>
                        </nav>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 justify-end shrink-0">
                        <div className="flex items-center gap-3">
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <span className="hidden sm:inline text-sm font-medium text-white">Hello, {user.name}</span>
                                    <button 
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-1.5 px-3 sm:px-4 rounded flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={openLogin}
                                    disabled={isOpeningLogin || isLoginModalOpen}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-1.5 px-3 sm:px-4 rounded flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                    <span className="hidden sm:inline">{isOpeningLogin ? 'Opening...' : 'Login'}</span>
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(v => !v)}
                            className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-blue-800 transition-colors"
                            aria-label="Open menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                            </svg>
                        </button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-blue-800">
                        <div className="max-w-7xl mx-auto px-4 py-3 space-y-1 text-sm text-blue-100">
                            <button
                                type="button"
                                onClick={() => { setIsFaqsModalOpen(true); setIsMobileMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 rounded hover:bg-blue-800 hover:text-white transition-colors"
                            >
                                FAQs
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsManualModalOpen(true); setIsMobileMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 rounded hover:bg-blue-800 hover:text-white transition-colors"
                            >
                                User Manual
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsBugModalOpen(true); setIsMobileMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 rounded hover:bg-blue-800 hover:text-white transition-colors"
                            >
                                See a bug? Report
                            </button>
                            <div className="pt-2">
                                {user ? (
                                    <button
                                        type="button"
                                        onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                                        disabled={isLoggingOut}
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsMobileMenuOpen(false); openLogin(); }}
                                        disabled={isOpeningLogin || isLoginModalOpen}
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                        {isOpeningLogin ? 'Opening...' : 'Login'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Month Navigation */}
            <div className="bg-blue-900 text-blue-200 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 sm:py-0">
                    {/* Year Selector */}
                    <div className="flex-shrink-0 sm:border-r border-blue-700 sm:pr-4">
                         <select 
                            className="bg-blue-800 border border-blue-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none hover:bg-blue-700 transition-colors cursor-pointer font-bold"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                            <option value={2028}>2028</option>
                            <option value={2029}>2029</option>
                            <option value={2030}>2030</option>
                        </select>
                    </div>

                    <div className="w-full sm:flex-1 flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
                        {months.map((month, index) => (
                            <button
                                key={month}
                                onClick={() => handleMonthClick(index)}
                                className={`px-4 py-2 rounded flex text-sm font-medium transition-colors whitespace-nowrap
                                    ${currentDate.getMonth() === index 
                                        ? 'bg-yellow-500 text-blue-900' 
                                        : 'hover:bg-blue-800 hover:text-white'}`}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Facility Dashboard</h1>
                    <p className="text-orange-400 text-sm font-medium mt-1">
                        Manage bookings for {selectedYear} • <span className="text-orange-400">16 Venues Active</span>
                    </p>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-lg shadow ring-1 ring-gray-200 overflow-hidden">
                    <div className="flex items-center justify-end px-4 py-3 border-b border-gray-200 bg-white">
                        <button
                            onClick={openRequests}
                            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-8h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H9L7 6v12a2 2 0 002 2z" />
                            </svg>
                            View Requests
                            {unreadApprovedCount > 0 && (
                                <span className="relative ml-1">
                                    <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
                                    </svg>
                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-400 text-blue-900 text-[10px] font-bold flex items-center justify-center">
                                        {unreadApprovedCount}
                                    </span>
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[720px]">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {daysOfWeek.map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wide uppercase">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                                {generateCalendarDays().map((date, index) => {
                                    const { total, available: _unusedAvailable } = getAvailability(date);
                                    const isToday = date && new Date().toDateString() === date.toDateString();
                                    const { approved, pending, rejected } = getVenueStatusCountsForDate(date);
                                    const approvedPct = total > 0 ? (approved / total) * 100 : 0;
                                    const availableDisplay = total - approved;
                                    let pendingRequestsCount = 0;
                                    if (date) {
                                        const dateStr = dateKey(date);
                                        pendingRequestsCount = reservations.filter(
                                            r => r.date_of_use === dateStr && r.status === 'pending'
                                        ).length;
                                    }
                                    
                                    return (
                                        <div 
                                            key={index} 
                                            onClick={() => date && handleDayClick(date)}
                                            className={`min-h-[96px] sm:min-h-[120px] bg-white p-1.5 sm:p-2 relative group hover:bg-gray-50 transition-colors ${!date ? 'bg-gray-50 cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {date && (
                                                <>
                                                    <div className="flex flex-col items-start">
                                                        <span className={`text-sm font-medium ${isToday ? 'bg-blue-900 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-black-900'}`}>
                                                            {date.getDate()}
                                                        </span>
                                                        <div className="mt-3 sm:mt-5">
                                                            <div className="text-[11px] text-gray-500 leading-tight">Availability</div>
                                                            <div className={`text-xs font-bold ${availableDisplay === 0 ? 'text-red-900' : 'text-gray-700'}`}>
                                                                {availableDisplay}/{total}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Occupancy Bar: approved only */}
                                                    <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3 mb-1">
                                                        <div 
                                                            className="h-1.5 rounded-full bg-indigo-400"
                                                            style={{ width: `${approvedPct}%` }}
                                                        ></div>
                                                    </div>

                                                    {/* Pending badges */}
                                                    {pendingRequestsCount > 0 && (
                                                        <div className="mt-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                                {pendingRequestsCount}Semi
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Daily Schedule Sidebar */}
            {selectedDay && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
                        onClick={() => setSelectedDay(null)}
                    ></div>

                    {/* Sidebar */}
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Daily Schedule</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <div className="mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Status viewing as: <span className="text-black font-bold">{user ? 'USER' : 'GUEST'}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {venueKeys.map(key => {
                                const bookedVenues = getBookedVenuesForDate(selectedDay);
                                const isAvailable = !bookedVenues.has(key);
                                const dateStr = dateKey(selectedDay);
                                const venueReservations = reservations.filter(r => r.date_of_use === dateStr && r[key]);
                                const approvedCount = venueReservations.filter(r => r.status === 'approved').length;
                                const SLOT_CAPACITY = 7;
                                const label = venueNames[key];
                                const adminStatus = getVenueStatusForLabel(label);
                                const adminUnavailable = adminStatus && adminStatus !== 'available';
                                const open = adminUnavailable ? 0 : Math.max(SLOT_CAPACITY - approvedCount, 0);
                                const statusLabel = adminUnavailable
                                    ? (adminStatus === 'maintenance' ? 'Under Maintenance' : adminStatus === 'repair' ? 'Under Repair' : 'Unavailable')
                                    : (open === 0 ? 'Unavailable' : (approvedCount > 0 ? 'Semi-booked' : 'Available'));
                                const statusStyle = adminUnavailable
                                    ? (adminStatus === 'maintenance'
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                        : adminStatus === 'repair'
                                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                            : 'bg-red-100 text-red-800 border-red-200')
                                    : (open === 0 
                                        ? 'bg-gray-100 text-gray-800 border-gray-200' 
                                        : (approvedCount > 0 ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-green-100 text-green-800 border-green-200'));
                                
                                return (
                                    <div 
                                        key={key} 
                                        onClick={() => { if (!adminUnavailable) handleVenueClick(key); }}
                                        className={`border rounded-lg p-4 bg-white shadow-sm 
                                            ${adminUnavailable ? 'border-red-200 opacity-80' : (open === 0 ? 'border-gray-200' : (approvedCount > 0 ? 'border-indigo-200' : 'border-green-200'))}
                                            ${adminUnavailable ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-blue-300'} transition-all ring-offset-2
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-black-900">
                                                {label}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">7 fixed slots per day</p>

                                        {venueReservations.length === 0 ? (
                                            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                Ready for reservation
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {approvedCount > 0 && open > 0 && (
                                                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                        </svg>
                                                        {open} of {SLOT_CAPACITY} slots still open
                                                    </div>
                                                )}
                                                {venueReservations.map(r => (
                                                    <div key={r.id} className="rounded border border-gray-200 p-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">{r.activity_event || 'Event'}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                                                r.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                                r.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                                                'bg-red-50 text-red-800 border-red-200'
                                                            }`}>
                                                                {r.status === 'approved' ? 'APPROVED' : r.status === 'pending' ? 'REQUESTED' : 'REJECTED'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-0.5">
                                                            {r.inclusive_time_start && r.inclusive_time_end ? (
                                                                <>
                                                                    {(() => {
                                                                        const fmt = (t) => {
                                                                            const [h, m] = t.split(':').map(Number);
                                                                            const dt = new Date();
                                                                            dt.setHours(h || 0, m || 0);
                                                                            const hh = dt.getHours() % 12 || 12;
                                                                            const mm = (m ?? 0).toString().padStart(2, '0');
                                                                            const ap = dt.getHours() >= 12 ? 'PM' : 'AM';
                                                                            return `${hh}:${mm}${ap}`;
                                                                        };
                                                                        return `${fmt(r.inclusive_time_start)} - ${fmt(r.inclusive_time_end)}`;
                                                                    })()}
                                                                </>
                                                            ) : 'Whole day'} 
                                                            {r.requesting_party ? ` • ${r.requesting_party}` : ''} 
                                                            {typeof r.pax_count !== 'undefined' && r.pax_count !== '' ? ` • ~ ${r.pax_count} pax` : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <button 
                                onClick={() => setSelectedDay(null)}
                                className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition-colors"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </>
            )}

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={closeModals} 
                onSwitchToSignup={openSignup}
                onLoggedIn={(loggedInUser, newToken) => {
                    setUser(loggedInUser || null);
                    setToken(newToken || localStorage.getItem('token'));
                    setIsLoginModalOpen(false);
                    setIsSignupModalOpen(false);
                    hydrateNotificationState(loggedInUser || null);
                    fetchData(newToken || localStorage.getItem('token'), loggedInUser || null);
                }}
            />
            
            <SignupModal 
                isOpen={isSignupModalOpen} 
                onClose={closeModals} 
                onSwitchToLogin={openLogin} 
            />

            <React.Suspense fallback={<div className="fixed inset-0 z-40 flex items-center justify-center"><div className="loader"><span></span><span></span><span></span><span></span><span></span><span></span></div></div>}>
            <BookingFormModal 
                isOpen={isBookingModalOpen} 
                onClose={closeModals} 
                venueName={selectedVenueForBooking ? venueNames[selectedVenueForBooking] : ''}
                venueKey={selectedVenueForBooking}
                selectedDate={bookingDate} 
                reservationToEdit={reservationToEdit}
                onNotify={(msg, type) => addToast(msg, type)}
                onSubmitted={(res) => {
                    const normalized = res ? { ...res, date_of_use: dateOnly(res.date_of_use) } : res;
                    if (normalized) {
                        setReservations(prev => {
                            if (normalized.id && prev.some(r => r?.id === normalized.id)) {
                                return prev.map(r => {
                                    if (r?.id !== normalized.id) return r;
                                    const merged = { ...r, ...normalized };
                                    upsertReservationInCaches(merged, user);
                                    return merged;
                                });
                            }
                            upsertReservationInCaches(normalized, user);
                            return [...prev, normalized];
                        });
                    }
                    addToast(reservationToEdit?.id ? 'Request updated' : 'Request submitted', 'success');
                    setReservationToEdit(null);
                    setBookingDate(null);
                    setIsBookingModalOpen(false);
                }}
            />
            </React.Suspense>
            <FaqsModal 
                isOpen={isFaqsModalOpen}
                onClose={() => setIsFaqsModalOpen(false)}
            />
            <UserManualModal 
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
            />
            <BugReportModal
                isOpen={isBugModalOpen}
                onClose={() => setIsBugModalOpen(false)}
            />
        </div>
    );
};

export default PublicDashboard;
